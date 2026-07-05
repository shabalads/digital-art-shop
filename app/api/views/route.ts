// app/api/views/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';

export async function POST(req: NextRequest) {
  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });

  await supabaseAdmin.from('product_views').insert({ product_id: productId });
  return NextResponse.json({ ok: true });
}