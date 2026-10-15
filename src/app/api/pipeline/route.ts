import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';
import { PipelineStage, Role } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const workspaceId = session.ownerId || session.userId;
    const d1 = getD1Database();

    let stages: PipelineStage[] = [];
    if (d1) {
      stages = await d1Store.getStages(d1, workspaceId);
    }
    if (!stages || stages.length === 0) {
      stages = db.getStages(workspaceId);
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

    const d1 = getD1Database();
    let currentStages: PipelineStage[] = [];
    if (d1) {
      currentStages = await d1Store.getStages(d1, workspaceId);
    }
    if (!currentStages || currentStages.length === 0) {
      currentStages = db.getStages(workspaceId);
    }

    const newStage: PipelineStage = {
      id: `stg_${workspaceId}_${Date.now()}`,
      userId: workspaceId,
      name: name.trim(),
      order: currentStages.length + 1,
      roles: roles && roles.length ? roles : (['Admin'] as Role[]),
    };

    const updatedStages = [...currentStages, newStage];
    if (d1) {
      await d1Store.setStages(d1, workspaceId, updatedStages);
    }
    db.saveStages(workspaceId, updatedStages);

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

    const cleanStages: PipelineStage[] = stages.map((s, idx) => ({
      ...s,
      userId: workspaceId,
      order: idx + 1,
    }));

    const d1 = getD1Database();
    if (d1) {
      await d1Store.setStages(d1, workspaceId, cleanStages);
    }
    db.saveStages(workspaceId, cleanStages);

    return NextResponse.json({ success: true, stages: cleanStages });
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
      } catch {
        // body might be empty
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Stage ID is required' }, { status: 400 });
    }

    const d1 = getD1Database();
    let stages: PipelineStage[] = [];
    if (d1) {
      stages = await d1Store.getStages(d1, workspaceId);
    }
    if (!stages || stages.length === 0) {
      stages = db.getStages(workspaceId);
    }

    if (stages.length <= 1) {
      return NextResponse.json({ error: 'Cannot delete the only remaining stage.' }, { status: 400 });
    }

    const remaining = stages
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, order: idx + 1 }));

    if (d1) {
      await d1Store.setStages(d1, workspaceId, remaining);
    }
    db.saveStages(workspaceId, remaining);

    return NextResponse.json({ success: true, stages: remaining });
  } catch (error: any) {
    console.error('Pipeline DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
