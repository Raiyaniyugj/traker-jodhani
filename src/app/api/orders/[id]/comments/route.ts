import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';
import { OrderComment, Role } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const { id } = await params;
    const { author, role, text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
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

    const newComment: OrderComment = {
      id: `comm-${Date.now()}`,
      author: author || session.name || 'Team Member',
      role: (role || session.role || 'Admin') as Role,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    const comments = Array.isArray(order.comments) ? [...order.comments, newComment] : [newComment];
    const updatedOrder = {
      ...order,
      comments,
      userId: workspaceId,
      updatedAt: new Date().toISOString(),
    };

    if (d1) {
      await d1Store.saveOrder(d1, updatedOrder);
    }
    db.addComment(id, newComment.author, newComment.role, newComment.text);

    return NextResponse.json({ success: true, comments: updatedOrder.comments });
  } catch (error: any) {
    console.error('Comment error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
