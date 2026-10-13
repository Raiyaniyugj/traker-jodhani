import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { Role } from '@/lib/types';

export async function GET() {
  try {
    const users = db.getUsers();
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, role } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }
    const newUser = db.addUser(name.trim(), email.trim(), (role || 'Admin') as Role);
    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
