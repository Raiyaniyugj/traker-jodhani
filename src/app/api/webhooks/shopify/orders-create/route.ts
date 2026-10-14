import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { parseShopifyOrderPayload, verifyShopifyWebhook } from '@/lib/shopify';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
    const topicHeader = (req.headers.get('x-shopify-topic') || 'orders/create').toLowerCase();
    const shopHeader = req.headers.get('x-shopify-shop-domain') || '';

    let payload: any = {};
    if (rawBody && rawBody.trim()) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        // payload might be form-urlencoded or non-json test
      }
    }

    // Detect shop domain from header or order payload url
    let detectedShop = shopHeader.toLowerCase().trim();
    if (!detectedShop && payload?.order_status_url) {
      try {
        const u = new URL(payload.order_status_url);
        detectedShop = u.hostname.toLowerCase().trim();
      } catch {}
    }

    const d1 = getD1Database();
    let matchedWorkspace: { userId: string; settings: any } | null = null;

    if (d1 && detectedShop) {
      matchedWorkspace = await d1Store.getSettingsByShopDomain(d1, detectedShop);
    }
    if (!matchedWorkspace && detectedShop) {
      matchedWorkspace = db.getSettingsByShopDomain(detectedShop);
    }

    // Auto-match fallback: If shop domain not explicitly pre-saved in settings,
    // automatically link to the active registered atelier workspace!
    if (!matchedWorkspace) {
      if (d1) {
        const userRow = await d1
          .prepare('SELECT id, owner_id FROM users ORDER BY created_at DESC LIMIT 1')
          .first();
        if (userRow) {
          const uId = userRow.owner_id || userRow.id;
          const uSettings = await d1Store.getSettings(d1, uId);
          matchedWorkspace = { userId: uId, settings: uSettings };
        }
      }
      if (!matchedWorkspace) {
        const users = db.getUsers('');
        if (users.length > 0) {
          const uId = users[0].ownerId || users[0].id;
          matchedWorkspace = { userId: uId, settings: db.getSettings(uId) };
        }
      }
    }

    const workspaceId = matchedWorkspace?.userId || 'usr_default';
    const secret = matchedWorkspace?.settings?.shopify?.webhookSecret?.trim() || '';

    // Automatically mark Shopify as connected and update shop domain if detected
    if (d1 && workspaceId) {
      try {
        if (detectedShop) {
          await d1
            .prepare(
              `UPDATE settings SET 
                shopify_shop_domain = CASE WHEN (shopify_shop_domain IS NULL OR shopify_shop_domain = '') THEN ? ELSE shopify_shop_domain END,
                shopify_is_connected = 1,
                shopify_last_sync_at = datetime('now'),
                updated_at = datetime('now')
               WHERE user_id = ? OR id = ?`
            )
            .bind(detectedShop, workspaceId, workspaceId)
            .run();
        } else {
          await d1
            .prepare(
              `UPDATE settings SET 
                shopify_is_connected = 1,
                shopify_last_sync_at = datetime('now'),
                updated_at = datetime('now')
               WHERE user_id = ? OR id = ?`
            )
            .bind(workspaceId, workspaceId)
            .run();
        }
      } catch (e) {
        console.warn('Auto-updating settings error:', e);
      }
    }

    // Update in-memory db cache
    if (workspaceId) {
      db.updateShopifyConfig(workspaceId, {
        shopDomain: detectedShop || undefined,
        isConnected: true,
        lastSyncAt: new Date().toISOString(),
      });
    }

    // Verify HMAC if a secret is explicitly configured by the user
    if (secret && hmacHeader) {
      const isValid = verifyShopifyWebhook(rawBody, hmacHeader, secret);
      if (!isValid) {
        const failLog = {
          id: `wh-${Date.now()}`,
          userId: workspaceId,
          topic: topicHeader,
          status: 'failed' as const,
          message: 'HMAC signature mismatch. Please check your Webhook Signing Secret in Settings.',
          payloadSummary: `Shop: ${detectedShop || 'Unknown'}`,
          receivedAt: new Date().toISOString(),
        };
        db.addWebhookLog(workspaceId, failLog);
        if (d1) await d1Store.addWebhookLog(d1, failLog);
        return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 });
      }
    }

    // Handle test / ping notifications from Shopify
    if (!payload.id && !payload.line_items) {
      const pingLog = {
        id: `wh-${Date.now()}`,
        userId: workspaceId,
        topic: topicHeader,
        status: 'success' as const,
        message: 'Shopify test webhook verification ping received successfully.',
        payloadSummary: `Shop: ${detectedShop || 'Shopify Store Connected'}`,
        receivedAt: new Date().toISOString(),
      };
      db.addWebhookLog(workspaceId, pingLog);
      if (d1) await d1Store.addWebhookLog(d1, pingLog);
      return NextResponse.json({ success: true, message: 'Ping acknowledged' }, { status: 200 });
    }

    const shopifyOrderId = String(payload.id || '');
    let existingOrders = db.getOrders(workspaceId);
    if (d1) {
      const d1Orders = await d1Store.getOrders(d1, workspaceId);
      if (d1Orders && d1Orders.length > 0) existingOrders = d1Orders;
    }

    const existingOrder = existingOrders.find(
      (o) => o.shopifyOrderId === shopifyOrderId || o.orderNumber === payload.name
    );

    // Handle Fulfillment event
    if (topicHeader.includes('fulfilled')) {
      if (existingOrder) {
        let stages = db.getStages(workspaceId);
        if (d1) {
          const d1Stages = await d1Store.getStages(d1, workspaceId);
          if (d1Stages && d1Stages.length > 0) stages = d1Stages;
        }
        const shippingStage = stages.find((s) => s.name.toLowerCase().includes('shipping')) || stages[stages.length - 2];
        if (shippingStage) {
          const updated = db.updateOrder(workspaceId, existingOrder.id, { currentStageId: shippingStage.id }, 'Shopify Webhook');
          if (d1 && updated) await d1Store.saveOrder(d1, { ...updated, userId: workspaceId });
        }

        const logEntry = {
          id: `wh-${Date.now()}`,
          userId: workspaceId,
          topic: topicHeader,
          shopifyOrderId,
          status: 'success' as const,
          message: `Order ${existingOrder.orderNumber} advanced to Shipping via Shopify fulfillment.`,
          payloadSummary: `Order: ${existingOrder.orderNumber}`,
          receivedAt: new Date().toISOString(),
        };
        db.addWebhookLog(workspaceId, logEntry);
        if (d1) await d1Store.addWebhookLog(d1, logEntry);

        return NextResponse.json({ success: true, updated: existingOrder.id });
      }
    }

    // Handle Cancellation event
    if (topicHeader.includes('cancelled') || topicHeader.includes('cancel')) {
      if (existingOrder) {
        const updated = db.updateOrder(workspaceId, existingOrder.id, { status: 'Cancelled' }, 'Shopify Webhook');
        if (d1 && updated) await d1Store.saveOrder(d1, { ...updated, userId: workspaceId });

        const logEntry = {
          id: `wh-${Date.now()}`,
          userId: workspaceId,
          topic: topicHeader,
          shopifyOrderId,
          status: 'success' as const,
          message: `Order ${existingOrder.orderNumber} marked as Cancelled.`,
          payloadSummary: `Order: ${existingOrder.orderNumber}`,
          receivedAt: new Date().toISOString(),
        };
        db.addWebhookLog(workspaceId, logEntry);
        if (d1) await d1Store.addWebhookLog(d1, logEntry);

        return NextResponse.json({ success: true, updated: existingOrder.id });
      }
    }

    // Handle Order Creation / Ingestion
    const parsedOrder = parseShopifyOrderPayload(payload, workspaceId);

    if (existingOrder) {
      const updated = db.updateOrder(workspaceId, existingOrder.id, {
        subtotal: parsedOrder.subtotal,
        total: parsedOrder.total,
        notesFromCustomer: parsedOrder.notesFromCustomer,
      }, 'Shopify Webhook');
      if (d1 && updated) await d1Store.saveOrder(d1, { ...updated, userId: workspaceId });

      const logEntry = {
        id: `wh-${Date.now()}`,
        userId: workspaceId,
        topic: topicHeader,
        shopifyOrderId,
        status: 'ignored' as const,
        message: `Order ${existingOrder.orderNumber} updated with latest Shopify details.`,
        payloadSummary: `${payload.name || payload.id} ($${parsedOrder.total})`,
        receivedAt: new Date().toISOString(),
      };
      db.addWebhookLog(workspaceId, logEntry);
      if (d1) await d1Store.addWebhookLog(d1, logEntry);

      return NextResponse.json({ success: true, message: 'Existing order updated', id: existingOrder.id });
    }

    // Create New Order
    const created = db.createOrder(workspaceId, parsedOrder);
    if (d1) {
      await d1Store.saveOrder(d1, { ...created, userId: workspaceId });
    }

    const logEntry = {
      id: `wh-${Date.now()}`,
      userId: workspaceId,
      topic: topicHeader,
      shopifyOrderId,
      status: 'success' as const,
      message: `Shopify Order ${created.orderNumber} imported into New Orders successfully.`,
      payloadSummary: `${created.customer.name} - ${created.items[0]?.title || 'Jewelry Piece'} ($${created.total})`,
      receivedAt: new Date().toISOString(),
    };
    db.addWebhookLog(workspaceId, logEntry);
    if (d1) await d1Store.addWebhookLog(d1, logEntry);

    return NextResponse.json({
      success: true,
      message: `Order ${created.orderNumber} created in workshop`,
      id: created.id,
      trackingToken: created.customerTrackingToken,
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
