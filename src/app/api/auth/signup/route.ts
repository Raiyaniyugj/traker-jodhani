import { NextRequest, NextResponse } from 'next/server';
import { db, TEMPLATE_STAGES } from '@/lib/store';
import { getD1Database, d1Store } from '@/lib/d1';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { PipelineStage, WorkspaceSettings } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { companyName, fullName, phone, email, password } = await req.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const d1 = getD1Database();

    // Check if user already exists
    if (d1) {
      const existing = await d1Store.getUserByEmail(d1, cleanEmail);
      if (existing) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 400 }
        );
      }
    } else {
      const existing = db.getUserByEmail(cleanEmail);
      if (existing) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in.' },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Add user to local store
    const newUser = db.addUser(fullName.trim(), cleanEmail, 'Admin', hashedPassword, userId, userId);

    // Initialize workspace settings
    const company = companyName?.trim() || `${fullName.trim()}'s Atelier`;
    const initialSettings: WorkspaceSettings = {
      userId,
      companyName: company,
      ownerName: fullName.trim(),
      email: cleanEmail,
      phone: phone?.trim() || '',
      currency: '$',
      shopify: {
        shopDomain: '',
        webhookSecret: '',
        adminAccessToken: '',
        isConnected: false,
        lastSyncAt: '',
        autoSync: true,
      },
    };
    db.updateSettings(userId, initialSettings);

    // Initialize 9 pipeline stages
    const initialStages: PipelineStage[] = TEMPLATE_STAGES.map((t, idx) => ({
      id: `stg_${userId}_${idx + 1}`,
      userId,
      name: t.name,
      order: t.order,
      roles: t.roles,
    }));
    db.saveStages(userId, initialStages);

    // Save into D1 database if active
    if (d1) {
      await d1Store.saveUser(d1, {
        id: userId,
        ownerId: userId,
        name: fullName.trim(),
        email: cleanEmail,
        role: 'Admin',
        password: hashedPassword,
        createdAt: new Date().toISOString(),
      });
      await d1Store.updateSettings(d1, userId, initialSettings);
      await d1Store.setStages(d1, userId, initialStages);
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        ownerId: userId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      redirect: '/dashboard',
    });

    setSessionCookie(response, {
      id: userId,
      ownerId: userId,
      email: cleanEmail,
      name: fullName.trim(),
      role: 'Admin',
    });

    return response;
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message || 'Signup failed' }, { status: 500 });
  }
}
