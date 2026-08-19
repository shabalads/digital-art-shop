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
  const reviews = data || [];

  // customer_reviews.product_id has no FK constraint to products.id on
  // purpose (see 20260727b_add_product_id_to_reviews.sql — some matched
  // products have since been deleted), so PostgREST can't embed `products`
  // via the usual `.select('*, products(title))` shorthand. Fetch the
  // linked products separately and merge in their CURRENT live title as
  // `product_title` — customer_reviews.product_name is a frozen historical
  // Etsy listing title and, for multi-item orders, can be several items'
  // titles concatenated with " / " (see MatchReviewsClient/import script
  // comments). Showing that raw field once a review IS confidently linked
  // to one specific product is what caused cards to display things like
  // "Sardine Painting / Vibrant Mountains Landscape Wall Art / Colorful" —
  // product_title is the fix; product_name remains only as the fallback
  // for unmatched (product_id IS NULL) reviews.
  const productIds = Array.from(new Set(reviews.map((r) => r.product_id).filter((id): id is string => Boolean(id))));

  let titleById = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: products } = await supabaseAdmin.from('products').select('id, title').in('id', productIds);
    titleById = new Map((products || []).map((p) => [p.id, p.title]));
  }

  const reviewsWithProductTitle = reviews.map((r) => ({
    ...r,
    product_title: r.product_id ? titleById.get(r.product_id) ?? null : null,
  }));

  return NextResponse.json({ reviews: reviewsWithProductTitle });
}
