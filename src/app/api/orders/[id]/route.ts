import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';
import { Order } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getSessionUser(req);
    const d1 = getD1Database();

    let order: any = null;
    let stages: any[] = [];

    if (session) {
      // Authenticated atelier member lookup (strictly scoped to user's workspace)
      const workspaceId = session.ownerId || session.userId;
      if (d1) {
        order = await d1Store.getOrderById(d1, id, workspaceId);
        stages = await d1Store.getStages(d1, workspaceId);
      }
      if (!order) {
        order = db.getOrderById(id, workspaceId);
        stages = db.getStages(workspaceId);
      }
    } else {
      // Public customer tracking portal lookup (allow lookup by Order ID or Tracking Token)
      if (d1) {
        order = await d1Store.getOrderById(d1, id);
        if (order?.userId) {
          stages = await d1Store.getStages(d1, order.userId);
        }
      }
      if (!order) {
        order = db.getOrderById(id);
        if (order?.userId) {
          stages = db.getStages(order.userId);
        }
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order, stages });
  } catch (error: any) {
    console.error('Order [id] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id } = await params;
    const workspaceId = session.ownerId || session.userId;
    const updates = await req.json();

    const d1 = getD1Database();
    let existingOrder: Order | null = null;
    if (d1) {
      existingOrder = await d1Store.getOrderById(d1, id, workspaceId);
    }
    if (!existingOrder) {
      const memoryOrder = db.getOrderById(id, workspaceId);
      if (memoryOrder) existingOrder = memoryOrder;
    }

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found or permission denied' }, { status: 404 });
    }

    // Load user's stages to compute progress accurately
    let stages = d1 ? await d1Store.getStages(d1, workspaceId) : [];
    if (!stages || stages.length === 0) {
      stages = db.getStages(workspaceId);
    }

    let progressPercent = existingOrder.progressPercent;
    const activity = Array.isArray(existingOrder.activity) ? [...existingOrder.activity] : [];

    if (updates.currentStageId && updates.currentStageId !== existingOrder.currentStageId) {
      const stageIdx = stages.findIndex((s) => s.id === updates.currentStageId);
      progressPercent = stageIdx >= 0 ? Math.round(((stageIdx + 1) / stages.length) * 100) : existingOrder.progressPercent;

      const targetStage = stages.find((s) => s.id === updates.currentStageId);
      activity.unshift({
        id: `act-${Date.now()}`,
        description: `Stage moved to ${targetStage?.name || updates.currentStageId}`,
        timestamp: new Date().toISOString(),
        actor: session.name || 'Admin',
      });

      if (
        targetStage?.name.toLowerCase().includes('completed') ||
        targetStage?.name.toLowerCase().includes('delivered')
      ) {
        updates.status = 'Delivered';
      }
    }

    if (updates.trackingNumber && updates.trackingNumber !== existingOrder.trackingNumber) {
      activity.unshift({
        id: `act-${Date.now()}`,
        description: `Tracking number added: ${updates.trackingNumber} (${updates.trackingCarrier || 'Carrier'})`,
        timestamp: new Date().toISOString(),
        actor: session.name || 'Admin',
      });
    }

    const updatedOrder: Order & { userId: string } = {
      ...existingOrder,
      ...updates,
      activity,
      progressPercent,
      userId: workspaceId,
      updatedAt: new Date().toISOString(),
    };

    if (d1) {
      await d1Store.saveOrder(d1, updatedOrder);
    }
    db.updateOrder(workspaceId, id, updates, session.name || 'Admin');

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error('Order [id] PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { id } = await params;
    const workspaceId = session.ownerId || session.userId;

    const ok = db.deleteOrder(workspaceId, id);
    const d1 = getD1Database();
    if (d1) {
      await d1Store.deleteOrder(d1, id, workspaceId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Order [id] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
