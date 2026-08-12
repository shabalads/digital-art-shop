// scripts/seed-reviews.ts
//
// One-time seed script: takes the 100 real customer review photos (currently
// named 1.jpg-100.jpg in public/images/reviews/), renames them to SEO-friendly
// slugs based on product name (+ reviewer first name / id to dedupe repeated
// products), and inserts all 100 rows into the Supabase customer_reviews table
// (see supabase/migrations/20260727_add_customer_reviews.sql).
//
// Source of truth for the review data is app/data/customer-reviews.ts — this
// script reads that array directly rather than duplicating it.
//
// IMPORTANT — run this from a machine with the real image files present in
// public/images/reviews/ and real Supabase credentials loaded. This sandbox
// has no access to either.
//
// ============================================================================
// HOW TO RUN
// ============================================================================
//   1. Place all 100 source images (1.jpg ... 100.jpg, or whatever extension
//      they actually are) into public/images/reviews/ first.
//   2. npm install   (installs the `tsx` devDependency this script needs)
//   3. export $(grep -v '^#' .env.local | grep '=' | xargs)
//   4. Preview the slug/rename plan without touching anything:
//        npx tsx scripts/seed-reviews.ts --dry-run
//   5. Once the dry-run output looks right, actually run it:
//        npx tsx scripts/seed-reviews.ts
//   6. Re-running is safe — renames are skipped if the target filename
//      already exists, and the Supabase insert is an upsert on `id`.
// ============================================================================

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { customerReviews, type CustomerReview } from '../app/data/customer-reviews';

const REVIEWS_DIR = path.join(__dirname, '..', 'public', 'images', 'reviews');
const DRY_RUN = process.argv.includes('--dry-run');

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function firstName(reviewerName: string): string {
  const cleaned = reviewerName.replace(/[()]/g, '').trim();
  if (!cleaned || cleaned.toLowerCase() === 'anonymous') return 'anonymous';
  return cleaned.split(/\s+/)[0];
}

interface PlannedRename {
  review: CustomerReview;
  extension: string;
  slug: string;
  finalSlug: string;
  collisionResolvedBy: 'none' | 'reviewer-name' | 'id';
}

function planRenames(reviews: CustomerReview[]): PlannedRename[] {
  const usedSlugs = new Set<string>();
  const plans: PlannedRename[] = [];

  for (const review of reviews) {
    const extMatch = review.sourceImage.match(/\.[a-zA-Z0-9]+$/);
    const extension = extMatch ? extMatch[0] : '.jpg';

    const baseSlug = slugify(review.productName);
    let finalSlug = baseSlug;
    let collisionResolvedBy: PlannedRename['collisionResolvedBy'] = 'none';

    if (usedSlugs.has(finalSlug)) {
      finalSlug = slugify(`${baseSlug}-${firstName(review.reviewerName)}`);
      collisionResolvedBy = 'reviewer-name';
    }
    if (usedSlugs.has(finalSlug)) {
      finalSlug = slugify(`${baseSlug}-${firstName(review.reviewerName)}-${review.id}`);
      collisionResolvedBy = 'id';
    }
    // Extremely unlikely fallback if even that collides (e.g. identical
    // product + identical reviewer first name twice) — id alone is unique.
    if (usedSlugs.has(finalSlug)) {
      finalSlug = `${baseSlug}-${review.id}`;
      collisionResolvedBy = 'id';
    }

    usedSlugs.add(finalSlug);
    plans.push({ review, extension, slug: baseSlug, finalSlug, collisionResolvedBy });
  }

  return plans;
}

function renameFile(plan: PlannedRename): { ok: boolean; error?: string } {
  const sourcePath = path.join(REVIEWS_DIR, plan.review.sourceImage);
  const targetFilename = `${plan.finalSlug}${plan.extension}`;
  const targetPath = path.join(REVIEWS_DIR, targetFilename);

  if (fs.existsSync(targetPath)) {
    // Already renamed on a previous run — fine, not an error.
    return { ok: true };
  }

  if (!fs.existsSync(sourcePath)) {
    return { ok: false, error: `source file not found: ${sourcePath}` };
  }

  fs.renameSync(sourcePath, targetPath);
  return { ok: true };
}

async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Planning renames for ${customerReviews.length} reviews...\n`);

  if (!DRY_RUN && !fs.existsSync(REVIEWS_DIR)) {
    console.error(
      `Directory not found: ${REVIEWS_DIR}\n` +
      `Create public/images/reviews/ and place the 100 source images there before running without --dry-run.`
    );
    process.exit(1);
  }

  const plans = planRenames(customerReviews);

  const collisions = plans.filter((p) => p.collisionResolvedBy !== 'none');
  console.log(`${collisions.length} filename collision(s) resolved:`);
  for (const c of collisions) {
    console.log(`  id=${c.review.id} "${c.review.productName}" -> ${c.finalSlug}${c.extension} (resolved by ${c.collisionResolvedBy})`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('Full rename plan:');
    for (const p of plans) {
      console.log(`  ${p.review.sourceImage.padEnd(10)} -> ${p.finalSlug}${p.extension}`);
    }
    console.log('\n[DRY RUN] Nothing was renamed or inserted. Re-run without --dry-run to apply.');
    return;
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL. Did you export .env.local?');
    process.exit(1);
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let renamed = 0;
  let renameFailed = 0;
  const rows: any[] = [];

  for (const plan of plans) {
    const result = renameFile(plan);
    if (!result.ok) {
      console.error(`  [SKIP] id=${plan.review.id}: ${result.error}`);
      renameFailed++;
      continue;
    }
    renamed++;

    rows.push({
      id: plan.review.id,
      source_image: plan.review.sourceImage,
      image_path: `/images/reviews/${plan.finalSlug}${plan.extension}`,
      order_id: plan.review.orderId,
      reviewer_name: plan.review.reviewerName,
      product_name: plan.review.productName,
      quote: plan.review.quote,
      rating: plan.review.rating,
      review_date: plan.review.reviewDate,
      display_order: plan.review.id,
    });
  }

  console.log(`\nRenamed/confirmed ${renamed} file(s), ${renameFailed} failed.`);

  if (rows.length === 0) {
    console.log('No rows to insert (all renames failed). Fix the file issues above and re-run.');
    return;
  }

  console.log(`Upserting ${rows.length} row(s) into customer_reviews...`);
  const { error } = await supabase.from('customer_reviews').upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('Supabase upsert failed:', error.message);
    process.exit(1);
  }

  console.log('Done. All rows upserted successfully.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
