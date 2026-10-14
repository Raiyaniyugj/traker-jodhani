import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const d1 = getD1Database();
    let order = db.getOrderById(id);
    let stages = db.getStages();

    if (d1) {
      const d1Order = await d1Store.getOrderById(d1, id);
      if (d1Order) order = d1Order;
      const d1Stages = await d1Store.getStages(d1);
      if (d1Stages && d1Stages.length > 0) stages = d1Stages;
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ order, stages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const updates = await req.json();
    const updated = db.updateOrder(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const d1 = getD1Database();
    if (d1) {
      await d1Store.saveOrder(d1, updated);
    }
    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = db.deleteOrder(id);
    if (!ok) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const d1 = getD1Database();
    if (d1) {
      try {
        await d1.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
      } catch (e) {
        console.error('D1 delete order error:', e);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
