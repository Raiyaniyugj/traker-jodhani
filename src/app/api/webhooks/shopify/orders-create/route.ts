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

    const d1 = getD1Database();
    let matchedWorkspace: { userId: string; settings: any } | null = null;

    if (d1 && shopHeader) {
      matchedWorkspace = await d1Store.getSettingsByShopDomain(d1, shopHeader);
    }
    if (!matchedWorkspace && shopHeader) {
      matchedWorkspace = db.getSettingsByShopDomain(shopHeader);
    }

    const workspaceId = matchedWorkspace?.userId || 'default';
    const secret = matchedWorkspace?.settings?.shopify?.webhookSecret?.trim() || '';

    // Verify HMAC if a secret is configured in workspace settings
    if (secret && hmacHeader) {
      const isValid = verifyShopifyWebhook(rawBody, hmacHeader, secret);
      if (!isValid) {
        const failLog = {
          id: `wh-${Date.now()}`,
          userId: workspaceId,
          topic: topicHeader,
          status: 'failed' as const,
          message: 'HMAC signature mismatch. Please check your Webhook Signing Secret in Settings.',
          payloadSummary: `Shop: ${shopHeader || 'Unknown'}`,
          receivedAt: new Date().toISOString(),
        };
        db.addWebhookLog(workspaceId, failLog);
        if (d1) await d1Store.addWebhookLog(d1, failLog);
        return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Handle test / ping notifications from Shopify
    if (!payload.id && !payload.line_items) {
      const pingLog = {
        id: `wh-${Date.now()}`,
        userId: workspaceId,
        topic: topicHeader,
        status: 'success' as const,
        message: 'Shopify test webhook verification ping received successfully.',
        payloadSummary: `Shop: ${shopHeader}`,
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
          receivedAt: new Date().toISOString(),
        };
        db.addWebhookLog(workspaceId, logEntry);
        if (d1) await d1Store.addWebhookLog(d1, logEntry);

        return NextResponse.json({ success: true, updated: existingOrder.id });
      }
    }

    // Handle Order Creation / Ingestion
    const parsedOrder = parseShopifyOrderPayload(payload);

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
