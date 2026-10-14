import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getSessionUser(req);
    const { author, role, text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    const updated = db.addComment(
      id,
      author || session?.name || 'Team Member',
      role || session?.role || 'Admin',
      text.trim()
    );

    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const d1 = getD1Database();
    if (d1 && updated.userId) {
      await d1Store.saveOrder(d1, { ...updated, userId: updated.userId });
    }

    return NextResponse.json({ success: true, comments: updated.comments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
