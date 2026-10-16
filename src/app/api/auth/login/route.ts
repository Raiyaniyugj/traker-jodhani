import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { hashPassword, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password, rememberMe } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const d1 = getD1Database();

    let user: any = null;
    if (d1) {
      user = await d1Store.getUserByEmail(d1, cleanEmail);
    }
    if (!user) {
      user = db.getUserByEmail(cleanEmail);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password. Please check your credentials or create an account.' },
        { status: 401 }
      );
    }

    // Verify password
    if (user.password) {
      const inputHash = await hashPassword(password);
      if (inputHash !== user.password && password !== user.password) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
    }

    const ownerId = user.ownerId || user.id;

    const sessionUser = {
      userId: user.id,
      ownerId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = Buffer.from(JSON.stringify(sessionUser)).toString('base64');

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        ownerId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      redirect: '/dashboard',
    });

    setSessionCookie(
      response,
      {
        id: user.id,
        ownerId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      rememberMe !== false
    );

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}
