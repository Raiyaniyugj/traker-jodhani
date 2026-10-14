import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { generateMockShopifyOrder, parseShopifyOrderPayload } from '@/lib/shopify';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const mockPayload = generateMockShopifyOrder();
    const orderData = parseShopifyOrderPayload(mockPayload);
    const created = db.createOrder(workspaceId, orderData);

    const logEntry = {
      id: `wh-${Date.now()}`,
      userId: workspaceId,
      topic: 'orders/create (simulated)',
      shopifyOrderId: String(mockPayload.id),
      status: 'success' as const,
      message: `Simulated order ${created.orderNumber} successfully ingested into workshop.`,
      payloadSummary: `${created.customer.name} - ${created.items[0]?.title} ($${created.total})`,
      receivedAt: new Date().toISOString(),
    };

    db.addWebhookLog(workspaceId, logEntry);

    const d1 = getD1Database();
    if (d1) {
      await d1Store.saveOrder(d1, { ...created, userId: workspaceId });
      await d1Store.addWebhookLog(d1, logEntry);
    }

    return NextResponse.json({
      success: true,
      message: `Simulated order ${created.orderNumber} created!`,
      order: created,
    });
  } catch (error: any) {
    console.error('Shopify simulate error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
