import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const { companyName, fullName, phone, email } = await req.json();

    if (!email || !fullName) {
      return NextResponse.json({ error: 'Company, name, and email are required' }, { status: 400 });
    }

    // Update settings with newly created workspace
    db.updateSettings({
      companyName: companyName || 'My Jewelry Workshop',
      ownerName: fullName,
      phone: phone || '',
      email: email,
    });

    const newUser = db.addUser(fullName, email, 'Admin');

    const response = NextResponse.json({
      success: true,
      user: newUser,
      redirect: '/dashboard',
    });

    response.cookies.set('trackerz_session', JSON.stringify({ userId: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role }), {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
