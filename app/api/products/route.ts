// app/api/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const category = searchParams.get('category');
  const q = searchParams.get('q');
  const badge = searchParams.get('badge');
  const tag = searchParams.get('tag');
const section = searchParams.get('section'); // ← new
  const room = searchParams.get('room'); // ← new: filter by room (Bathroom, Bedroom, Kitchen, etc.)
  const relatedTo = searchParams.get('related_to');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 2000);

  if (relatedTo) {
    const { data: sourceProduct, error: sourceError } = await supabaseAdmin
      .from('products')
      .select('related_product_ids')
      .eq('id', relatedTo)
      .single();

    if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });

    const manualIds: string[] = sourceProduct?.related_product_ids || [];

    if (manualIds.length > 0) {
      const { data: relatedData, error: relatedError } = await supabaseAdmin
        .from('products')
        .select('*')
        .in('id', manualIds)
        .eq('active', true)
        .is('deleted_at', null);

      if (relatedError) return NextResponse.json({ error: relatedError.message }, { status: 500 });

      const byId = new Map((relatedData || []).map((p: any) => [p.id, p]));
      const ordered = manualIds.map(mid => byId.get(mid)).filter(Boolean);
      return NextResponse.json({ products: ordered });
    }

    const { data: fuzzyRelated, error: fuzzyError } = await supabaseAdmin.rpc('related_products_by_similarity', {
      product_id: relatedTo,
      result_limit: 4,
    });

    if (fuzzyError) return NextResponse.json({ error: fuzzyError.message }, { status: 500 });
    return NextResponse.json({ products: fuzzyRelated || [] });
  }

  if (id) {
    const { data, error } = await supabaseAdmin
      .from('products').select('*').eq('id', id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: [data] });
  }

  const showTrashed = searchParams.get('trashed') === 'true';

let query = supabaseAdmin
    .from('products').select('*')
    .order('home_sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (showTrashed) {
    query = query.not('deleted_at', 'is', null);
  } else {
    query = query.eq('active', true).is('deleted_at', null);
  }

  if (category && category !== 'all') query = query.eq('category', category.toLowerCase());
  if (badge) query = query.eq('badge', badge);
  if (tag) query = query.or(`tags.cs.{${tag}},badge.eq.${tag}`);
  if (section) query = query.contains('section_ids', [section]); // ← new
  if (room) query = query.eq('room', room); // ← new
  // Multi-word queries used to be matched as ONE contiguous phrase
  // (title.ilike.%sardine painting%), which only matches if those exact
  // words appear adjacent, in that order, in the title/description. A real
  // product titled "Sardines Retro Fish Art Print" would never match a
  // "sardine painting" search under that logic, even though it's obviously
  // the right product — confirmed via real data 2026-07-27 (11 real
  // "sardine" products exist, none contains "sardine painting" as a single
  // substring). Fixed: split on whitespace, require EVERY word to appear
  // SOMEWHERE in title or description, in any order/position — each .or()
  // call below adds its own (title ilike OR description ilike) group, and
  // multiple .or() calls are ANDed together by Postgrest, so this reads as
  // "word1 matches AND word2 matches AND ...".
  //
  // STOPWORDS: a bare filler word like "of" or a single digit like "3" —
  // e.g. from a "set of 3" search — still gets its own AND'd ILIKE clause
  // if included, and %of% / %3% match almost everything: "of" is a
  // substring of "coffee", "office", "waterproof", etc., and a lone "3"
  // matches any size/DPI figure buried in a description (A3, 12x18, 300
  // DPI...). Confirmed live: "set of 3" was returning 475 of 554 products —
  // essentially the whole catalog, because "of" and "3" alone barely
  // filtered anything once ANDed with "set". Dropping common filler words
  // and words under 3 characters before building the AND clause fixes
  // this; if that empties the query entirely (e.g. the whole search was
  // just "of" or "3"), fall back to the original words rather than
  // searching for nothing.
  if (q) {
    const STOPWORDS = new Set(['a', 'an', 'the', 'of', 'for', 'and', 'or', 'in', 'on', 'with', 'to']);
    const allWords = q.trim().split(/\s+/).filter(Boolean);
    const words = allWords.filter((w) => w.length > 2 && !STOPWORDS.has(w.toLowerCase()));
    for (const word of words.length > 0 ? words : allWords) {
      const escaped = word.replace(/[%_]/g, '\\$&');
      query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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