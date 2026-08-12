// scripts/apply-review-matches.ts
//
// Companion to needs_review.csv (repo root). ~63 of the 100 customer reviews
// couldn't be confidently auto-matched to a live product by fuzzy title
// matching, because their productName is an old/shortened Etsy listing name
// and listings get retitled over time (same story as the "Sardine Painting"
// bestseller — confirmed 2026-07-27 it now lives under a completely different
// title with zero literal text overlap with the old one).
//
// needs_review.csv lists each unresolved review with its top 3 candidate
// products (id + title + match score) and a blank YOUR_CONFIRMED_PRODUCT_ID
// column. Open it in Excel/Sheets/Numbers, fill in the product UUID you
// recognize as correct in that last column for as many rows as you can
// (leave blank to skip — the review just won't have a product link), save
// as CSV, then run this script to push the confirmed links into Supabase.
//
// ============================================================================
// HOW TO RUN
// ============================================================================
//   1. Fill in YOUR_CONFIRMED_PRODUCT_ID in needs_review.csv for rows you're
//      confident about (copy the id from candidate1_id/2/3, or from the
//      dashboard directly if none of the 3 candidates are right).
//   2. export $(grep -v '^#' .env.local | grep '=' | xargs)
//   3. npx tsx scripts/apply-review-matches.ts --dry-run   (preview only)
//   4. npx tsx scripts/apply-review-matches.ts             (applies updates)
// ============================================================================

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

const CSV_PATH = path.join(__dirname, '..', 'needs_review.csv');
const DRY_RUN = process.argv.includes('--dry-run');

interface Row {
  review_id: string;
  reviewerName: string;
  productName_in_review: string;
  YOUR_CONFIRMED_PRODUCT_ID: string;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
  const parsed = Papa.parse<Row>(csvText, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    console.error('CSV parse errors:', parsed.errors);
    process.exit(1);
  }

  const confirmed = parsed.data.filter((r) => r.YOUR_CONFIRMED_PRODUCT_ID && r.YOUR_CONFIRMED_PRODUCT_ID.trim());
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const invalid = confirmed.filter((r) => !uuidRe.test(r.YOUR_CONFIRMED_PRODUCT_ID.trim()));

  if (invalid.length > 0) {
    console.error(`${invalid.length} row(s) have a YOUR_CONFIRMED_PRODUCT_ID that isn't a valid UUID:`);
    for (const r of invalid) console.error(`  review_id=${r.review_id}: "${r.YOUR_CONFIRMED_PRODUCT_ID}"`);
    console.error('Fix these (copy the exact id from a candidate column) and re-run.');
    process.exit(1);
  }

  console.log(`Found ${confirmed.length} confirmed row(s) out of ${parsed.data.length} total in needs_review.csv.`);

  if (confirmed.length === 0) {
    console.log('Nothing to do — fill in YOUR_CONFIRMED_PRODUCT_ID for at least one row first.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would apply:');
    for (const r of confirmed) {
      console.log(`  review ${r.review_id} ("${r.productName_in_review}") -> product_id = ${r.YOUR_CONFIRMED_PRODUCT_ID.trim()}`);
    }
    console.log('\n[DRY RUN] Nothing was written. Re-run without --dry-run to apply.');
    return;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL. Did you export .env.local?');
    process.exit(1);
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let ok = 0;
  let failed = 0;

  for (const r of confirmed) {
    const { error } = await supabase
      .from('customer_reviews')
      .update({ product_id: r.YOUR_CONFIRMED_PRODUCT_ID.trim() })
      .eq('id', Number(r.review_id));

    if (error) {
      console.error(`  [FAIL] review ${r.review_id}: ${error.message}`);
      failed++;
    } else {
      ok++;
    }
  }

  console.log(`\nDone. ${ok} updated, ${failed} failed.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
