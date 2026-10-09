// app/api/orders/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';
import { requireAdmin } from '../../lib/adminAuth';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data });
}