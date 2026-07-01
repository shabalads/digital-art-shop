import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '../../lib/resend';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await sendEmail(body);
  return NextResponse.json(result);
}
