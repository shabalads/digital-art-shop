// app/api/admin/match-reviews/queue/route.ts
//
// Live queue for the /admin/match-reviews tool. Always queries Supabase
// directly (never a static CSV) so it reflects the current state of
// customer_reviews and products, including matches saved seconds ago by
// /api/admin/match-reviews/resolve.
//
// ?type=photo | text (required-ish; defaults to 'photo' if omitted) selects
// which of the two review batches to queue — the original 100 photo
// reviews (image_path NOT NULL) or the ~1,191-row text-only import
// (image_path NULL). Kept as two separate queues/tabs in the admin UI so
// the owner can work through one batch at a time instead of them being
// interleaved; image_path IS NULL remains the only discriminator, no
// schema change.
//
// PAGINATION: PostgREST (Supabase's query layer) caps any single response
// at 1000 rows by default, silently — a plain `.select()` past that just
// truncates with no error. With ~1,150+ unmatched text reviews now in the
// table, a single unpaged query was undercounting ("1000 of 1000
// remaining" when the real number was 1,171+). fetchAllRows() below pages
// through with `.range()` until a batch comes back short of the page size.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';
import { topCandidates } from '../../../../lib/reviewMatch';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ data: T[]; error: string | null }> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) return { data: all, error: error.message };
    const batch = data || [];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { data: all, error: null };
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') === 'text' ? 'text' : 'photo';

  const reviewsQuery = (from: number, to: number) => {
    let q = supabaseAdmin
      .from('customer_reviews')
      .select('id, image_path, reviewer_name, product_name, quote, rating, review_date, order_id')
      .is('product_id', null)
      .order('id', { ascending: true })
      .range(from, to);
    q = type === 'photo' ? q.not('image_path', 'is', null) : q.is('image_path', null);
    return q;
  };

  const [reviewsResult, productsRes, photoCountRes, textCountRes] = await Promise.all([
    fetchAllRows(reviewsQuery),
    supabaseAdmin.from('products').select('id, title, image_url, price_digital').is('deleted_at', null),
    supabaseAdmin.from('customer_reviews').select('id', { count: 'exact', head: true }).is('product_id', null).not('image_path', 'is', null),
    supabaseAdmin.from('customer_reviews').select('id', { count: 'exact', head: true }).is('product_id', null).is('image_path', null),
  ]);

  if (reviewsResult.error) return NextResponse.json({ error: reviewsResult.error }, { status: 500 });
  if (productsRes.error) return NextResponse.json({ error: productsRes.error.message }, { status: 500 });
  if (photoCountRes.error) return NextResponse.json({ error: photoCountRes.error.message }, { status: 500 });
  if (textCountRes.error) return NextResponse.json({ error: textCountRes.error.message }, { status: 500 });

  const products = productsRes.data || [];
  const queue = reviewsResult.data.map((r) => ({
    ...r,
    // product_name is null for text-only reviews whose order wasn't found in
    // the Etsy CSV export (no historical title at all) — topCandidates on an
    // empty string is safe (every candidate just scores 0), the admin UI
    // shows "no historical product name" and relies on search instead.
    candidates: topCandidates(r.product_name || '', products),
  }));

  return NextResponse.json({
    queue,
    total: queue.length,
    counts: { photo: photoCountRes.count ?? 0, text: textCountRes.count ?? 0 },
  });
}
