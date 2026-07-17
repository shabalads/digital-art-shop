// scripts/gelato-discover.js
//
// One-off discovery script for Gelato's "Museum-Quality Matte Paper Poster"
// (~250gsm, matte, archival — our non-US/CA physical print product).
//
// IMPORTANT — Gelato's catalog is NOT organized by named products like
// Printify's blueprints. Per dashboard.gelato.com/docs (checked July 2026),
// the "posters" catalog is a flat set of products, each identified only by
// a productUid string (e.g. "flat_600x900-mm-24x36-inch_250-gsm-100lb-
// uncoated-offwhite-archival_4-0_ver") and a bag of attributes (PaperFormat,
// a paper-type attribute, Orientation, CoatingType, etc.) — there is no
// "product name" to search by. So this script:
//   1. Fetches the full "posters" catalog attribute list and prints it in
//      full, so you can see every real attribute key + value Gelato exposes.
//   2. Auto-detects which attribute value(s) look like the 250gsm archival
//      matte paper (matching /250|archival|museum/i against value titles)
//      and, if found, searches the catalog filtered to those value(s),
//      printing every matching productUid (one per size/orientation).
//   3. If auto-detection finds nothing, it does NOT guess — it prints the
//      full attribute dump and stops, so the right value can be picked by
//      hand and the script re-run with FORCE_PAPER_TYPE=<value> set.
//   4. For every candidate productUid found, fetches real pricing via the
//      Price API and prints it.
//
// Does NOT write anything, create products, or create orders.
//
// IMPORTANT — run this from a machine with real internet access (your own
// terminal), same as scripts/printful-discover.js. Confirmed 2026-07-15: this
// will NOT resolve product.gelatoapis.com from inside a locked-down sandbox
// (getaddrinfo EAI_AGAIN) — there's no outbound network access there at all.
//
// Usage:
//   export $(cat .env.local | xargs)   // if GELATO_API_KEY isn't already in env
//   node scripts/gelato-discover.js
//
//   # If step 2's auto-detect finds nothing, inspect the printed attribute
//   # dump, then force a specific paper-type attribute value:
//   FORCE_PAPER_TYPE=250-gsm-100lb-uncoated-offwhite-archival node scripts/gelato-discover.js

const PRODUCT_API_URL = 'https://product.gelatoapis.com/v3';
const CATALOG_UID = 'posters';

