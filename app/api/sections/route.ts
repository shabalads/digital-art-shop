// app/api/sections/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// GET all sections (with product counts)
export async function GET() {
  const { data: sections, error } = await supabaseAdmin
    .from('sections')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get product counts per section
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('section_ids')
    .eq('active', true)
    .is('deleted_at', null);

  const counts: Record<string, number> = {};
  (products || []).forEach((p: any) => {
    (p.section_ids || []).forEach((sid: string) => {
      counts[sid] = (counts[sid] || 0) + 1;
    });
  });

  const sectionsWithCounts = (sections || []).map((s: any) => ({
    ...s,
    product_count: counts[s.id] || 0,
  }));

  return NextResponse.json({ sections: sectionsWithCounts });
}

// POST — create section
export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const slug = toSlug(name.trim());

  // Get max sort_order
  const { data: existing } = await supabaseAdmin
    .from('sections')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const sort_order = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from('sections')
    .insert({ name: name.trim(), slug, sort_order })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ section: data });
}

// PATCH — rename or reorder section
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, sort_order } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updates: any = {};
  if (name !== undefined) { updates.name = name.trim(); updates.slug = toSlug(name.trim()); }
  if (sort_order !== undefined) updates.sort_order = sort_order;

  const { data, error } = await supabaseAdmin
    .from('sections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ section: data });
}

// DELETE — remove section (does not affect products)
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Remove this section id from all products
  const { data: affected } = await supabaseAdmin
    .from('products')
    .select('id, section_ids')
    .contains('section_ids', [id]);

  if (affected?.length) {
    await Promise.all(affected.map((p: any) =>
      supabaseAdmin.from('products').update({
        section_ids: (p.section_ids || []).filter((sid: string) => sid !== id)
      }).eq('id', p.id)
    ));
  }

  const { error } = await supabaseAdmin.from('sections').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}