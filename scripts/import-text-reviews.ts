// scripts/import-text-reviews.ts
//
// Bulk-imports the text-only (no photo) Etsy reviews into the same
// customer_reviews table used by the original 100 photo reviews, fuzzy-
// matching each one against live products the same way the original batch
// was matched (see app/lib/reviewMatch.ts).
//
// ============================================================================
// DATA PIPELINE (already run, output checked in)
// ============================================================================
// scripts/data/text-reviews-joined.json was produced by joining the shop's
// full review export (reviews.json) against three Etsy "sold order items"
// CSV exports (2023/2024/2025) on Order ID, to recover each review's
// historical listing title (Item Name). Of 1,302 total reviews: 85 were
// already photo reviews (excluded), 18 were rated below 3 stars (excluded
// entirely per shop-owner request — never imported, not even unmatched),
// 8 were excluded for backhanded/sarcastic/quality-complaint tone despite a
// high star rating (see scripts/data/flagged-tone-excluded.json for the
// full list — AI-generated accusations, "not what I expected", "not in
// love", and unresolved print-quality complaints), leaving 1,191 rows.
//
// ============================================================================
// THE BUG THIS SCRIPT FIXES (previous version over-matched)
// ============================================================================
// The first version of this script picked, for each review, whichever of
// its order's candidate historical titles ("etsy_items") scored best
// against the live catalog — including on orders with MULTIPLE reviews.
// Etsy's review export doesn't say which item in a multi-item order a given
// review is for, so when an order had say 2 items and 2 reviews, both
// reviews got the SAME winning anchor, even if only one of them was
// actually about that item. E.g. order 3875858126 contains a "Nursery
// Pastel Landscape Print" among its items; ALL of that order's reviews —
// including ones about completely different items in the same order — got
// pulled toward whichever candidate that nursery title matched best,
// producing "magnet" products that absorbed unrelated reviews. This wasn't
// the review's quote text leaking into scoring (it never was — matching has
// always been historical-title-to-current-title only); it was applying one
// order-level guess to every review sharing that order.
//
// Fix: `order_review_count` (computed from the ORIGINAL, unfiltered review
// export — see the join step above) tells us how many reviews existed for
// an order before any filtering. Any review whose order has BOTH more than
// one review AND more than one distinct item is fundamentally ambiguous —
// there's no data that says which item it's for — so it is NEVER
// auto-matched, full stop, regardless of score. It still gets a
// product_name (all the order's item titles joined together, same
// "A / B / C (N items, one order)" convention the original 100-review
// dataset already used for this exact situation — see
// app/lib/reviewMatch.ts's primaryReviewName()) so the admin tool has
// useful context, but product_id stays null and it lands in the normal
// manual queue like everything else that isn't confidently matched.
//
// Reviews on single-review orders (whether that order has one item or
// several) are unaffected by this bug — there's no sibling review to bleed
// onto — and are still matched by trying every candidate anchor title and
// keeping the best-scoring (anchor, product) pairing.
//
// ============================================================================
// MATCHING THRESHOLD + SALES TIEBREAKER
// ============================================================================
// Auto-match only when the best candidate's score >= 1.2 (see
// app/lib/reviewMatch.ts's comment block for why — requires the literal-
// substring bonus, not just word overlap).
//
// When, for a single anchor, the top two candidate products both score
// >= PLAUSIBLE_FLOOR (0.9 — both are legitimately strong matches on their
// own, not just the least-bad of a weak field) and are within TIE_MARGIN
// (0.05) of each other, this is a genuine "which of these near-identical
// listings is it" tie — e.g. two very similarly-titled wildflower prints.
// Only in that specific situation, the candidate with more historical
// sales (SUM(quantity) from this site's own order_items table) wins the
// tie. This never lowers the bar for auto-matching and never fires when
// there's a single clear leader or when neither candidate is already a
// strong match on its own.
//
// ============================================================================
// HOW TO RUN
// ============================================================================
//   1. Run supabase/migrations/20260729_text_reviews_support.sql first
//      (Supabase SQL Editor) — makes image_path/source_image/product_name
//      nullable and adds review_date_parsed. Safe to re-run.
//   2. export $(grep -v '^#' .env.local | grep '=' | xargs)
//   3. npx tsx scripts/import-text-reviews.ts --dry-run
//        Writes scripts/data/auto-matches-preview.csv listing EVERY proposed
//        auto-match (review text, matched product, score, and now a "why"
//        column) so you can skim all of them before anything touches
//        Supabase. Nothing is written.
//   4. Once that looks right: npx tsx scripts/import-text-reviews.ts
//   5. Re-running is safe: rows already present (matched by order_id +
//      reviewer_name + quote) are skipped, so a partial or repeated run
//      won't create duplicates.
// ============================================================================

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { topCandidates, type ProductLite } from '../app/lib/reviewMatch';

