import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, redirect: '/login' });
  response.cookies.delete('trackerz_session');
  return response;
}
