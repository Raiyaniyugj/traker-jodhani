import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { fetchShopifyOrders, parseShopifyOrderPayload, normalizeShopifyDomain, enrichOrderWithShopifyImages, exchangeClientCredentialsForToken } from '@/lib/shopify';
import { Order } from '@/lib/types';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const d1 = getD1Database();

    let settings = db.getSettings(workspaceId);
    if (d1) {
      const d1Settings = await d1Store.getSettings(d1, workspaceId);
      if (d1Settings) {
        settings = d1Settings;
        db.updateSettings(workspaceId, d1Settings);
      }
    }

    const rawDomain = settings.shopify?.shopDomain || '';
    const cleanDomain = normalizeShopifyDomain(rawDomain);
    let adminAccessToken = settings.shopify?.adminAccessToken?.trim() || '';
    const clientId = settings.shopify?.clientId || process.env.SHOPIFY_CLIENT_ID || '';
    const clientSecret = settings.shopify?.clientSecret || 
      (settings.shopify?.webhookSecret?.startsWith('shpss_') ? settings.shopify?.webhookSecret : '') || 
      process.env.SHOPIFY_CLIENT_SECRET || '';

    if (!cleanDomain) {
      const errorMsg = 'Shopify Store Domain is not configured. Please enter your store domain (e.g. yourstore.myshopify.com) in Settings first.';
      return NextResponse.json({
        success: false,
        error: errorMsg,
        problemReason: errorMsg,
      }, { status: 400 });
    }

    // If token is missing, expired, or not set, but client credentials are provided, auto-exchange
    if (!adminAccessToken && clientId && clientSecret) {
      const exchange = await exchangeClientCredentialsForToken(cleanDomain, clientId, clientSecret);
      if (exchange.success && exchange.accessToken) {
        adminAccessToken = exchange.accessToken;
        const updated = db.updateShopifyConfig(workspaceId, {
          adminAccessToken: exchange.accessToken,
          tokenExpiresAt: exchange.tokenExpiresAt,
          isConnected: true,
          lastError: '',
        });
        if (d1) {
          await d1Store.updateSettings(d1, workspaceId, updated);
        }
      }
    }

    if (!adminAccessToken) {
      const errorMsg = 'Shopify Admin API Access Token or App Client ID & Secret is required to sync orders. Please configure your Shopify App credentials in Settings.';
      return NextResponse.json({
        success: false,
        error: errorMsg,
        problemReason: errorMsg,
      }, { status: 400 });
    }

    let importedCount = 0;
    let rawOrders: any[] = [];

    try {
      rawOrders = await fetchShopifyOrders(cleanDomain, adminAccessToken);
    } catch (apiError: any) {
      let refreshed = false;

      if (clientId && clientSecret) {
        try {
          const exchangeResult = await exchangeClientCredentialsForToken(cleanDomain, clientId, clientSecret);
          if (exchangeResult.success && exchangeResult.accessToken) {
            adminAccessToken = exchangeResult.accessToken;
            const updated = db.updateShopifyConfig(workspaceId, {
              adminAccessToken: exchangeResult.accessToken,
              tokenExpiresAt: exchangeResult.tokenExpiresAt,
              isConnected: true,
              lastError: '',
            });
            if (d1) {
              await d1Store.updateSettings(d1, workspaceId, updated);
            }
            rawOrders = await fetchShopifyOrders(cleanDomain, adminAccessToken);
            refreshed = true;
          }
        } catch (refreshErr) {
          console.warn('Auto token refresh attempt failed during sync:', refreshErr);
        }
      }

      if (!refreshed) {
        let errorMsg = `Could not fetch orders from Shopify: ${apiError.message}`;
        if (
          apiError.message?.includes('401') ||
          apiError.message?.includes('Invalid API key') ||
          apiError.message?.includes('access token')
        ) {
          errorMsg = `Shopify rejected credentials (HTTP 401 Unauthorized): The Admin API Access Token (${adminAccessToken.slice(0, 10)}...) is invalid or expired. Please check your Shopify App credentials in Settings.`;
        }
        return NextResponse.json({
          success: false,
          error: errorMsg,
          problemReason: errorMsg,
        }, { status: 400 });
      }
    }

    let existingOrders = db.getOrders(workspaceId);
    if (d1) {
      existingOrders = await d1Store.getOrders(d1, workspaceId);
    }

    for (const rawOrder of rawOrders) {
      const duplicate = existingOrders.find(
        (o) => o.shopifyOrderId === String(rawOrder.id) || o.orderNumber === rawOrder.name
      );
      if (!duplicate) {
        let parsed = parseShopifyOrderPayload(rawOrder, workspaceId);
        parsed = await enrichOrderWithShopifyImages(parsed, cleanDomain, adminAccessToken);
        const created = db.createOrder(workspaceId, parsed);
        if (d1) {
          await d1Store.saveOrder(d1, { ...created, userId: workspaceId });
        }
        importedCount++;
      } else {
        // Sync return, refund, and image status for existing orders
        const parsed = parseShopifyOrderPayload(rawOrder, workspaceId);
        const updates: Partial<Order> = {};

        if (parsed.status !== duplicate.status) {
          updates.status = parsed.status;
        }
        if (parsed.financialStatus && parsed.financialStatus !== duplicate.financialStatus) {
          updates.financialStatus = parsed.financialStatus;
        }
        if (parsed.returnStatus && parsed.returnStatus !== duplicate.returnStatus) {
          updates.returnStatus = parsed.returnStatus;
        }
        if (parsed.refundedAmount !== undefined && parsed.refundedAmount !== duplicate.refundedAmount) {
          updates.refundedAmount = parsed.refundedAmount;
        }
        if (parsed.cancelledAt && parsed.cancelledAt !== duplicate.cancelledAt) {
          updates.cancelledAt = parsed.cancelledAt;
        }
        if (parsed.cancelReason && parsed.cancelReason !== duplicate.cancelReason) {
          updates.cancelReason = parsed.cancelReason;
        }

        // Check if missing product image
        const missingImage = !duplicate.items?.[0]?.imageUrl;
        if (missingImage) {
          let enriched = await enrichOrderWithShopifyImages({ ...duplicate, ...updates }, cleanDomain, adminAccessToken);
          if (enriched.items?.[0]?.imageUrl) {
            updates.items = enriched.items;
          }
        }

        if (Object.keys(updates).length > 0) {
          const updated = db.updateOrder(workspaceId, duplicate.id, updates);
          if (d1) {
            await d1Store.saveOrder(d1, { ...(updated || { ...duplicate, ...updates }), userId: workspaceId });
          }
          importedCount++;
        }
      }
    }


    // Update last sync time and clear error
    const successMsg = importedCount > 0
      ? `Sync successful! ${importedCount} real Shopify orders imported into New Orders.`
      : `Connected to ${cleanDomain}. All ${rawOrders.length} orders are already up to date.`;

    db.updateShopifyConfig(workspaceId, {
      shopDomain: cleanDomain,
      lastSyncAt: new Date().toISOString(),
      isConnected: true,
      lastError: '',
      lastSuccessMessage: successMsg,
    });

    const logEntry = {
      id: `wh-${Date.now()}`,
      userId: workspaceId,
      topic: 'admin/orders-sync',
      status: 'success' as const,
      message: `Manual sync executed for ${cleanDomain}. Retrieved ${rawOrders.length} orders from Shopify (${importedCount} new imported).`,
      payloadSummary: `Total on store: ${rawOrders.length} | Imported: ${importedCount}`,
      receivedAt: new Date().toISOString(),
    };

    db.addWebhookLog(workspaceId, logEntry);

    if (d1) {
      await d1Store.updateSettings(d1, workspaceId, db.getSettings(workspaceId));
      await d1Store.addWebhookLog(d1, logEntry);
    }

    return NextResponse.json({
      success: true,
      message: successMsg,
      importedCount,
      totalShopifyOrders: rawOrders.length,
      shopDomain: cleanDomain,
      isConnected: true,
    });
  } catch (error: any) {
    console.error('Shopify sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
