// scripts/gelato-bulk-create.js
//
// IMPORTANT DIFFERENCE FROM PRINTIFY/PRINTFUL — read before assuming this
// works the same way:
//
// Gelato has NO per-shop "sync product" or "create product" step at all.
// Confirmed via Gelato's real Order API v4 docs (order.gelatoapis.com/v4) —
// order line items are {itemReferenceId, productUid, files:[{type:"default",
// url}], quantity}. The productUid is a fixed, global CATALOG identifier
// (same 120 real productUids discovered in scripts/gelato-discover.js for
// every Gelato customer/product), and the actual artwork is submitted as a
// plain image URL directly on the ORDER, not pre-uploaded or pre-registered
// against a product ahead of time. There is nothing to "bulk create" on
// Gelato's side.
//
// So this script does NOT call any Gelato product-creation endpoint (there
// isn't one to call). What it actually does:
//   1. Once, at startup: hits Gelato's real GET /v3/products/{uid}/prices
//      endpoint for all 10 productUids to confirm they're still live/valid
//      (not stale from the 2026-07-15 discovery run) and prints current
//      wholesale prices. This is the "check Gelato's actual API, don't
//      assume" step — it does NOT create anything.
//   2. For each matching product row in Supabase, writes the SAME static
//      size -> productUid map into that row's gelato_variants column. This
//      is a Supabase write, not a Gelato API call, so none of the
//      rate-limit/backoff logic from printful-bulk-create.js applies here —
//      the retry logic below is for transient Supabase failures only.
//
// Per-size retail prices charged to customers come from the site's own
// PHYSICAL_SIZES pricing (app/(shop)/product/[id]/page.tsx), same as
// Printify/Printful — Gelato's wholesale price is informational only (our
// cost, for margin-checking) and is never written to the DB or shown to
// customers.
//
// IMPORTANT — run this from a machine with real internet access. The price
// verification step needs to reach product.gelatoapis.com; this sandbox has
// no outbound network access at all.
//
// ============================================================================
// HOW TO RUN
// ============================================================================
//
//   1. export $(grep -v '^#' .env.local | grep '=' | xargs)
//   2. TEST FIRST: node scripts/gelato-bulk-create.js --limit=5
//      Check scripts/gelato-bulk-create-log.json and the gelato_variants
//      column in Supabase for those 5 products, then run a real test order
//      (Step 8) before going further.
//   3. node scripts/gelato-bulk-create.js --product-ids=123,456
//   4. node scripts/gelato-bulk-create.js --all
//   5. node scripts/gelato-bulk-create.js --retry-failed
//   6. Add --skip-verify to skip the one-time live price check (not
//      recommended — that check is what confirms these productUids are
//      still real and purchasable before you write them to 500+ rows).
//
//   Running with no flags prints usage and exits.
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const GELATO_PRODUCT_API_URL = 'https://product.gelatoapis.com/v3';
const LOG_PATH = path.join(__dirname, 'gelato-bulk-create-log.json');

// ----------------------------------------------------------------------------
// Size mapping — our size label -> Gelato productUid.
// Pulled live from scripts/gelato-discover.js real output, confirmed
// 2026-07-15, UnifiedPaperType=250-gsm-100lb-uncoated-offwhite-archival, _ver
// (portrait) variant. Canonical naming for sizes with duplicate mm-first /
// inch-first productUids: imperial-first, to match the site's inch-based
// display. Gelato covers all 10 site sizes (unlike Printify) — including
// true ISO A4/A3/A2 (single, non-duplicated productUids for ISO sizes).
//
// Do NOT hand-edit without re-running discovery.
// ----------------------------------------------------------------------------
const PAPER_SUFFIX = '250-gsm-100lb-uncoated-offwhite-archival_4-0_ver';

