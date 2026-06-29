// app/api/orders/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data });
}