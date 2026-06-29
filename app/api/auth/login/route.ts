// app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.DASHBOARD_PASSWORD || 'itemssy2026';

  if (password !== correct) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('dashboard_auth', correct, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}