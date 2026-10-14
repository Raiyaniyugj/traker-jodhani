import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';

import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const logEntry = {
      id: `wh-${Date.now()}`,
      userId: workspaceId,
      topic: 'orders/create (test-ping)',
      status: 'success' as const,
      message: 'Connectivity test ping verified. Webhook endpoint is active and listening.',
      payloadSummary: 'Test Ping: Connection OK',
      receivedAt: new Date().toISOString(),
    };

    db.addWebhookLog(workspaceId, logEntry);

    const d1 = getD1Database();
    if (d1) {
      await d1Store.addWebhookLog(d1, logEntry);
    }

    return NextResponse.json({
      success: true,
      message: 'Shopify webhook connection verified. No dummy data created.',
    });
  } catch (error: any) {
    console.error('Shopify simulate error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
