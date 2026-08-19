// app/api/admin/match-reviews/queue/route.ts
//
// Live queue for the /admin/match-reviews tool. Always queries Supabase
// directly (never a static CSV) so it reflects the current state of
// customer_reviews and products, including matches saved seconds ago by
// /api/admin/match-reviews/resolve.
//
// ?type=photo | text | christmas selects which of the three queues/tabs to
// return:
//   - photo:     image_path NOT NULL, not Christmas/holiday-themed
//   - text:      image_path IS NULL, not Christmas/holiday-themed
//   - christmas: ANY unresolved review (photo or text) that IS
//                Christmas/holiday-themed — pulled out of both of the above
//                so the owner can work through non-seasonal reviews without
//                the holiday backlog interleaved, and deal with the
//                Christmas batch separately later.
// Defaults to 'photo' if omitted/unrecognized.
//
// A single unfiltered fetch of every unresolved row (product_id IS NULL) is
// done once per request, then split three ways in memory — this keeps the
// three tabs' counts guaranteed consistent with each other (no risk of a
// race between separately-issued count queries) and avoids querying
// Supabase 4 times like the old photo/text-only version did.
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

// Word-boundary matched, not plain substring — a naive .includes('elf')
// would false-positive on "myself"/"shelf", and .includes('advent') on
// "adventure". \b on both ends of each keyword (spaces inside multi-word
// phrases like "candy cane" are literal) avoids that while still catching
// the keyword as a standalone word/phrase anywhere in the text.
const CHRISTMAS_KEYWORDS = [
  'christmas', 'xmas', 'holiday', 'santa', 'snowman', 'nativity',
  'winter village', 'candy cane', 'reindeer', 'nutcracker', 'advent',
  'festive', 'sleigh', 'ornament', 'wreath', 'mistletoe', 'caroling',
  'elf', 'north pole',
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CHRISTMAS_RE = new RegExp(
  CHRISTMAS_KEYWORDS.map((kw) => `\\b${escapeRegex(kw)}\\b`).join('|'),
  'i'
);

function isChristmas(row: { product_name: string | null; quote: string | null }): boolean {
  const text = `${row.product_name || ''} ${row.quote || ''}`;
  return CHRISTMAS_RE.test(text);
}

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
  const typeParam = searchParams.get('type');
  const type: 'photo' | 'text' | 'christmas' =
    typeParam === 'text' ? 'text' : typeParam === 'christmas' ? 'christmas' : 'photo';

  const allReviewsQuery = (from: number, to: number) =>
    supabaseAdmin
      .from('customer_reviews')
      .select('id, image_path, reviewer_name, product_name, quote, rating, review_date, order_id')
      .is('product_id', null)
      .order('id', { ascending: true })
      .range(from, to);

  const [reviewsResult, productsRes] = await Promise.all([
    fetchAllRows(allReviewsQuery),
    supabaseAdmin.from('products').select('id, title, image_url, price_digital').is('deleted_at', null),
  ]);

  if (reviewsResult.error) return NextResponse.json({ error: reviewsResult.error }, { status: 500 });
  if (productsRes.error) return NextResponse.json({ error: productsRes.error.message }, { status: 500 });

  const products = productsRes.data || [];
  const allRows = reviewsResult.data;

  const photoRows = allRows.filter((r) => r.image_path != null && !isChristmas(r));
  const textRows = allRows.filter((r) => r.image_path == null && !isChristmas(r));
  const christmasRows = allRows.filter((r) => isChristmas(r));

  const rowsForType = type === 'photo' ? photoRows : type === 'text' ? textRows : christmasRows;

  const queue = rowsForType.map((r) => ({
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
    counts: { photo: photoRows.length, text: textRows.length, christmas: christmasRows.length },
  });
}
