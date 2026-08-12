// app/api/admin/match-reviews/resolve/route.ts
//
// Saves the shop owner's pick from /admin/match-reviews. Only ever sets
// product_id — never touches quote/rating/product_name/etc.
//
// Overwrites are allowed on purpose: the tool's "← Back" feature lets the
// owner revisit a review they already matched this session and pick a
// different candidate if they got it wrong, which requires updating a row
// that already has a product_id set. The 37 already-confirmed matches from
// the migration are still never touched by normal forward use of this tool,
// since the queue endpoint only ever returns rows where product_id is null
// — those rows only get revisited if the owner explicitly navigates back to
// them via history within the same session (impossible, since they were
// never in this session's queue/history to begin with).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const reviewId = body?.reviewId;
  const productId = body?.productId;

  if (!reviewId || typeof productId !== 'string' || !productId) {
    return NextResponse.json({ error: 'Missing reviewId or productId' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('customer_reviews')
    .update({ product_id: productId })
    .eq('id', reviewId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
