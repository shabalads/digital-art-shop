// app/api/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const q = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = supabaseAdmin
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (category && category !== 'all') {
    query = query.eq('category', category.toLowerCase());
  }

  if (q) {
    query = query.ilike('title', `%${q}%`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  const { data, error } = await supabaseAdmin
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}