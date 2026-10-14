import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';
import { Role } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const d1 = getD1Database();

    let stages = db.getStages(workspaceId);
    if (d1) {
      const d1Stages = await d1Store.getStages(d1, workspaceId);
      if (d1Stages && d1Stages.length > 0) stages = d1Stages;
    }
    return NextResponse.json({ stages });
  } catch (error: any) {
    console.error('Pipeline GET error:', error);
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
    const { name, roles } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Stage name is required' }, { status: 400 });
    }

    const newStage = db.addStage(
      workspaceId,
      name.trim(),
      roles && roles.length ? roles : (['Admin'] as Role[])
    );
    const d1 = getD1Database();
    if (d1) {
      await d1Store.setStages(d1, workspaceId, db.getStages(workspaceId));
    }
    return NextResponse.json({ success: true, stage: newStage });
  } catch (error: any) {
    console.error('Pipeline POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const { stages } = await req.json();
    if (!Array.isArray(stages)) {
      return NextResponse.json({ error: 'Stages array is required' }, { status: 400 });
    }

    const saved = db.saveStages(workspaceId, stages);
    const d1 = getD1Database();
    if (d1) {
      await d1Store.setStages(d1, workspaceId, saved);
    }
    return NextResponse.json({ success: true, stages: saved });
  } catch (error: any) {
    console.error('Pipeline PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch (e) {
        // body might be empty
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Stage ID is required' }, { status: 400 });
    }

    const stages = db.getStages(workspaceId);
    if (stages.length <= 1) {
      return NextResponse.json({ error: 'Cannot delete the only remaining stage.' }, { status: 400 });
    }

    const success = db.deleteStage(workspaceId, id);
    if (!success) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    const remaining = db.getStages(workspaceId);
    const d1 = getD1Database();
    if (d1) {
      await d1Store.setStages(d1, workspaceId, remaining);
    }

    return NextResponse.json({ success: true, stages: remaining });
  } catch (error: any) {
    console.error('Pipeline DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
