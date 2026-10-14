import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { fetchShopifyOrders, parseShopifyOrderPayload, normalizeShopifyDomain } from '@/lib/shopify';
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
      if (d1Settings) settings = d1Settings;
    }

    const rawDomain = settings.shopify?.shopDomain || '';
    const cleanDomain = normalizeShopifyDomain(rawDomain);
    const adminAccessToken = settings.shopify?.adminAccessToken?.trim() || '';

    if (!cleanDomain) {
      return NextResponse.json({
        success: false,
        error: 'Please enter and save your Shopify Store Domain in Settings first (e.g. yourstore.myshopify.com).',
      }, { status: 400 });
    }

    if (!adminAccessToken || !adminAccessToken.startsWith('shpat_')) {
      return NextResponse.json({
        success: false,
        error: 'Shopify Admin API Access Token is required to fetch historical orders. Please generate a custom app token starting with "shpat_" in Shopify Admin → Apps → Develop apps (with "read_orders" scope). Note: New orders placed on your store will arrive automatically via the Webhook URL even without this token.',
      }, { status: 400 });
    }

    let importedCount = 0;
    let rawOrders: any[] = [];

    try {
      rawOrders = await fetchShopifyOrders(cleanDomain, adminAccessToken);
    } catch (apiError: any) {
      return NextResponse.json({
        success: false,
        error: `Could not fetch orders from Shopify: ${apiError.message}`,
      }, { status: 400 });
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
        const parsed = parseShopifyOrderPayload(rawOrder, workspaceId);
        const created = db.createOrder(workspaceId, parsed);
        if (d1) {
          await d1Store.saveOrder(d1, { ...created, userId: workspaceId });
        }
        importedCount++;
      }
    }

    // Update last sync time
    db.updateShopifyConfig(workspaceId, {
      shopDomain: cleanDomain,
      lastSyncAt: new Date().toISOString(),
      isConnected: true,
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
      message: importedCount > 0
        ? `Sync successful! ${importedCount} real Shopify orders imported into New Orders.`
        : `Connected to ${cleanDomain}. All ${rawOrders.length} orders are already up to date.`,
      importedCount,
      totalShopifyOrders: rawOrders.length,
    });
  } catch (error: any) {
    console.error('Shopify sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
