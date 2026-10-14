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

    const settings = db.getSettings();
    const secret = settings.shopify?.webhookSecret?.trim() || '';

    // Verify HMAC if a secret is configured in settings
    if (secret && hmacHeader) {
      const isValid = verifyShopifyWebhook(rawBody, hmacHeader, secret);
      if (!isValid) {
        db.addWebhookLog({
          topic: topicHeader,
          status: 'failed',
          message: 'HMAC signature mismatch. Please check your Webhook Signing Secret in Settings.',
          payloadSummary: `Shop: ${shopHeader || 'Unknown'}`,
        });
        return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 });
      }
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Handle test / ping notifications from Shopify
    if (!payload.id && !payload.line_items) {
      db.addWebhookLog({
        topic: topicHeader,
        status: 'success',
        message: 'Shopify test webhook verification ping received successfully.',
        payloadSummary: `Shop: ${shopHeader}`,
      });
      return NextResponse.json({ success: true, message: 'Ping acknowledged' }, { status: 200 });
    }

    const shopifyOrderId = String(payload.id || '');
    const existingOrders = db.getOrders();
    const existingOrder = existingOrders.find(
      (o) => o.shopifyOrderId === shopifyOrderId || o.orderNumber === payload.name
    );

    // Handle Fulfillment event
    if (topicHeader.includes('fulfilled')) {
      if (existingOrder) {
        const stages = db.getStages();
        const shippingStage = stages.find((s) => s.name.toLowerCase().includes('shipping')) || stages[stages.length - 2];
        if (shippingStage) {
          db.updateOrder(existingOrder.id, { currentStageId: shippingStage.id }, 'Shopify Webhook');
        }
        db.addWebhookLog({
          topic: topicHeader,
          shopifyOrderId,
          status: 'success',
          message: `Order ${existingOrder.orderNumber} advanced to Shipping via Shopify fulfillment.`,
        });
        return NextResponse.json({ success: true, updated: existingOrder.id });
      }
    }

    // Handle Cancellation event
    if (topicHeader.includes('cancelled') || topicHeader.includes('cancel')) {
      if (existingOrder) {
        db.updateOrder(existingOrder.id, { status: 'Cancelled' }, 'Shopify Webhook');
        db.addWebhookLog({
          topic: topicHeader,
          shopifyOrderId,
          status: 'success',
          message: `Order ${existingOrder.orderNumber} marked as Cancelled.`,
        });
        return NextResponse.json({ success: true, updated: existingOrder.id });
      }
    }

    // Handle Order Creation / Update
    const parsedOrder = parseShopifyOrderPayload(payload);

    if (existingOrder) {
      // Update existing order
      const updated = db.updateOrder(existingOrder.id, {
        subtotal: parsedOrder.subtotal,
        total: parsedOrder.total,
        notesFromCustomer: parsedOrder.notesFromCustomer,
      }, 'Shopify Webhook');

      db.addWebhookLog({
        topic: topicHeader,
        shopifyOrderId,
        status: 'ignored',
        message: `Order ${parsedOrder.orderNumber} updated. Already tracked in workspace.`,
        payloadSummary: `${parsedOrder.customer.name} - $${parsedOrder.total}`,
      });
      return NextResponse.json({ success: true, orderId: existingOrder.id });
    }

    // Create new production order in New Orders column
    const created = db.createOrder(parsedOrder);

    // Auto-connect store domain if not configured
    if (shopHeader && !settings.shopify?.shopDomain) {
      db.updateShopifyConfig({ shopDomain: shopHeader, isConnected: true });
    }

    const logEntry = {
      id: `wh-${Date.now()}`,
      topic: topicHeader,
      shopifyOrderId,
      status: 'success' as const,
      message: `Order ${created.orderNumber} successfully imported into New Orders.`,
      payloadSummary: `${created.customer.name} · ${created.items[0]?.title} ($${created.total})`,
      receivedAt: new Date().toISOString(),
    };

    db.addWebhookLog(logEntry);

    const d1 = getD1Database();
    if (d1) {
      await d1Store.saveOrder(d1, created);
      await d1Store.addWebhookLog(d1, logEntry);
    }

    return NextResponse.json({ success: true, order: created }, { status: 200 });
  } catch (error: any) {
    console.error('Error handling Shopify webhook:', error);
    db.addWebhookLog({
      topic: 'orders/create',
      status: 'failed',
      message: `Internal processing error: ${error.message}`,
    });
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
