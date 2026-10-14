import { NextRequest, NextResponse } from 'next/server';
import { Role } from './types';

export interface SessionUser {
  userId: string;
  ownerId: string;
  email: string;
  name: string;
  role: Role;
}

const SESSION_COOKIE_NAME = 'trackerz_session';

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + ':trackerz_salt_2026');
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function getSessionUser(req: NextRequest): SessionUser | null {
  try {
    const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) return null;
    const parsed = JSON.parse(cookie);
    if (!parsed || !parsed.userId) return null;
    return {
      userId: parsed.userId,
      ownerId: parsed.ownerId || parsed.userId,
      email: parsed.email || '',
      name: parsed.name || '',
      role: parsed.role || 'Admin',
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(
  response: NextResponse,
  user: { id: string; ownerId?: string; email: string; name: string; role: Role }
) {
  const sessionData: SessionUser = {
    userId: user.id,
    ownerId: user.ownerId || user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    path: '/',
    httpOnly: false, // Accessible to client-side scripts if needed
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE_NAME);
}
