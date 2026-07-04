// app/api/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const category = searchParams.get('category');
  const q = searchParams.get('q');
  const badge = searchParams.get('badge');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('products').select('*').eq('id', id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: [data] });
  }

const showTrashed = searchParams.get('trashed') === 'true';

  let query = supabaseAdmin
    .from('products').select('*')
    .order('created_at', { ascending: false }).limit(limit);

  if (showTrashed) {
    query = query.not('deleted_at', 'is', null);
  } else {
    query = query.eq('active', true).is('deleted_at', null);
  }

if (category && category !== 'all') query = query.eq('category', category.toLowerCase());
  if (badge) query = query.eq('badge', badge);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If no results and there was a search query, try fuzzy match via RPC
  if (q && (!data || data.length === 0)) {
    const { data: fuzzyData } = await supabaseAdmin.rpc('search_products_fuzzy', { search_term: q, result_limit: limit });
    if (fuzzyData && fuzzyData.length > 0) {
      return NextResponse.json({ products: fuzzyData });
    }
  }

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

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  const permanent = new URL(req.url).searchParams.get('permanent');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  if (permanent === 'true') {
    const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Soft delete — move to trash
    const { error } = await supabaseAdmin
      .from('products')
      .update({ deleted_at: new Date().toISOString(), active: false })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}