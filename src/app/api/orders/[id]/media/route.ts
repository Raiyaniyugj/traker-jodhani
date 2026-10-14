import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { title, url, type } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const updated = db.addMedia(
      id,
      title,
      url || '',
      type || 'general'
    );
    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const d1 = getD1Database();
    if (d1 && updated.userId) {
      await d1Store.saveOrder(d1, { ...updated, userId: updated.userId });
    }

    return NextResponse.json({ success: true, gallery: updated.gallery });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
