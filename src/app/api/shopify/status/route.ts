import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';
import { normalizeShopifyDomain, testShopifyConnection } from '@/lib/shopify';
import { ShopifyConnectionStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const d1 = getD1Database();

    let settings = db.getSettings(workspaceId);
    let webhookLogs = db.getWebhookLogs(workspaceId);
    let orders = db.getOrders(workspaceId);

    if (d1) {
      const d1Settings = await d1Store.getSettings(d1, workspaceId);
      if (d1Settings) {
        settings = d1Settings;
        db.updateSettings(workspaceId, d1Settings);
      }

      const d1Logs = await d1Store.getWebhookLogs(d1, workspaceId);
      if (d1Logs) webhookLogs = d1Logs;

      const d1Orders = await d1Store.getOrders(d1, workspaceId);
      if (d1Orders) orders = d1Orders;
    }

    const rawDomain = settings.shopify?.shopDomain || '';
    const cleanDomain = normalizeShopifyDomain(rawDomain);
    const token = (settings.shopify?.adminAccessToken || '').trim();
    const storedError = settings.shopify?.lastError || '';
    const storedIsConnected = Boolean(settings.shopify?.isConnected);

    // Count Shopify orders
    const shopifyOrders = orders.filter(
      (o) => o.source === 'shopify' || Boolean(o.shopifyOrderId)
    );
    const shopifyOrdersCount = shopifyOrders.length;

    // Check query for on-demand live test
    const { searchParams } = new URL(req.url);
    const shouldTestLive = searchParams.get('test') === 'true' || searchParams.get('test') === '1';

    let liveTestError = '';
    if (shouldTestLive && cleanDomain && token && !token.includes('demo')) {
      const liveResult = await testShopifyConnection(cleanDomain, token);
      if (!liveResult.success) {
        liveTestError = liveResult.error || 'Live test connection failed';
        db.updateShopifyConfig(workspaceId, {
          lastError: liveTestError,
        });
      } else {
        db.updateShopifyConfig(workspaceId, {
          isConnected: true,
          lastError: '',
          lastSyncAt: new Date().toISOString(),
        });
        if (d1) {
          await d1Store.updateSettings(d1, workspaceId, db.getSettings(workspaceId));
        }
      }
    }

    // Diagnostics building
    const domainOk = Boolean(cleanDomain && !rawDomain.includes('@'));
    const domainDetail = !rawDomain
      ? 'No store domain configured. Enter your .myshopify.com address in Settings.'
      : rawDomain.includes('@')
      ? 'Invalid domain: User login email was entered instead of your .myshopify.com store domain.'
      : `Store domain configured: ${cleanDomain}`;

    const tokenOk = Boolean(token && token.startsWith('shpat_') && !liveTestError);
    const tokenDetail = !token
      ? 'Admin API Access Token is missing. Needed to fetch orders from Shopify API.'
      : !token.startsWith('shpat_')
      ? 'Token format warning: Shopify Admin API custom app tokens typically start with "shpat_".'
      : liveTestError
      ? `Token verification failed: ${liveTestError}`
      : 'Admin API Access Token is valid and verified with Shopify.';

    const lastWebhook = webhookLogs[0];
    const webhookOk = lastWebhook?.status === 'success';
    const webhookDetail = lastWebhook
      ? lastWebhook.status === 'success'
        ? `Last event: ${lastWebhook.topic} at ${new Date(lastWebhook.receivedAt).toLocaleTimeString()}`
        : `Webhook issue: ${lastWebhook.message}`
      : 'No webhook events received yet. Ensure webhook URL is configured in Shopify Admin.';

    const ordersOk = shopifyOrdersCount > 0;
    const ordersDetail = ordersOk
      ? `${shopifyOrdersCount} active orders imported from Shopify.`
      : 'No Shopify orders received or synced yet.';

    // Determine overall connection status and exact problem reason
    let isConnected = false;
    let status: 'connected' | 'error' | 'not_configured' | 'action_required' = 'not_configured';
    let statusTitle = 'Not Connected';
    let problemReason: string | null = null;
    let recommendation: string | null = null;

    const effectiveError = liveTestError || storedError;

    if (!domainOk) {
      status = 'not_configured';
      statusTitle = 'Shopify Not Configured';
      problemReason = !rawDomain
        ? 'No Shopify store domain is entered in Settings.'
        : 'An email address was entered as the store domain instead of your store slug or myshopify.com domain.';
      recommendation = 'Go to Settings → Shopify Integration and enter your store name (e.g. yourstore.myshopify.com).';
    } else if (effectiveError) {
      status = 'error';
      statusTitle = 'Shopify Connection Problem';
      problemReason = effectiveError;
      recommendation = 'Check your store domain and ensure your Admin API Access Token has "read_orders" scope in Shopify Admin.';
    } else if (cleanDomain && (tokenOk || ordersOk || webhookOk || storedIsConnected)) {
      isConnected = true;
      status = 'connected';
      statusTitle = 'Shopify Connected';
      problemReason = null;
      if (!storedIsConnected && d1) {
        db.updateShopifyConfig(workspaceId, { isConnected: true });
        await d1
          .prepare(`UPDATE settings SET shopify_is_connected = 1, updated_at = NOW() WHERE user_id = ? OR id = ?`)
          .bind(workspaceId, workspaceId)
          .run()
          .catch(() => {});
      }
    } else {
      status = 'action_required';
      statusTitle = 'Shopify Setup Incomplete';
      problemReason = 'Store domain is entered, but no Admin API Access Token is configured and no webhook orders have arrived yet.';
      recommendation = 'Add a Shopify Admin API token starting with "shpat_" in Settings to sync existing orders, or paste the Webhook URL into Shopify Admin.';
    }


    const payload: ShopifyConnectionStatus = {
      isConnected,
      status,
      statusTitle,
      shopDomain: cleanDomain,
      shopifyOrdersCount,
      problemReason,
      recommendation,
      lastSyncAt: settings.shopify?.lastSyncAt,
      lastError: effectiveError || undefined,
      diagnostics: {
        domain: {
          ok: domainOk,
          label: 'Store Domain',
          detail: domainDetail,
        },
        token: {
          ok: tokenOk,
          label: 'Admin API Access Token',
          detail: tokenDetail,
        },
        webhook: {
          ok: webhookOk,
          label: 'Webhook Endpoint',
          detail: webhookDetail,
        },
        orders: {
          ok: ordersOk,
          count: shopifyOrdersCount,
          label: 'Shopify Orders in Workshop',
          detail: ordersDetail,
        },
      },
    };

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Shopify status route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