const SIZE_TO_PRODUCT_UID = {
  '5x7':   { uid: `flat_5r-130x180-mm_${PAPER_SUFFIX}`,              label: '5×7"',  confirmed_price_usd: 7.46 },
  '8x10':  { uid: `flat_8x10-inch-200x250-mm_${PAPER_SUFFIX}`,       label: '8×10"', confirmed_price_usd: 8.38 },
  '8x12':  { uid: `flat_8x12-inch-a4_${PAPER_SUFFIX}`,               label: '8×12"', confirmed_price_usd: null }, // TBD, verified live below
  '11x14': { uid: `flat_11x14-inch-270x350-mm_${PAPER_SUFFIX}`,      label: '11×14"', confirmed_price_usd: 9.05 },
  'a4':    { uid: `flat_a4-8x12-inch_${PAPER_SUFFIX}`,               label: 'A4',    confirmed_price_usd: null }, // TBD, verified live below
  'a3':    { uid: `flat_a3_${PAPER_SUFFIX}`,                         label: 'A3',    confirmed_price_usd: null }, // TBD, verified live below
  '16x20': { uid: `flat_16x20-inch-400x500-mm_${PAPER_SUFFIX}`,      label: '16×20"', confirmed_price_usd: 12.13 },
  '18x24': { uid: `flat_18x24-inch-450x600-mm_${PAPER_SUFFIX}`,      label: '18×24"', confirmed_price_usd: 15.22 },
  'a2':    { uid: `flat_a2_${PAPER_SUFFIX}`,                         label: 'A2',    confirmed_price_usd: null }, // TBD, verified live below
  '24x36': { uid: `flat_600x900-mm-24x36-inch_${PAPER_SUFFIX}`,      label: '24×36"', confirmed_price_usd: 20.35 },
};

// Static map written to every product row — same for all products, since
// Gelato productUids aren't per-shop/per-product like Printify/Printful.
const STATIC_GELATO_VARIANTS = Object.fromEntries(
  Object.entries(SIZE_TO_PRODUCT_UID).map(([sizeKey, cfg]) => [sizeKey, cfg.uid])
);

function parseArgs(argv) {
  const args = { limit: null, all: false, productIds: null, retryFailed: false, skipVerify: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--all') args.all = true;
    else if (arg === '--retry-failed') args.retryFailed = true;
    else if (arg === '--skip-verify') args.skipVerify = true;
    else if (arg.startsWith('--limit=')) args.limit = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--product-ids=')) {
      args.productIds = arg.split('=')[1].split(',').map((s) => s.trim());
    }
  }
  return args;
}

function loadLog() {
  if (!fs.existsSync(LOG_PATH)) return { runs: [] };
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  } catch {
    return { runs: [] };
  }
}

