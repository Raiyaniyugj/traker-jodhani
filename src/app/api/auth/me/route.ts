import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('trackerz_session')?.value;
  const settings = db.getSettings();

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      return NextResponse.json({
        user: parsed,
        settings,
      });
    } catch (e) {
      // ignore
    }
  }

  // Return default admin profile
  return NextResponse.json({
    user: {
      id: 'user-1',
      name: settings.ownerName || 'Dhiren Bhagvanbhai Savaliya',
      email: settings.email || 'valamdesignindia+0@gmail.com',
      role: 'Admin',
    },
    settings,
  });
}
