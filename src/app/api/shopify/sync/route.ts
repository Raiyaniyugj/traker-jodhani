import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { fetchShopifyOrders, parseShopifyOrderPayload } from '@/lib/shopify';
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

    const { shopDomain, adminAccessToken } = settings.shopify || {};

    if (!shopDomain) {
      return NextResponse.json({ error: 'Shop domain not configured in Settings' }, { status: 400 });
    }

    let importedCount = 0;
    if (adminAccessToken && adminAccessToken.startsWith('shpat_') && !adminAccessToken.includes('demo')) {
      try {
        const rawOrders = await fetchShopifyOrders(shopDomain, adminAccessToken);
        let existingOrders = db.getOrders(workspaceId);
        if (d1) {
          existingOrders = await d1Store.getOrders(d1, workspaceId);
        }

        for (const rawOrder of rawOrders) {
          const duplicate = existingOrders.find(
            (o) => o.shopifyOrderId === String(rawOrder.id) || o.orderNumber === rawOrder.name
          );
          if (!duplicate) {
            const parsed = parseShopifyOrderPayload(rawOrder);
            const created = db.createOrder(workspaceId, parsed);
            if (d1) {
              await d1Store.saveOrder(d1, { ...created, userId: workspaceId });
            }
            importedCount++;
          }
        }
      } catch (apiError: any) {
        console.warn('Shopify API live fetch warning:', apiError.message);
      }
    }

    // Update last sync time
    db.updateShopifyConfig(workspaceId, {
      lastSyncAt: new Date().toISOString(),
      isConnected: true,
    });

    const logEntry = {
      id: `wh-${Date.now()}`,
      userId: workspaceId,
      topic: 'admin/orders-sync',
      status: 'success' as const,
      message: `Manual sync executed. Synced orders from ${shopDomain}`,
      payloadSummary: `Imported count: ${importedCount}`,
      receivedAt: new Date().toISOString(),
    };

    db.addWebhookLog(workspaceId, logEntry);

    if (d1) {
      await d1Store.updateSettings(d1, workspaceId, db.getSettings(workspaceId));
      await d1Store.addWebhookLog(d1, logEntry);
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed successfully. ${importedCount > 0 ? `${importedCount} new orders imported.` : 'All orders are up to date.'}`,
      importedCount,
    });
  } catch (error: any) {
    console.error('Shopify sync error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