function appendLog(entry) {
  const log = loadLog();
  log.runs.push({ ...entry, timestamp: new Date().toISOString() });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

function getLastFailedProductIds() {
  const log = loadLog();
  const lastByProduct = new Map();
  for (const run of log.runs) {
    lastByProduct.set(run.product_id, run);
  }
  return [...lastByProduct.values()]
    .filter((r) => r.status === 'failed')
    .map((r) => r.product_id);
}

async function gelatoGet(path) {
  const res = await fetch(`${GELATO_PRODUCT_API_URL}${path}`, {
    headers: { 'X-API-KEY': process.env.GELATO_API_KEY },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(`Gelato GET ${path} -> ${res.status}: ${JSON.stringify(json)}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

// One-time real-API check: confirms every productUid we're about to write
// to the DB is still live and purchasable, rather than trusting the
// discovery-time snapshot indefinitely. Does NOT create/modify anything.
async function verifyProductUids() {
  console.log('Verifying all 10 productUids against Gelato\'s live Price API (GET /v3/products/{uid}/prices)...\n');
  let allOk = true;

  for (const [sizeKey, cfg] of Object.entries(SIZE_TO_PRODUCT_UID)) {
    try {
      const result = await gelatoGet(`/products/${cfg.uid}/prices?country=US`);
      const prices = Array.isArray(result) ? result : result?.prices || result?.data;
      const firstPrice = Array.isArray(prices) && prices.length > 0 ? prices[0] : null;

      if (!firstPrice) {
        console.warn(`  [WARN] ${sizeKey.padEnd(6)} (${cfg.label.padEnd(6)}) uid=${cfg.uid} — no price data in response: ${JSON.stringify(result)}`);
        allOk = false;
        continue;
      }

      const price = firstPrice.price ?? firstPrice.priceBase ?? firstPrice.value;
      const currency = firstPrice.currency ?? 'USD';
      console.log(`  [OK]   ${sizeKey.padEnd(6)} (${cfg.label.padEnd(6)}) uid=${cfg.uid} — live price ${currency} ${price}`);
    } catch (err) {
      console.error(`  [FAIL] ${sizeKey.padEnd(6)} (${cfg.label.padEnd(6)}) uid=${cfg.uid} — ${err.message}`);
      allOk = false;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('');
  if (!allOk) {
    throw new Error(
      'One or more productUids failed live verification (see [WARN]/[FAIL] above). ' +
      'Re-run scripts/gelato-discover.js to get fresh productUids before writing to the DB, ' +
      'or pass --skip-verify if you\'ve already confirmed this separately.'
    );
  }
  console.log('All 10 productUids verified live. Proceeding.\n');
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.all && !args.limit && !args.productIds && !args.retryFailed) {
    console.log(`
Usage:
  node scripts/gelato-bulk-create.js --limit=5          # test batch
  node scripts/gelato-bulk-create.js --product-ids=1,2,3 # specific products
  node scripts/gelato-bulk-create.js --retry-failed      # retry last failures
  node scripts/gelato-bulk-create.js --all               # full batch
  (add --skip-verify to skip the one-time live productUid check)

Refusing to run with no flags to avoid an accidental full batch.
`);
    process.exit(0);
  }

  if (!process.env.GELATO_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Missing required env vars. Did you run: export $(grep -v \'^#\' .env.local | grep \'=\' | xargs)');
    process.exit(1);
  }

  if (!args.skipVerify) {
    await verifyProductUids();
  } else {
    console.log('Skipping live productUid verification (--skip-verify passed).\n');
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let query = supabase.from('products').select('id,title,gelato_variants').order('id', { ascending: true });

  if (args.retryFailed) {
    const failedIds = getLastFailedProductIds();
    if (failedIds.length === 0) {
      console.log('No failed products found in the log. Nothing to retry.');
      return;
    }
    console.log(`Retrying ${failedIds.length} previously-failed product(s): ${failedIds.join(', ')}`);
    query = query.in('id', failedIds);
  } else if (args.productIds) {
    query = query.in('id', args.productIds);
  } else if (args.limit) {
    query = query.eq('gelato_variants', '{}').limit(args.limit);
  } else if (args.all) {
    query = query.eq('gelato_variants', '{}');
  }

  const { data: products, error } = await query;

  if (error) {
    console.error('Failed to read products from Supabase:', error.message);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('No matching products found (maybe all already have gelato_variants set).');
    return;
  }

  console.log(`Writing gelato_variants to ${products.length} product(s)...\n`);

  let succeeded = 0;
  let failed = 0;

  for (const product of products) {
    process.stdout.write(`Product ${product.id} ("${product.title}")... `);

    const { error: updateError } = await supabase
      .from('products')
      .update({ gelato_variants: STATIC_GELATO_VARIANTS })
      .eq('id', product.id);

    if (updateError) {
      console.log(`FAILED (${updateError.message})`);
      appendLog({ product_id: product.id, title: product.title, status: 'failed', error: updateError.message });
      failed++;
    } else {
      console.log('OK');
      appendLog({ product_id: product.id, title: product.title, status: 'success', gelato_variants: STATIC_GELATO_VARIANTS });
      succeeded++;
    }
  }

  console.log(`\nDone. Succeeded: ${succeeded}, Failed: ${failed}.`);
  if (failed > 0) {
    console.log(`See ${LOG_PATH} for details, or re-run with --retry-failed.`);
  }

  const stillUnconfirmedPrices = Object.entries(SIZE_TO_PRODUCT_UID)
    .filter(([, cfg]) => cfg.confirmed_price_usd === null)
    .map(([k]) => k);
  if (stillUnconfirmedPrices.length > 0) {
    console.log(
      `\nNote: wholesale price was pulled live above for ALL 10 sizes just now, but the hardcoded ` +
      `confirmed_price_usd fallback in this script's source is still null for: ${stillUnconfirmedPrices.join(', ')} ` +
      `(left over from before live verification). Not a blocker — retail prices charged to customers come ` +
      `from PHYSICAL_SIZES on the product page, not from this value.`
    );
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
