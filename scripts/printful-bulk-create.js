// scripts/printful-bulk-create.js
//
// One-time bulk script: for each product in Supabase, creates a Printful
// "sync product" with one sync variant per physical size we sell, using the
// product's image_url as the print file. Writes the resulting
// { sizeLabel: sync_variant_id } map back to products.printful_variants.
//
// IMPORTANT — run this from a machine with real internet access (your own
// terminal). It will NOT work from a locked-down sandbox — Printful's
// /store/products endpoint requires an authenticated POST, which needs
// outbound network access.
//
// ============================================================================
// HOW TO RUN (do this on your own machine, in the project root)
// ============================================================================
//
//   1. Make sure dependencies are installed:
//        npm install
//
//   2. Load your .env.local into the shell:
//        export $(grep -v '^#' .env.local | grep '=' | xargs)
//
//   3. TEST FIRST — run on just 5 products and inspect the output/log:
//        node scripts/printful-bulk-create.js --limit=5
//
//      Check scripts/printful-bulk-create-log.json afterward, and check
//      those 5 products' printful_variants column in Supabase. Then place
//      one real test order against one of those 5 (Step 6) before going
//      further.
//
//   4. If a specific product fails, retry just that one:
//        node scripts/printful-bulk-create.js --product-ids=123,456
//
//   5. Only after the test batch + a real test order both check out, run
//      the full batch (this will take a while — see rate limit note below):
//        node scripts/printful-bulk-create.js --all
//
//   6. To re-run ONLY the ones that failed last time (reads the log file):
//        node scripts/printful-bulk-create.js --retry-failed
//
//   Running with no flags at all prints this usage and exits — it will
//   never silently run against all 476 products by accident.
//
// ============================================================================
// RATE LIMITS (from Printful's official API docs, developers.printful.com/docs,
// section "About the Printful API / Rate Limits" — checked July 2026, do not
// assume these without re-checking if this script is reused much later):
//   - General limit: 120 API calls/minute across the whole API.
//   - Sync Products create/modify (POST/PUT /store/products) specifically:
//     10 requests per 60 seconds, with a 60-second lockout if you exceed it.
// This script throttles to well under that (1 request every 7s = ~8.5/min)
// and, if it still gets a 429, backs off for 65s and retries a few times
// before giving up on that product and logging it as failed.
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const PRINTFUL_API_URL = 'https://api.printful.com';
const LOG_PATH = path.join(__dirname, 'printful-bulk-create-log.json');

// Delay between successful requests to stay under the 10/60s sync-product limit.
const REQUEST_INTERVAL_MS = 7000;
// If we hit a 429, Printful enforces a 60s lockout — wait a bit past that.
const RATE_LIMIT_BACKOFF_MS = 65000;
const MAX_RETRIES_PER_PRODUCT = 3;

