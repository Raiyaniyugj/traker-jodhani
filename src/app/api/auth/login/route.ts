import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const settings = db.getSettings();
    const users = db.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || {
      id: 'user-admin',
      name: settings.ownerName || 'Admin User',
      email: email,
      role: 'Admin',
      createdAt: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      user,
      redirect: '/dashboard',
    });

    response.cookies.set('trackerz_session', JSON.stringify({ userId: user.id, email: user.email, name: user.name, role: user.role }), {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
