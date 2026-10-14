import { NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { generateMockShopifyOrder, parseShopifyOrderPayload } from '@/lib/shopify';

export async function POST() {
  try {
    const mockPayload = generateMockShopifyOrder();
    const orderData = parseShopifyOrderPayload(mockPayload);
    const created = db.createOrder(orderData);

    const logEntry = {
      id: `wh-${Date.now()}`,
      topic: 'orders/create (simulated)',
      shopifyOrderId: String(mockPayload.id),
      status: 'success' as const,
      message: `Simulated order ${created.orderNumber} successfully ingested.`,
      payloadSummary: `${created.customer.name} - ${created.items[0]?.title} ($${created.total})`,
      receivedAt: new Date().toISOString(),
    };

    db.addWebhookLog(logEntry);

    const d1 = getD1Database();
    if (d1) {
      await d1Store.saveOrder(d1, created);
      await d1Store.addWebhookLog(d1, logEntry);
    }

    return NextResponse.json({
      success: true,
      message: `Simulated order ${created.orderNumber} created!`,
      order: created,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
