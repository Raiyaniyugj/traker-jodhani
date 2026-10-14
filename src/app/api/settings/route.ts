import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';

export async function GET() {
  try {
    const d1 = getD1Database();
    let settings = db.getSettings();
    let webhookLogs = db.getWebhookLogs();

    if (d1) {
      const d1Settings = await d1Store.getSettings(d1);
      if (d1Settings) settings = d1Settings;
      const d1Logs = await d1Store.getWebhookLogs(d1);
      if (d1Logs && d1Logs.length > 0) webhookLogs = d1Logs;
    }

    return NextResponse.json({ settings, webhookLogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = db.updateSettings(body);
    const d1 = getD1Database();
    if (d1) {
      await d1Store.updateSettings(d1, updated);
    }
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
