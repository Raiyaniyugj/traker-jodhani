import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';

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
      url || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80',
      type || 'general'
    );
    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, gallery: updated.gallery });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
