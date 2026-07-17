// scripts/printify-discover.js
//
// One-off discovery script: pulls Printify's live v1 catalog data for the
// "Fine Art Posters" blueprint, fulfilled specifically by the "Print Clever"
// print provider (~220gsm, matte, giclée — this is our US/CA physical print
// product). Prints every real blueprint_id / print_provider_id / variant_id
// and size found. Does NOT write anything, create products, or create orders.
//
// Per developers.printify.com (checked July 2026): the catalog variants
// endpoint does NOT return price/cost — that only appears once a sync
// product is created in a shop (Step 4). So this script prints size/variant
// IDs only; retail prices are ours to set at product-creation time, same as
// we did for Printful in scripts/printful-bulk-create.js.
//
// IMPORTANT — run this from a machine with real internet access (your own
// terminal), same as scripts/printful-discover.js and printful-bulk-create.js.
// Confirmed 2026-07-15: this will NOT resolve api.printify.com from inside a
// locked-down sandbox (getaddrinfo EAI_AGAIN) — there's no outbound network
// access there at all, not just an allowlist gap.
//
// Usage:
//   export $(cat .env.local | xargs)   // if PRINTIFY_API_KEY isn't already in env
//   node scripts/printify-discover.js

const PRINTIFY_API_URL = 'https://api.printify.com/v1';

async function printifyGet(path) {
  const res = await fetch(`${PRINTIFY_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.PRINTIFY_API_KEY}`,
      // Printify's docs call out that requests should include a User-Agent —
      // some CDN/WAF layers in front of their API reject requests without one.
      'User-Agent': 'digital-art-shop-discovery-script',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Printify GET ${path} failed: ${res.status} ${res.statusText} ${text}`);
  }

  return res.json();
}

async function main() {
  if (!process.env.PRINTIFY_API_KEY) {
    console.error('PRINTIFY_API_KEY is not set in the environment.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------
  // 0. Shops — we'll need a shop_id later (Step 4/5 product & order
  //    creation both require it), so surface it now even though this
  //    script doesn't use it yet.
  // ---------------------------------------------------------------------
  console.log('Fetching connected shops (GET /v1/shops.json)...');
  const shops = await printifyGet('/shops.json');
  console.log(`${shops.length} shop(s) connected to this API key:\n`);
  for (const s of shops) {
    console.log(`  id=${s.id}  title="${s.title}"  sales_channel=${s.sales_channel}`);
  }
  if (shops.length === 0) {
    console.warn(
      '\nWARNING: no shops are connected to this Printify account/API key. ' +
      'Product creation (Step 4) and order creation (Step 5) both need a shop_id — ' +
      'you\'ll need to connect (or create) a shop in the Printify dashboard first.'
    );
  }

  // ---------------------------------------------------------------------
  // 1. Blueprints — find "Fine Art Posters"
  // ---------------------------------------------------------------------
  console.log('\nFetching full blueprint catalog (GET /v1/catalog/blueprints.json)...');
  const blueprints = await printifyGet('/catalog/blueprints.json');
  console.log(`Catalog has ${blueprints.length} blueprints. Searching for "Fine Art Posters"...`);

  const matches = blueprints.filter((b) => b.title.toLowerCase().includes('fine art poster'));

  if (matches.length === 0) {
    console.error('\nNo blueprint titled "Fine Art Posters" found.');
    console.error('Closest titles containing "poster" or "fine art":');
    blueprints
      .filter((b) => /poster|fine art/i.test(b.title))
      .forEach((b) => console.error(`  id=${b.id}  title="${b.title}"  brand=${b.brand}  model=${b.model}`));
    process.exit(1);
  }

  if (matches.length > 1) {
    console.log(`\nFound ${matches.length} blueprints matching "Fine Art Posters" — printing all of them so you can confirm the right one.`);
  }

  for (const blueprint of matches) {
    console.log('\n=================================================');
    console.log(`Blueprint: "${blueprint.title}" (id=${blueprint.id})`);
    console.log(`  brand=${blueprint.brand}  model=${blueprint.model}`);
    console.log(`  description: ${(blueprint.description || '').slice(0, 200)}${(blueprint.description || '').length > 200 ? '…' : ''}`);
    console.log('=================================================');

    // -------------------------------------------------------------------
    // 2. Print providers for this blueprint — find "Print Clever"
    // -------------------------------------------------------------------
    console.log(`\nFetching print providers for blueprint ${blueprint.id}...`);
    const providers = await printifyGet(`/catalog/blueprints/${blueprint.id}/print_providers.json`);

    console.log(`${providers.length} print provider(s) offer this blueprint:`);
    for (const p of providers) {
      console.log(`  id=${p.id}  title="${p.title}"`);
    }

    const printClever = providers.filter((p) => p.title.toLowerCase().includes('print clever'));

    if (printClever.length === 0) {
      console.error(
        `\nNo print provider named "Print Clever" found for blueprint ${blueprint.id} ("${blueprint.title}"). ` +
        'See the full provider list above — the task specified Print Clever specifically, so not falling back to another provider automatically.'
      );
      continue;
    }

    for (const provider of printClever) {
      // -----------------------------------------------------------------
      // 3. Variants for this blueprint + Print Clever
      // -----------------------------------------------------------------
      console.log(`\nFetching variants for blueprint ${blueprint.id}, print provider ${provider.id} ("${provider.title}")...`);
      const variantData = await printifyGet(
        `/catalog/blueprints/${blueprint.id}/print_providers/${provider.id}/variants.json`
      );
      const variants = variantData.variants || [];

      console.log(`${variants.length} variant(s) found:\n`);
      console.log(
        'variant_id'.padEnd(12),
        'title'.padEnd(30),
        'options (raw)'
      );
      console.log('-'.repeat(90));

      for (const v of variants) {
        console.log(
          String(v.id).padEnd(12),
          String(v.title ?? '-').padEnd(30),
          JSON.stringify(v.options ?? {})
        );
      }

      console.log(
        '\nNOTE: no price/cost field is present on catalog variants — Printify only ' +
        'returns cost+price once a sync product is created (Step 4). Retail prices for ' +
        'each size will be set by us at that point, same pattern as printful-bulk-create.js.'
      );
    }
  }

  console.log('\nDone. Nothing was written — this script only reads.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
