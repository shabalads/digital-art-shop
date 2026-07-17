// scripts/printify-bulk-create.js
//
// One-time bulk script: for each product in Supabase, uploads its image to
// Printify, then creates a Printify product covering the 5 sizes Printify's
// "Fine Art Posters" blueprint (id=804) / "Print Clever" print provider
// (id=72) actually offers, and writes the resulting
// { sizeLabel: "productId:variantId" } map back to products.printify_variants.
//
// Printify does NOT cover all 10 site sizes — confirmed via
// scripts/printify-discover.js real output (2026-07-15): no 5×7", no
// portrait 8×10", no ISO sizes (A4/A3/A2) exist on this blueprint at all.
// Per user decision, those 5 sizes are fulfilled by Gelato regardless of
// customer country (see scripts/gelato-bulk-create.js + Step 5 webhook
// routing) — this script only ever writes the 5 sizes below.
//
// IMPORTANT — run this from a machine with real internet access (your own
// terminal). This sandbox has no outbound network access at all (confirmed
// via getaddrinfo EAI_AGAIN on api.printify.com), same as the discovery
// scripts and printful-bulk-create.js.
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
//   3. TEST FIRST — run on just 3-5 products and inspect the output/log:
//        node scripts/printify-bulk-create.js --limit=5
//
//      Check scripts/printify-bulk-create-log.json afterward, and check
//      those products' printify_variants column in Supabase. Then place one
//      real test order (Step 8) before going further.
//
//   4. If a specific product fails, retry just that one:
//        node scripts/printify-bulk-create.js --product-ids=123,456
//
//   5. Only after the test batch + a real test order both check out, run
//      the full batch:
//        node scripts/printify-bulk-create.js --all
//
//   6. To re-run ONLY the ones that failed last time (reads the log file):
//        node scripts/printify-bulk-create.js --retry-failed
//
//   Running with no flags at all prints this usage and exits.
//
// ============================================================================
// RATE LIMITS — Printify's documented general limit is 600 requests/minute
// per endpoint group, but product creation involves 2-3 calls per product
// (image upload + create + optional confirm GET), so this throttles
// conservatively to avoid tripping anything. Adjust down further if you see
// 429s in practice — do not assume this number without checking Printify's
// current docs if this script is reused much later.
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const PRINTIFY_API_URL = 'https://api.printify.com/v1';
const LOG_PATH = path.join(__dirname, 'printify-bulk-create-log.json');

const REQUEST_INTERVAL_MS = 3000;
const RATE_LIMIT_BACKOFF_MS = 65000;
const MAX_RETRIES_PER_PRODUCT = 3;

// Blueprint / print provider confirmed via scripts/printify-discover.js real
// output on 2026-07-15. Do NOT hand-edit without re-running discovery.
const BLUEPRINT_ID = 804; // "Fine Art Posters"
const PRINT_PROVIDER_ID = 72; // "Print Clever"

// ----------------------------------------------------------------------------
// Size mapping — our size label -> Printify catalog variant_id.
// Pulled live from scripts/printify-discover.js on 2026-07-15. Printify only
// covers these 5 of our 10 site sizes on this blueprint/provider — the other
// 5 (5x7, 8x10, a4, a3, a2) always route to Gelato (see webhook routing).
// Retail prices match the SAME per-size prices already used site-wide in
// app/(shop)/product/[id]/page.tsx (PHYSICAL_SIZES) and in
// printful-bulk-create.js — customers pay one price per size regardless of
// which provider fulfills it.
// ----------------------------------------------------------------------------
const SIZE_TO_CATALOG_VARIANT = {
  '8x12':  { variant_id: 75289,  label: '8×12"',  retail_price_cents: 2699 },
  '11x14': { variant_id: 100934, label: '11×14"', retail_price_cents: 3499 },
  '16x20': { variant_id: 75292,  label: '16×20"', retail_price_cents: 4499 },
  '18x24': { variant_id: 100938, label: '18×24"', retail_price_cents: 5499 },
  '24x36': { variant_id: 75296,  label: '24×36"', retail_price_cents: 6999 },
};

