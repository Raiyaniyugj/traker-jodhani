import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const { id } = await params;
    const { title, url, type } = await req.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const d1 = getD1Database();
    let order = d1 ? await d1Store.getOrderById(d1, id, workspaceId) : null;
    if (!order) {
      const memoryOrder = db.getOrderById(id, workspaceId);
      if (memoryOrder) order = memoryOrder;
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found or permission denied' }, { status: 404 });
    }

    const newMedia = {
      id: `med-${Date.now()}`,
      title: title.trim(),
      url: url || '',
      type: type || 'general',
      uploadedAt: new Date().toISOString(),
    };

    const gallery = Array.isArray(order.gallery) ? [...order.gallery, newMedia] : [newMedia];
    const activity = Array.isArray(order.activity) ? [...order.activity] : [];
    activity.unshift({
      id: `act-${Date.now()}`,
      description: `Uploaded media: ${title.trim()} (${type || 'general'})`,
      timestamp: new Date().toISOString(),
      actor: session.name || 'Admin',
    });

    const updatedOrder = {
      ...order,
      gallery,
      activity,
      userId: workspaceId,
      updatedAt: new Date().toISOString(),
    };

    if (d1) {
      await d1Store.saveOrder(d1, updatedOrder);
    }
    db.addMedia(id, title.trim(), url || '', type || 'general');

    return NextResponse.json({ success: true, gallery: updatedOrder.gallery });
  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