// ----------------------------------------------------------------------------
// Size mapping — our size label -> Printful catalog variant_id.
// Pulled live from Printful's /products/1 (Enhanced Matte Paper Poster (in))
// on 2026-07-13 via scripts/printful-discover.js. Do NOT hand-edit these IDs
// without re-running discovery — wrong IDs create the wrong physical product.
// Keys MUST match the size keys used in app/(shop)/product/[id]/page.tsx
// (Step 5) — currently: 5x7, 8x10, 8x12, 11x14, a4, a3, 16x20, 18x24, a2, 24x36.
// ----------------------------------------------------------------------------
const SIZE_TO_CATALOG_VARIANT = {
  '5x7':   { variant_id: 16364, label: '5×7"',   retail_price: '19.99' },
  '8x10':  { variant_id: 4463,  label: '8×10"',  retail_price: '24.99' },
  '8x12':  { variant_id: 48490, label: '8×12"',  retail_price: '26.99' },
  '11x14': { variant_id: 14125, label: '11×14"', retail_price: '34.99' },
  'a4':    { variant_id: 48505, label: 'A4',     retail_price: '22.99' },
  'a3':    { variant_id: 48504, label: 'A3',     retail_price: '32.99' },
  '16x20': { variant_id: 3877,  label: '16×20"', retail_price: '44.99' },
  '18x24': { variant_id: 1,     label: '18×24"', retail_price: '54.99' },
  'a2':    { variant_id: 19528, label: 'A2',     retail_price: '49.99' },
  '24x36': { variant_id: 2,     label: '24×36"', retail_price: '69.99' },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const args = { limit: null, all: false, productIds: null, retryFailed: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--all') args.all = true;
    else if (arg === '--retry-failed') args.retryFailed = true;
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

async function printfulPost(pathSuffix, body) {
  const res = await fetch(`${PRINTFUL_API_URL}${pathSuffix}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);

  if (res.status === 429) {
    const err = new Error('Rate limited (429)');
    err.rateLimited = true;
    throw err;
  }

  if (!res.ok) {
    const message = json?.error?.message || json?.result || res.statusText;
    throw new Error(`Printful ${res.status}: ${JSON.stringify(message)}`);
  }

  return json;
}

async function printfulGet(pathSuffix) {
  const res = await fetch(`${PRINTFUL_API_URL}${pathSuffix}`, {
    headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
  });

  const json = await res.json().catch(() => null);

  if (res.status === 429) {
    const err = new Error('Rate limited (429)');
    err.rateLimited = true;
    throw err;
  }

  if (!res.ok) {
    const message = json?.error?.message || json?.result || res.statusText;
    throw new Error(`Printful ${res.status}: ${JSON.stringify(message)}`);
  }

  return json;
}

// Builds the sync_variants payload for one product across all our sizes.
function buildSyncVariants(imageUrl) {
  return Object.entries(SIZE_TO_CATALOG_VARIANT).map(([, cfg]) => ({
    variant_id: cfg.variant_id,
    retail_price: cfg.retail_price,
    files: [{ url: imageUrl }],
  }));
}

// Reverse lookup: Printful catalog variant_id -> our size key. Used to match
// each sync_variant in the GET response back to "5x7" / "8x10" / etc.,
// regardless of what order Printful returns them in.
const CATALOG_VARIANT_ID_TO_SIZE_KEY = Object.fromEntries(
  Object.entries(SIZE_TO_CATALOG_VARIANT).map(([sizeKey, cfg]) => [cfg.variant_id, sizeKey])
);

// Creates the sync product (POST) and, on success, fetches its full variant
// list (GET) to get real sync_variant_ids — the create response only returns
// a variant COUNT, not the variant list itself, so a follow-up GET is required.
//
// syncProductId is tracked across retry attempts so that if the POST already
// succeeded and only the follow-up GET fails, a retry does NOT re-create the
// product (which would leave an orphaned duplicate in the Printful store) —
// it just retries the GET against the same syncProductId.
async function createSyncProductWithRetry(product) {
  let attempt = 0;
  let syncProductId = null;

  while (attempt < MAX_RETRIES_PER_PRODUCT) {
    attempt++;
    try {
      if (syncProductId === null) {
        const body = {
          sync_product: {
            name: product.title,
            thumbnail: product.image_url,
            external_id: String(product.id),
          },
          sync_variants: buildSyncVariants(product.image_url),
        };

        const createResult = await printfulPost('/store/products', body);

        console.log(`\n[DEBUG] Raw Printful CREATE response for product ${product.id} ("${product.title}"):`);
        console.log(JSON.stringify(createResult, null, 2));
        console.log('[END DEBUG]\n');

        if (!createResult?.result?.id) {
          throw new Error(
            `Unexpected create response shape: result.id is ${JSON.stringify(createResult?.result?.id)}. ` +
            `See [DEBUG] dump above.`
          );
        }

        syncProductId = createResult.result.id;
      }

      const getResult = await printfulGet(`/store/products/${syncProductId}`);

      console.log(`\n[DEBUG] Raw Printful GET response for sync product ${syncProductId} (product ${product.id}):`);
      console.log(JSON.stringify(getResult, null, 2));
      console.log('[END DEBUG]\n');

      const syncVariants = getResult?.result?.sync_variants;
      if (!Array.isArray(syncVariants)) {
        throw new Error(
          `Unexpected GET response shape: result.sync_variants is ${JSON.stringify(syncVariants)}. ` +
          `See [DEBUG] dump above. Sync product ${syncProductId} was already created in Printful — ` +
          `do not re-run without cleaning it up first or you'll get a duplicate.`
        );
      }

      const printful_variants = {};
      const unmatched = [];
      for (const sv of syncVariants) {
        const sizeKey = CATALOG_VARIANT_ID_TO_SIZE_KEY[sv.variant_id];
        if (!sizeKey) {
          unmatched.push(sv.variant_id);
          continue;
        }
        printful_variants[sizeKey] = String(sv.id);
      }

      const missingSizes = Object.keys(SIZE_TO_CATALOG_VARIANT).filter((k) => !(k in printful_variants));
      if (missingSizes.length > 0) {
        throw new Error(
          `Sync product ${syncProductId} is missing variants for sizes: ${missingSizes.join(', ')}. ` +
          `Unmatched catalog variant_ids in response: ${unmatched.join(', ') || 'none'}. See [DEBUG] dump above.`
        );
      }

      return { ok: true, printful_variants, printful_sync_product_id: syncProductId };
    } catch (err) {
      if (err.rateLimited && attempt < MAX_RETRIES_PER_PRODUCT) {
        console.warn(`  Rate limited on product ${product.id}, waiting ${RATE_LIMIT_BACKOFF_MS / 1000}s before retry ${attempt + 1}/${MAX_RETRIES_PER_PRODUCT}...`);
        await sleep(RATE_LIMIT_BACKOFF_MS);
        continue;
      }
      return { ok: false, error: err.message, printful_sync_product_id: syncProductId };
    }
  }
  return { ok: false, error: 'Exceeded max retries', printful_sync_product_id: syncProductId };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.all && !args.limit && !args.productIds && !args.retryFailed) {
    console.log(`
Usage:
  node scripts/printful-bulk-create.js --limit=5          # test batch
  node scripts/printful-bulk-create.js --product-ids=1,2,3 # specific products
  node scripts/printful-bulk-create.js --retry-failed      # retry last failures
  node scripts/printful-bulk-create.js --all               # full 476-product run

Refusing to run with no flags to avoid an accidental full batch.
`);
    process.exit(0);
  }

  if (!process.env.PRINTFUL_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Missing required env vars. Did you run: export $(grep -v \'^#\' .env.local | grep \'=\' | xargs)');
    process.exit(1);
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let query = supabase.from('products').select('id,title,image_url,printful_variants').order('id', { ascending: true });

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
    // Skip ones that already have variants populated, so re-running --limit=5
    // moves on to the *next* untouched products rather than repeating the same 5.
    query = query.eq('printful_variants', '{}').limit(args.limit);
  } else if (args.all) {
    query = query.eq('printful_variants', '{}');
  }

  const { data: products, error } = await query;

  if (error) {
    console.error('Failed to read products from Supabase:', error.message);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('No matching products found (maybe all already have printful_variants set).');
    return;
  }

  console.log(`Processing ${products.length} product(s)...\n`);

  let succeeded = 0;
  let failed = 0;

  for (const product of products) {
    if (!product.image_url) {
      console.error(`[SKIP] Product ${product.id} ("${product.title}") has no image_url.`);
      appendLog({ product_id: product.id, title: product.title, status: 'failed', error: 'missing image_url' });
      failed++;
      continue;
    }

    process.stdout.write(`Product ${product.id} ("${product.title}")... `);
    const result = await createSyncProductWithRetry(product);

    if (result.ok) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ printful_variants: result.printful_variants })
        .eq('id', product.id);

      if (updateError) {
        console.log('FAILED (Printful succeeded, Supabase write failed)');
        appendLog({
          product_id: product.id,
          title: product.title,
          status: 'failed',
          error: `Supabase update failed: ${updateError.message}`,
          printful_sync_product_id: result.printful_sync_product_id,
        });
        failed++;
      } else {
        console.log('OK');
        appendLog({
          product_id: product.id,
          title: product.title,
          status: 'success',
          printful_sync_product_id: result.printful_sync_product_id,
          printful_variants: result.printful_variants,
        });
        succeeded++;
      }
    } else {
      console.log(`FAILED (${result.error})`);
      appendLog({
        product_id: product.id,
        title: product.title,
        status: 'failed',
        error: result.error,
        printful_sync_product_id: result.printful_sync_product_id || null,
      });
      if (result.printful_sync_product_id) {
        console.error(
          `  NOTE: Printful sync product ${result.printful_sync_product_id} was already created for this product ` +
          `before the failure. It is now orphaned (no printful_variants written to Supabase). Do not retry this ` +
          `product without either deleting that sync product in Printful or confirming it's safe to leave as-is.`
        );
      }
      failed++;
    }

    // Throttle regardless of success/failure to respect the 10 req/60s limit.
    await sleep(REQUEST_INTERVAL_MS);
  }

  console.log(`\nDone. Succeeded: ${succeeded}, Failed: ${failed}.`);
  if (failed > 0) {
    console.log(`See ${LOG_PATH} for details, or re-run with --retry-failed.`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
