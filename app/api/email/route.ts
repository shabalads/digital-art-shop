import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '../../lib/resend';
import { requireAdmin } from '../../lib/adminAuth';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const result = await sendEmail(body);
  return NextResponse.json(result);
}
