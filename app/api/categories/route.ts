// app/api/categories/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name || !name.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const nextOrder = existing && existing[0] ? existing[0].sort_order + 1 : 0;

  let slug = slugify(name);
  const { data: clash } = await supabaseAdmin.from('categories').select('id').eq('slug', slug);
  if (clash && clash.length > 0) slug = `${slug}-${Date.now().toString(36)}`;

  const { data, error } = await supabaseAdmin
    .from('categories').insert({ name: name.trim(), slug, sort_order: nextOrder }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, renameProducts, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data: oldCategory } = await supabaseAdmin.from('categories').select('slug').eq('id', id).single();
  const oldSlug = oldCategory?.slug;

  if (updates.name) updates.slug = slugify(updates.name);

  const { data, error } = await supabaseAdmin
    .from('categories').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If slug changed and caller asked us to, update existing products to match
  if (renameProducts && oldSlug && updates.slug && oldSlug !== updates.slug) {
    await supabaseAdmin.from('products').update({ category: updates.slug }).eq('category', oldSlug);
  }

  return NextResponse.json({ category: data });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}