const JOINED_PATH = path.join(__dirname, 'data', 'text-reviews-joined.json');
const PREVIEW_CSV_PATH = path.join(__dirname, 'data', 'auto-matches-preview.csv');
const DRY_RUN = process.argv.includes('--dry-run');
const AUTO_MATCH_THRESHOLD = 1.2;
const PLAUSIBLE_FLOOR = 0.9;
const TIE_MARGIN = 0.05;
const INSERT_BATCH_SIZE = 500;

interface EtsyItem {
  item_name: string;
  listing_id: string;
}

interface JoinedReview {
  order_id: string;
  reviewer: string | null;
  date_reviewed: string; // MM/DD/YYYY
  star_rating: number;
  message: string | null;
  etsy_items: EtsyItem[];
  order_review_count: number; // how many reviews this order had, pre-filtering
}

function formatDate(mdY: string): { display: string; iso: string } {
  const [mm, dd, yyyy] = mdY.split('/').map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  const display = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const iso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return { display, iso };
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// All distinct item names for this review's order, in the same
// "A / B / C (N items, one order)" display convention the original 100
// photo reviews already used (app/lib/reviewMatch.ts's primaryReviewName()
// knows how to parse this back out for live re-scoring in the admin tool).
// Dedupes by title text (not just listing_id) before building the display
// string. Some orders contain two different listing_ids that happen to
// share the exact same title (e.g. a near-duplicate/variant listing) — the
// earlier version showed that title twice, which just reads as a copy-paste
// glitch to a human skimming the admin tool. One distinct title = one entry.
function buildProductNameDisplay(items: EtsyItem[]): string | null {
  const distinctNames = Array.from(new Set(items.map((i) => i.item_name)));
  if (distinctNames.length === 0) return null;
  if (distinctNames.length === 1) return distinctNames[0];
  return `${distinctNames.join(' / ')} (${distinctNames.length} items, one order)`;
}

// Best (product, score) for a single anchor title, with the sales tiebreak
// applied only between two already-plausible, genuinely-close candidates.
function bestForAnchor(
  anchorTitle: string,
  products: ProductLite[],
  soldCount: Map<string, number>
): { id: string; title: string; score: number } | null {
  const top = topCandidates(anchorTitle, products, 3);
  if (top.length === 0) return null;

  const first = top[0];
  const second = top[1];

  if (
    second &&
    first.score >= PLAUSIBLE_FLOOR &&
    second.score >= PLAUSIBLE_FLOOR &&
    Math.abs(first.score - second.score) <= TIE_MARGIN
  ) {
    const firstSold = soldCount.get(first.id) ?? 0;
    const secondSold = soldCount.get(second.id) ?? 0;
    const winner = secondSold > firstSold ? second : first;
    return { id: winner.id, title: winner.title, score: winner.score };
  }

  return { id: first.id, title: first.title, score: first.score };
}

async function main() {
  if (!fs.existsSync(JOINED_PATH)) {
    console.error(`Not found: ${JOINED_PATH}`);
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL. Did you export .env.local?');
    process.exit(1);
  }

  const joined: JoinedReview[] = JSON.parse(fs.readFileSync(JOINED_PATH, 'utf-8'));
  console.log(`Loaded ${joined.length} joined reviews from ${path.relative(process.cwd(), JOINED_PATH)}.`);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('Fetching live products, existing customer_reviews, and order_items (for the sales tiebreaker)...');
  const [productsRes, existingRes, orderItemsRes] = await Promise.all([
    supabase.from('products').select('id, title, image_url, price_digital').is('deleted_at', null),
    supabase.from('customer_reviews').select('id, order_id, reviewer_name, quote'),
    supabase.from('order_items').select('product_id, quantity'),
  ]);

  if (productsRes.error) {
    console.error('Failed to fetch products:', productsRes.error.message);
    process.exit(1);
  }
  if (existingRes.error) {
    console.error('Failed to fetch existing customer_reviews:', existingRes.error.message);
    process.exit(1);
  }
  if (orderItemsRes.error) {
    console.error('Failed to fetch order_items:', orderItemsRes.error.message);
    process.exit(1);
  }

  const products: ProductLite[] = productsRes.data || [];
  const existing = existingRes.data || [];
  const soldCount = new Map<string, number>();
  for (const row of orderItemsRes.data || []) {
    const pid = (row as any).product_id;
    const qty = Number((row as any).quantity) || 0;
    if (!pid) continue;
    soldCount.set(pid, (soldCount.get(pid) ?? 0) + qty);
  }
  console.log(`  ${products.length} live products, ${existing.length} existing customer_reviews rows, sales data for ${soldCount.size} products.`);

  const existingKeys = new Set(existing.map((r) => `${r.order_id ?? ''}|${r.reviewer_name ?? ''}|${r.quote ?? ''}`));
  let nextId = existing.reduce((max, r) => Math.max(max, r.id), 0) + 1;

  let skippedAlreadyPresent = 0;
  let autoMatched = 0;
  let manualAmbiguousOrder = 0;
  let manualLowScore = 0;
  let manualNoAnchor = 0;

  const rowsToInsert: any[] = [];
  const previewRows: string[] = [
    'order_id,reviewer,star_rating,quote,matched_product_id,matched_product_title,score,reason',
  ];

  for (const review of joined) {
    const quote = review.message;
    const key = `${review.order_id}|${review.reviewer ?? ''}|${quote ?? ''}`;
    if (existingKeys.has(key)) {
      skippedAlreadyPresent++;
      continue;
    }

    const productNameDisplay = buildProductNameDisplay(review.etsy_items);
    const isAmbiguousOrder = review.order_review_count > 1 && review.etsy_items.length > 1;

    let winner: { id: string; title: string; score: number } | null = null;
    let reason: string;

    if (review.etsy_items.length === 0) {
      manualNoAnchor++;
      reason = 'manual_no_anchor';
    } else if (isAmbiguousOrder) {
      // Multiple reviews on this order, multiple items — no way to tell
      // which review is for which item. Never auto-match, no matter how
      // strong any individual anchor's score looks.
      manualAmbiguousOrder++;
      reason = 'manual_ambiguous_order';
    } else {
      // Single-review order (1+ items) — safe to try every candidate
      // anchor and keep the single best-scoring pairing.
      for (const anchor of review.etsy_items) {
        const candidate = bestForAnchor(anchor.item_name, products, soldCount);
        if (candidate && (!winner || candidate.score > winner.score)) {
          winner = candidate;
        }
      }
      if (winner && winner.score >= AUTO_MATCH_THRESHOLD) {
        autoMatched++;
        reason = 'auto_matched';
      } else {
        manualLowScore++;
        reason = 'manual_low_score';
      }
    }

    const isAutoMatch = reason === 'auto_matched';

    if (isAutoMatch && winner) {
      previewRows.push(
        [
          csvEscape(review.order_id),
          csvEscape(review.reviewer),
          csvEscape(review.star_rating),
          csvEscape(quote),
          csvEscape(winner.id),
          csvEscape(winner.title),
          csvEscape(winner.score),
          csvEscape(reason),
        ].join(',')
      );
    }

    const { display: reviewDateDisplay, iso: reviewDateIso } = formatDate(review.date_reviewed);
    const rowId = nextId++;
    rowsToInsert.push({
      id: rowId,
      source_image: null,
      image_path: null,
      order_id: review.order_id,
      reviewer_name: review.reviewer,
      product_name: productNameDisplay,
      quote,
      rating: review.star_rating,
      review_date: reviewDateDisplay,
      review_date_parsed: reviewDateIso,
      display_order: rowId,
      product_id: isAutoMatch && winner ? winner.id : null,
    });
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Already present (skipped, safe re-run): ${skippedAlreadyPresent}`);
  console.log(`New rows to import: ${rowsToInsert.length}`);
  console.log(`  Auto-matched (score >= ${AUTO_MATCH_THRESHOLD}): ${autoMatched}`);
  console.log(`  Manual queue — ambiguous order (multi-review + multi-item): ${manualAmbiguousOrder}`);
  console.log(`  Manual queue — below threshold: ${manualLowScore}`);
  console.log(`  Manual queue — no historical title at all: ${manualNoAnchor}`);

  fs.writeFileSync(PREVIEW_CSV_PATH, previewRows.join('\n') + '\n');
  console.log(`\nWrote ${autoMatched} proposed auto-matches to ${path.relative(process.cwd(), PREVIEW_CSV_PATH)} for review.`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Nothing was written to Supabase. Skim the preview CSV, then re-run without --dry-run to apply.');
    return;
  }

  console.log(`\nInserting ${rowsToInsert.length} row(s) into customer_reviews in batches of ${INSERT_BATCH_SIZE}...`);
  let inserted = 0;
  for (let i = 0; i < rowsToInsert.length; i += INSERT_BATCH_SIZE) {
    const batch = rowsToInsert.slice(i, i + INSERT_BATCH_SIZE);
    const { error } = await supabase.from('customer_reviews').insert(batch);
    if (error) {
      console.error(`  [FAIL] batch starting at row ${i}: ${error.message}`);
      console.error('  Stopping — already-inserted batches are fine to leave in place; re-run this script to resume (already-present rows are skipped automatically).');
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`  inserted ${inserted}/${rowsToInsert.length}`);
  }

  console.log('\nDone. All rows inserted successfully.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