const CATALOG_VARIANT_ID_TO_SIZE_KEY = Object.fromEntries(
  Object.entries(SIZE_TO_CATALOG_VARIANT).map(([sizeKey, cfg]) => [cfg.variant_id, sizeKey])
);

const ALL_VARIANT_IDS = Object.values(SIZE_TO_CATALOG_VARIANT).map((v) => v.variant_id);

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

async function printifyRequest(method, pathSuffix, body) {
  const res = await fetch(`${PRINTIFY_API_URL}${pathSuffix}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.PRINTIFY_API_KEY}`,
      'User-Agent': 'digital-art-shop-bulk-create-script',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);

  if (res.status === 429) {
    const err = new Error('Rate limited (429)');
    err.rateLimited = true;
    throw err;
  }

  if (!res.ok) {
    throw new Error(`Printify ${method} ${pathSuffix} -> ${res.status}: ${JSON.stringify(json)}`);
  }

  return json;
}

const printifyGet = (p) => printifyRequest('GET', p);
const printifyPost = (p, body) => printifyRequest('POST', p, body);

let cachedShopId = null;
async function getShopId() {
  if (cachedShopId) return cachedShopId;
  if (process.env.PRINTIFY_SHOP_ID) {
    cachedShopId = process.env.PRINTIFY_SHOP_ID;
    return cachedShopId;
  }
  const shops = await printifyGet('/shops.json');
  if (!Array.isArray(shops) || shops.length === 0) {
    throw new Error('No Printify shops connected to this API key.');
  }
  if (shops.length > 1) {
    console.warn(
      `WARNING: ${shops.length} shops connected — using the first (id=${shops[0].id}, "${shops[0].title}"). ` +
      `Set PRINTIFY_SHOP_ID in .env.local to pick a different one explicitly.`
    );
  }
  cachedShopId = shops[0].id;
  return cachedShopId;
}

// Step 1 of 2: upload the product image, get back Printify's internal image id.
async function uploadImage(product) {
  const fileName = `product-${product.id}.jpg`;
  const result = await printifyPost('/uploads/images.json', {
    file_name: fileName,
    url: product.image_url,
  });
  if (!result?.id) {
    throw new Error(`Image upload returned no id: ${JSON.stringify(result)}`);
  }
  return result.id;
}

