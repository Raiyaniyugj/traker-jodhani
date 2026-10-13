import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET() {
  try {
    const settings = db.getSettings();
    const webhookLogs = db.getWebhookLogs();
    return NextResponse.json({ settings, webhookLogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = db.updateSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
