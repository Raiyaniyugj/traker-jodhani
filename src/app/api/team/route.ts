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

    let users = db.getUsers(workspaceId);
    if (d1) {
      const d1Users = await d1Store.getUsers(d1, workspaceId);
      if (d1Users && d1Users.length > 0) users = d1Users;
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Team GET error:', error);
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
    const { name, email, role } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const newUser = db.addUser(name.trim(), cleanEmail, (role || 'Admin') as Role, undefined, workspaceId);

    const d1 = getD1Database();
    if (d1) {
      await d1Store.saveUser(d1, {
        id: newUser.id,
        ownerId: workspaceId,
        name: name.trim(),
        email: cleanEmail,
        role: newUser.role,
        createdAt: newUser.createdAt,
      });
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Team POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
