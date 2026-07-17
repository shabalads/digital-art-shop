// scripts/printful-discover.js
//
// One-off discovery script: pulls Printful's live v1 catalog data for the
// "Enhanced Matte Paper Poster" product (this is what we advertise as our
// "200gsm matte" print), and prints every real variant_id, size, and
// wholesale cost per size. Does NOT write anything or create orders.
//
// Usage:
//   export $(cat .env.local | xargs)   // if PRINTFUL_API_KEY isn't already in env
//   node scripts/printful-discover.js

const PRINTFUL_API_URL = 'https://api.printful.com';

async function printfulGet(path) {
  const res = await fetch(`${PRINTFUL_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Printful GET ${path} failed: ${res.status} ${res.statusText} ${text}`);
  }

  return res.json();
}

async function main() {
  if (!process.env.PRINTFUL_API_KEY) {
    console.error('PRINTFUL_API_KEY is not set in the environment.');
    process.exit(1);
  }

  console.log('Fetching Printful product catalog (/products)...');
  const catalogRes = await printfulGet('/products');
  const catalog = catalogRes.result;

  console.log(`Catalog has ${catalog.length} products. Searching for "Enhanced Matte Paper Poster"...`);

  const matches = catalog.filter((p) =>
    p.title.toLowerCase().includes('enhanced matte paper poster')
  );

  if (matches.length === 0) {
    console.error('No product titled "Enhanced Matte Paper Poster" found in the catalog.');
    console.error('Closest titles containing "poster":');
    catalog
      .filter((p) => p.title.toLowerCase().includes('poster'))
      .forEach((p) => console.error(`  id=${p.id}  title="${p.title}"`));
    process.exit(1);
  }

  if (matches.length > 1) {
    console.log(`Found ${matches.length} matching products — printing all of them.`);
  }

  for (const match of matches) {
    console.log('\n=================================================');
    console.log(`Product: "${match.title}" (id=${match.id})`);
    console.log('=================================================');

    const detail = await printfulGet(`/products/${match.id}`);
    const variants = detail.result.variants;

    console.log(`${variants.length} variants found:\n`);
    console.log(
      'variant_id'.padEnd(12),
      'size'.padEnd(14),
      'color'.padEnd(16),
      'wholesale_price'
    );
    console.log('-'.repeat(60));

    for (const v of variants) {
      console.log(
        String(v.id).padEnd(12),
        String(v.size ?? '-').padEnd(14),
        String(v.color ?? '-').padEnd(16),
        `$${v.price}`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