// Step 2 of 2: create the Printify product using the uploaded image + the 5
// known catalog variants. Tracks uploadedImageId/productId across retries so
// a retry after a partial failure doesn't re-upload or re-create needlessly.
async function createProductWithRetry(product, shopId) {
  let attempt = 0;
  let uploadedImageId = null;
  let productId = null;

  while (attempt < MAX_RETRIES_PER_PRODUCT) {
    attempt++;
    try {
      if (uploadedImageId === null) {
        uploadedImageId = await uploadImage(product);
      }

      if (productId === null) {
        const body = {
          title: product.title,
          description: product.title,
          blueprint_id: BLUEPRINT_ID,
          print_provider_id: PRINT_PROVIDER_ID,
          variants: Object.values(SIZE_TO_CATALOG_VARIANT).map((cfg) => ({
            id: cfg.variant_id,
            price: cfg.retail_price_cents,
            is_enabled: true,
          })),
          print_areas: [
            {
              variant_ids: ALL_VARIANT_IDS,
              placeholders: [
                {
                  position: 'front',
                  images: [{ id: uploadedImageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }],
                },
              ],
            },
          ],
        };

        const createResult = await printifyPost(`/shops/${shopId}/products.json`, body);

        console.log(`\n[DEBUG] Raw Printify CREATE response for product ${product.id} ("${product.title}"):`);
        console.log(JSON.stringify(createResult, null, 2));
        console.log('[END DEBUG]\n');

        if (!createResult?.id) {
          throw new Error(`Unexpected create response shape: id is ${JSON.stringify(createResult?.id)}. See [DEBUG] dump above.`);
        }

        productId = createResult.id;

        // The create response should already include the full variants list
        // (unlike Printful, Printify doesn't require a separate GET) — but
        // fall back to a confirm GET if it looks incomplete.
        let variants = createResult.variants;
        if (!Array.isArray(variants) || variants.length < ALL_VARIANT_IDS.length) {
          console.log(`  Create response variants look incomplete, confirming via GET /shops/${shopId}/products/${productId}.json...`);
          const getResult = await printifyGet(`/shops/${shopId}/products/${productId}.json`);
          variants = getResult?.variants;
        }

        if (!Array.isArray(variants)) {
          throw new Error(
            `Could not confirm variants for product ${productId}. Product ${productId} was already ` +
            `created in Printify — do not re-run without cleaning it up first or you'll get a duplicate.`
          );
        }

        const printify_variants = {};
        for (const v of variants) {
          const sizeKey = CATALOG_VARIANT_ID_TO_SIZE_KEY[v.id];
          if (sizeKey) {
            printify_variants[sizeKey] = `${productId}:${v.id}`;
          }
        }

        const missingSizes = Object.keys(SIZE_TO_CATALOG_VARIANT).filter((k) => !(k in printify_variants));
        if (missingSizes.length > 0) {
          throw new Error(
            `Product ${productId} is missing variants for sizes: ${missingSizes.join(', ')}. See [DEBUG] dump above.`
          );
        }

        return { ok: true, printify_variants, printify_product_id: productId };
      }
    } catch (err) {
      if (err.rateLimited && attempt < MAX_RETRIES_PER_PRODUCT) {
        console.warn(`  Rate limited on product ${product.id}, waiting ${RATE_LIMIT_BACKOFF_MS / 1000}s before retry ${attempt + 1}/${MAX_RETRIES_PER_PRODUCT}...`);
        await sleep(RATE_LIMIT_BACKOFF_MS);
        continue;
      }
      return { ok: false, error: err.message, printify_product_id: productId };
    }
  }
  return { ok: false, error: 'Exceeded max retries', printify_product_id: productId };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.all && !args.limit && !args.productIds && !args.retryFailed) {
    console.log(`
Usage:
  node scripts/printify-bulk-create.js --limit=5          # test batch
  node scripts/printify-bulk-create.js --product-ids=1,2,3 # specific products
  node scripts/printify-bulk-create.js --retry-failed      # retry last failures
  node scripts/printify-bulk-create.js --all               # full batch

Refusing to run with no flags to avoid an accidental full batch.
`);
    process.exit(0);
  }

  if (!process.env.PRINTIFY_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Missing required env vars. Did you run: export $(grep -v \'^#\' .env.local | grep \'=\' | xargs)');
    process.exit(1);
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const shopId = await getShopId();
  console.log(`Using Printify shop_id=${shopId}`);

  let query = supabase.from('products').select('id,title,image_url,printify_variants').order('id', { ascending: true });

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
    query = query.eq('printify_variants', '{}').limit(args.limit);
  } else if (args.all) {
    query = query.eq('printify_variants', '{}');
  }

  const { data: products, error } = await query;

  if (error) {
    console.error('Failed to read products from Supabase:', error.message);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('No matching products found (maybe all already have printify_variants set).');
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
    const result = await createProductWithRetry(product, shopId);

    if (result.ok) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ printify_variants: result.printify_variants })
        .eq('id', product.id);

      if (updateError) {
        console.log('FAILED (Printify succeeded, Supabase write failed)');
        appendLog({
          product_id: product.id,
          title: product.title,
          status: 'failed',
          error: `Supabase update failed: ${updateError.message}`,
          printify_product_id: result.printify_product_id,
        });
        failed++;
      } else {
        console.log('OK');
        appendLog({
          product_id: product.id,
          title: product.title,
          status: 'success',
          printify_product_id: result.printify_product_id,
          printify_variants: result.printify_variants,
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
        printify_product_id: result.printify_product_id || null,
      });
      if (result.printify_product_id) {
        console.error(
          `  NOTE: Printify product ${result.printify_product_id} was already created for this product ` +
          `before the failure. It is now orphaned (no printify_variants written to Supabase).`
        );
      }
      failed++;
    }

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