async function gelatoGet(url) {
  const res = await fetch(url, {
    headers: { 'X-API-KEY': process.env.GELATO_API_KEY },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gelato GET ${url} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

async function gelatoPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.GELATO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gelato POST ${url} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

async function main() {
  if (!process.env.GELATO_API_KEY) {
    console.error('GELATO_API_KEY is not set in the environment.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------
  // 0. Confirm the "posters" catalog actually exists under this account.
  //
  // NOTE: dashboard.gelato.com/docs' rendered response example for this
  // endpoint has its JSON brackets stripped by the doc site's markdown
  // conversion, so the true top-level shape (bare array vs. {data:[...]}
  // vs. {catalogs:[...]}) can't be trusted from the docs alone. Print the
  // raw response first so we have real ground truth, then unwrap whichever
  // shape it actually is rather than assuming.
  // ---------------------------------------------------------------------
  console.log('Fetching catalog list (GET /v3/catalogs)...');
  const catalogsRaw = await gelatoGet(`${PRODUCT_API_URL}/catalogs`);
  console.log('\nRAW response:');
  console.log(JSON.stringify(catalogsRaw, null, 2));

  const catalogs = Array.isArray(catalogsRaw)
    ? catalogsRaw
    : Array.isArray(catalogsRaw?.data)
    ? catalogsRaw.data
    : Array.isArray(catalogsRaw?.catalogs)
    ? catalogsRaw.catalogs
    : null;

  if (!catalogs) {
    console.error(
      '\nCould not find an array of catalogs in the raw response above — none of the shapes ' +
      'tried (bare array, {data:[...]}, {catalogs:[...]}) matched. Stopping rather than guessing further.'
    );
    process.exit(1);
  }

  console.log(`\n${catalogs.length} catalog(s) available:`);
  for (const c of catalogs) {
    console.log(`  catalogUid=${c.catalogUid}  title="${c.title}"`);
  }
  if (!catalogs.some((c) => c.catalogUid === CATALOG_UID)) {
    console.error(`\nCatalog "${CATALOG_UID}" not found in the list above — stopping rather than guessing a different one.`);
    process.exit(1);
  }

  // ---------------------------------------------------------------------
  // 1. Full attribute dump for the "posters" catalog.
  // ---------------------------------------------------------------------
  console.log(`\nFetching catalog detail (GET /v3/catalogs/${CATALOG_UID})...`);
  const catalog = await gelatoGet(`${PRODUCT_API_URL}/catalogs/${CATALOG_UID}`);
  console.log('\nRAW response:');
  console.log(JSON.stringify(catalog, null, 2));

  const rawProductAttributes = Array.isArray(catalog?.productAttributes) ? catalog.productAttributes : null;
  if (!rawProductAttributes) {
    console.error(
      '\nCould not find a productAttributes array in the raw response above (expected catalog.productAttributes[]). ' +
      'Stopping rather than guessing further — inspect the raw dump to find the real field name/shape.'
    );
    process.exit(1);
  }

  // Confirmed from real output (2026-07-15): every attribute's `values` is an
  // array EXCEPT "ProductModel", where Gelato returns it as an object keyed
  // by value id (e.g. {"flat_product": {...}, "flat_geo_simplified": {...}})
  // instead of an array. Normalize so the rest of this script can treat
  // `values` uniformly without assuming one shape for all attributes.
  const productAttributes = rawProductAttributes.map((attr) => ({
    ...attr,
    values: Array.isArray(attr.values) ? attr.values : Object.values(attr.values || {}),
  }));

  console.log(`\n"${catalog.title}" catalog has ${productAttributes.length} attribute(s):\n`);
  for (const attr of productAttributes) {
    console.log(`--- ${attr.productAttributeUid} ("${attr.title}") — ${attr.values.length} value(s) ---`);
    for (const v of attr.values) {
      console.log(`    ${v.productAttributeValueUid}  ("${v.title}")`);
    }
  }

  // ---------------------------------------------------------------------
  // 2. Auto-detect the paper-type attribute + value matching "250gsm
  //    archival matte" (Museum-Quality Matte Paper Poster), unless the
  //    caller already told us which value to use via FORCE_PAPER_TYPE.
  // ---------------------------------------------------------------------
  let paperAttrUid = null;
  let paperValueUid = process.env.FORCE_PAPER_TYPE || null;

  if (paperValueUid) {
    // We were told the value directly — still need to find which attribute
    // key it belongs to, for building the search filter below.
    for (const attr of productAttributes) {
      if (attr.values.some((v) => v.productAttributeValueUid === paperValueUid)) {
        paperAttrUid = attr.productAttributeUid;
        break;
      }
    }
    if (!paperAttrUid) {
      console.error(`\nFORCE_PAPER_TYPE="${paperValueUid}" was set, but no attribute value with that UID was found above.`);
      process.exit(1);
    }
    console.log(`\nUsing forced value: ${paperAttrUid}=${paperValueUid}`);
  } else {
    // Only search within the two attributes that are actually about paper
    // stock (PaperType, UnifiedPaperType) — matching bare "250" against every
    // attribute caught dimension/format values too (e.g. "200x250-mm" is a
    // paper SIZE, not a paper type). Confirmed from the 2026-07-15 run.
    console.log('\nAuto-detecting a paper-type attribute value matching /archival|museum/i within PaperType/UnifiedPaperType only...');
    const candidates = [];
    for (const attr of productAttributes) {
      if (attr.productAttributeUid !== 'PaperType' && attr.productAttributeUid !== 'UnifiedPaperType') continue;
      for (const v of attr.values) {
        if (/archival|museum/i.test(v.title) || /archival|museum/i.test(v.productAttributeValueUid)) {
          candidates.push({ attrUid: attr.productAttributeUid, attrTitle: attr.title, ...v });
        }
      }
    }

    if (candidates.length === 0) {
      console.error(
        '\nNo attribute value auto-matched /250|archival|museum/i. Not guessing further — ' +
        'review the full attribute dump printed above, find the value that represents the ' +
        '250gsm archival matte paper, then re-run with:\n' +
        '  FORCE_PAPER_TYPE=<productAttributeValueUid> node scripts/gelato-discover.js'
      );
      process.exit(1);
    }

    console.log(`\nFound ${candidates.length} candidate value(s):`);
    for (const c of candidates) {
      console.log(`  ${c.attrUid} (${c.attrTitle}) = ${c.productAttributeValueUid} ("${c.title}")`);
    }

    if (candidates.length > 1) {
      console.error(
        '\nMore than one candidate matched — not guessing which one is right. ' +
        'Re-run with FORCE_PAPER_TYPE=<the correct productAttributeValueUid> from the list above.'
      );
      process.exit(1);
    }

    paperAttrUid = candidates[0].attrUid;
    paperValueUid = candidates[0].productAttributeValueUid;
    console.log(`\nUsing auto-detected value: ${paperAttrUid}=${paperValueUid} ("${candidates[0].title}")`);
  }

  // ---------------------------------------------------------------------
  // 3. Search the catalog filtered to that paper type, both orientations,
  //    to get every real productUid (one per size).
  //
  // A real run against this exact filter on 2026-07-15 returned 120 total
  // matches (confirmed via hits.attributeHits.UnifiedPaperType[paperValueUid]
  // in the response), and a single request with limit:100 silently
  // truncated the last 20 — there was no error, just a quiet cutoff.
  //
  // Rather than guess a bigger single-request limit (Gelato's docs don't
  // state a max for this endpoint, and guessing one — 250 was tried and
  // never actually verified against their real cap — is exactly the kind
  // of unverified assumption to avoid), this now paginates properly: fetch
  // pages of 100 (the value already confirmed to work) with an increasing
  // offset, and stop once a page comes back with fewer than 100 results.
  // Correct regardless of what Gelato's real per-request cap turns out to be.
  // ---------------------------------------------------------------------
  console.log(`\nSearching catalog (POST /v3/catalogs/${CATALOG_UID}/products:search) filtered to ${paperAttrUid}=${paperValueUid}, paginating in pages of 100...`);

  const PAGE_SIZE = 100;
  let products = [];
  let offset = 0;
  let pageNum = 0;
  let lastHits = null; // hits/attributeHits look global to the filter, not per-page — capture from the first page

  while (true) {
    pageNum++;
    const searchResult = await gelatoPost(`${PRODUCT_API_URL}/catalogs/${CATALOG_UID}/products:search`, {
      attributeFilters: {
        [paperAttrUid]: [paperValueUid],
      },
      limit: PAGE_SIZE,
      offset,
    });

    if (searchResult?.hits && !lastHits) lastHits = searchResult.hits;

    const pageProducts = Array.isArray(searchResult)
      ? searchResult
      : Array.isArray(searchResult?.products)
      ? searchResult.products
      : Array.isArray(searchResult?.data)
      ? searchResult.data
      : null;

    if (!pageProducts) {
      console.error(
        `\nPage ${pageNum} (offset=${offset}): could not find a products array in the raw response ` +
        '(tried bare array, {products:[...]}, {data:[...]}). Stopping rather than guessing further.'
      );
      console.error('RAW response for this page:');
      console.error(JSON.stringify(searchResult, null, 2));
      process.exit(1);
    }

    console.log(`  Page ${pageNum} (offset=${offset}): got ${pageProducts.length} product(s).`);
    products = products.concat(pageProducts);

    if (pageProducts.length < PAGE_SIZE) break; // last page
    offset += PAGE_SIZE;

    if (pageNum > 20) {
      // Sanity guard against an infinite loop if some future response shape
      // always returns exactly PAGE_SIZE items — real catalogs here are in
      // the hundreds at most, not 2000+.
      console.error('\nStopped after 20 pages (2000 products) as a safety guard — this is more than expected. Investigate before trusting this list.');
      break;
    }
  }

  console.log(`\nTotal fetched across ${pageNum} page(s): ${products.length}`);

  console.log(`\n${products.length} matching product(s) (each is one size/orientation combination):\n`);
  console.log(
    'productUid'.padEnd(75),
    'dimensions'
  );
  console.log('-'.repeat(120));

  for (const p of products) {
    const dims = Object.entries(p.dimensions || {})
      .map(([k, v]) => `${k}=${v.value}${v.measureUnit}`)
      .join(', ');
    console.log(String(p.productUid).padEnd(75), dims);
  }

  if (lastHits) {
    console.log('\nAttribute hit counts (other values present among these results, for sanity-checking the filter):');
    console.log(JSON.stringify(lastHits, null, 2));
  }

  // ---------------------------------------------------------------------
  // 4. Real pricing per productUid.
  // ---------------------------------------------------------------------
  console.log('\nFetching real prices for each matching productUid (GET /v3/products/{productUid}/prices)...\n');
  for (const p of products) {
    try {
      const pricesRaw = await gelatoGet(`${PRODUCT_API_URL}/products/${encodeURIComponent(p.productUid)}/prices?country=US`);
      const prices = Array.isArray(pricesRaw)
        ? pricesRaw
        : Array.isArray(pricesRaw?.prices)
        ? pricesRaw.prices
        : Array.isArray(pricesRaw?.data)
        ? pricesRaw.data
        : null;

      console.log(`${p.productUid}`);
      if (!prices) {
        console.log(`    Unexpected price response shape, RAW: ${JSON.stringify(pricesRaw)}`);
        continue;
      }
      for (const price of prices) {
        console.log(`    qty=${price.quantity}  price=${price.price} ${price.currency}  country=${price.country}`);
      }
    } catch (err) {
      console.log(`${p.productUid}\n    FAILED to fetch price: ${err.message}`);
    }
  }

  console.log('\nDone. Nothing was written — this script only reads.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
