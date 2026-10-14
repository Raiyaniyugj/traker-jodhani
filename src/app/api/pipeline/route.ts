import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { Role } from '@/lib/types';

export async function GET() {
  try {
    const stages = db.getStages();
    return NextResponse.json({ stages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, roles } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Stage name is required' }, { status: 400 });
    }
    const newStage = db.addStage(name.trim(), roles && roles.length ? roles : (['Admin'] as Role[]));
    return NextResponse.json({ success: true, stage: newStage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { stages } = await req.json();
    if (!Array.isArray(stages)) {
      return NextResponse.json({ error: 'Stages array is required' }, { status: 400 });
    }
    const saved = db.saveStages(stages);
    return NextResponse.json({ success: true, stages: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
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

    const stages = db.getStages();
    if (stages.length <= 1) {
      return NextResponse.json({ error: 'Cannot delete the only remaining stage.' }, { status: 400 });
    }

    const success = db.deleteStage(id);
    if (!success) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, stages: db.getStages() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
