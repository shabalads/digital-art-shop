// app/api/reviews/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
  const productId = searchParams.get('product_id');
  const type = searchParams.get('type'); // 'photo' | 'text' | null (both)

  // review_date_parsed is only populated for the text-only import batch
  // (scripts/import-text-reviews.ts) — sorting it first, newest-first with
  // nulls pushed to the end, means those reviews (and any dated photo
  // reviews) surface within the default `limit` instead of being crowded
  // out by the original 100 photo reviews' low ids. Rows without a parsed
  // date (all 100 original photo reviews) keep their existing curated
  // display_order/id order as a fallback, unchanged from before.
  let query = supabaseAdmin
    .from('customer_reviews')
    .select('*')
    .order('review_date_parsed', { ascending: false, nullsFirst: false })
    .order('display_order', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit);

  // Optional filter used by the product page to show only reviews linked to
  // that specific product.
  if (productId) {
    query = query.eq('product_id', productId);
  }

  // Optional filter used by CustomerReviewsGallery / ProductReviews to fetch
  // photo and text-only reviews as two separate groups (photos shown first,
  // text-only after) — image_path IS NULL remains the sole discriminator,
  // no schema change. Omitted entirely returns both, unchanged from before.
  if (type === 'photo') {
    query = query.not('image_path', 'is', null);
  } else if (type === 'text') {
    query = query.is('image_path', null);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data || [] });
}
