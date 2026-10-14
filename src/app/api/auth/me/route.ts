import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = getSessionUser(req);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const workspaceId = session.ownerId || session.userId;
  const d1 = getD1Database();

  let settings = db.getSettings(workspaceId);
  if (d1) {
    const d1Settings = await d1Store.getSettings(d1, workspaceId);
    if (d1Settings) settings = d1Settings;
  }

  return NextResponse.json({
    user: session,
    settings,
  });
}
