import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const d1 = getD1Database();

    let settings = db.getSettings(workspaceId);
    let webhookLogs = db.getWebhookLogs(workspaceId);

    if (d1) {
      const d1Settings = await d1Store.getSettings(d1, workspaceId);
      if (d1Settings) settings = d1Settings;
      const d1Logs = await d1Store.getWebhookLogs(d1, workspaceId);
      if (d1Logs) webhookLogs = d1Logs;
    }

    return NextResponse.json({ settings, webhookLogs });
  } catch (error: any) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const body = await req.json();

    const updated = db.updateSettings(workspaceId, body);
    const d1 = getD1Database();
    if (d1) {
      await d1Store.updateSettings(d1, workspaceId, updated);
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
