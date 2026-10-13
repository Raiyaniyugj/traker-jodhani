import { NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { generateMockShopifyOrder, parseShopifyOrderPayload } from '@/lib/shopify';

export async function POST() {
  try {
    const mockPayload = generateMockShopifyOrder();
    const orderData = parseShopifyOrderPayload(mockPayload);
    const created = db.createOrder(orderData);

    db.addWebhookLog({
      topic: 'orders/create (simulated)',
      shopifyOrderId: String(mockPayload.id),
      status: 'success',
      message: `Simulated order ${created.orderNumber} successfully ingested.`,
      payloadSummary: `${created.customer.name} - ${created.items[0]?.title} ($${created.total})`,
    });

    return NextResponse.json({
      success: true,
      message: `Simulated order ${created.orderNumber} created!`,
      order: created,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
