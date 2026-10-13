// app/(shop)/product/[id]/page.tsx
//
// SEO fix (2026-09): this used to be a fully client-side page ('use client',
// fetch in useEffect) — Google's crawler received an empty HTML shell and
// 519 product pages sat as "Discovered - not indexed" in Search Console.
// Now a Server Component: fetches the product directly from Supabase (via
// supabaseAdmin, bypassing RLS — no need to round-trip through /api/products
// from the server), generates real <title>/meta description/OG tags via
// generateMetadata, and pre-renders the ~513 active product pages at build
// time via generateStaticParams. All interactive UI (cart, favorites, image
// zoom, type/size selection, bundle nudge, reviews) lives in
// ProductPageClient.tsx, which receives the fetched product as a prop.

import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { mockProducts, Product, toListingProduct } from '../../../data/products';
import { supabaseAdmin } from '../../../lib/supabase';
import { cleanDescription, seoTitle, metaDescription } from './product-utils';
import { PHYSICAL_SIZES } from '../../../data/physical-sizes';
import ProductPageClient from './ProductPageClient';
import type { CustomerReviewRow } from '../../../components/ReviewCard';
import { reviewJsonLd } from '../../../lib/reviews';

const BASE_URL = 'https://www.itemssyprints.com';

// Without this the pre-rendered pages never refresh until the next deploy:
// a price/title/description edited in the dashboard (or a trashed product)
// would keep showing the old version while checkout charges the new price.
export const revalidate = 3600;

// Wrapped in React.cache so the same request-scoped fetch is reused by both
// generateMetadata and the page component itself — Next.js only dedupes
// plain fetch() calls automatically, not direct Supabase client calls, so
// without this we'd hit Supabase twice per request.
const fetchProduct = cache(async (id: string): Promise<Product | null> => {
  // Deliberately NOT filtered by active/deleted_at here — this matches the
  // existing /api/products?id= behavior (which also fetches by id alone),
  // so a directly-visited link to an inactive/trashed product still resolves
  // exactly as it did before this SSR conversion. generateStaticParams below
  // is what scopes pre-rendering to active, non-deleted products only.
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (!error && data) return data as Product;

  // Fall back to mockProducts — preserves the old page's fallback behavior
  // for the handful of mock ids ('1', 'b1', etc.) that never existed in
  // Supabase to begin with.
  return mockProducts.find((p) => p.id === id) ?? null;
});

// "More like this": 12 server-rendered product links per page, so products
// link to each other (not just to /shop's pagination) and Googlebot can walk
// the catalog. Filled in order of relevance:
//   1. manually curated related_product_ids (dashboard),
//   2. the fuzzy-similarity RPC,           (curated + similar capped at 8)
//   3. neighbours in the same section(s),  (a stable ring, see below)
//   4. neighbours in the whole catalog.    (always >= RELATED_MIN_RING slots)
// Steps 3-4 walk the catalog in a fixed order starting right after this
// product, so product N links to N+1, N+2, ... — every product therefore
// receives inbound links from the products before it, instead of relevance
// scoring piling links onto a few "hub" products and leaving others with none.
const RELATED_TOTAL = 12;
const RELATED_SIMILAR_MAX = 8;
const RELATED_MIN_RING = 2;
const LISTING_COLUMNS =
  'id,title,category,price_digital,price_physical,badge,tags,section_ids,room,bg_color,image_url,home_sort_order,sort_order,active,created_at,deleted_at';

type CatalogEntry = { id: string; section_ids: string[] | null };
let catalogCache: { at: number; entries: CatalogEntry[] } | null = null;

// Every active product id in a fixed order (same order as the shop grid, id as
// the final tie-break so paging through it is deterministic). Memoised for 5
// minutes per server process so 512 page renders don't each re-read it.
async function fetchCatalogOrder(): Promise<CatalogEntry[]> {
  if (catalogCache && Date.now() - catalogCache.at < 5 * 60 * 1000) return catalogCache.entries;
  const PAGE_SIZE = 1000;
  const entries: CatalogEntry[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, section_ids')
      .eq('active', true)
      .is('deleted_at', null)
      .order('home_sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    entries.push(...(data as CatalogEntry[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  if (entries.length > 0) catalogCache = { at: Date.now(), entries };
  return entries;
}

// Up to `want` ids from the catalog ring, starting just after `selfId`.
function ringPick(entries: CatalogEntry[], selfId: string, want: number, accept: (e: CatalogEntry) => boolean, exclude: Set<string>): string[] {
  const out: string[] = [];
  const start = entries.findIndex((e) => e.id === selfId) + 1; // 0 when not in the catalog
  for (let k = 0; k < entries.length && out.length < want; k++) {
    const e = entries[(start + k) % entries.length];
    if (e.id === selfId || exclude.has(e.id) || !accept(e)) continue;
    out.push(e.id);
  }
  return out;
}

async function fetchRelated(product: Product): Promise<Product[]> {
  const byId = new Map<string, Product>();
  const order: string[] = [];
  const add = (p: Product, max: number) => {
    if (p.id === product.id || byId.has(p.id) || p.active === false || p.deleted_at || order.length >= max) return;
    byId.set(p.id, p);
    order.push(p.id);
  };

  // 1. curated
  const { data: sourceProduct } = await supabaseAdmin
    .from('products')
    .select('related_product_ids')
    .eq('id', product.id)
    .single();
  const manualIds: string[] = sourceProduct?.related_product_ids || [];
  if (manualIds.length > 0) {
    const { data: relatedData } = await supabaseAdmin
      .from('products')
      .select(LISTING_COLUMNS)
      .in('id', manualIds)
      .eq('active', true)
      .is('deleted_at', null);
    const rows = new Map(((relatedData || []) as unknown as Product[]).map((p) => [p.id, p]));
    for (const mid of manualIds) { const p = rows.get(mid); if (p) add(p, RELATED_SIMILAR_MAX); }
  }

  // 2. similar by title
  if (order.length < RELATED_SIMILAR_MAX) {
    const { data: fuzzyRelated } = await supabaseAdmin.rpc('related_products_by_similarity', {
      product_id: product.id,
      result_limit: RELATED_TOTAL,
    });
    for (const p of (fuzzyRelated || []) as Product[]) add(p, RELATED_SIMILAR_MAX);
  }

  // 3 + 4. fixed-order neighbours (no placeholder/mock products: they aren't
  // real listings, their pages are noindex).
  const entries = await fetchCatalogOrder();
  const taken = new Set(order);
  const ringIds: string[] = [];
  const sections = new Set(product.section_ids || []);
  if (sections.size > 0) {
    ringIds.push(...ringPick(entries, product.id, RELATED_TOTAL - RELATED_MIN_RING - order.length, (e) => (e.section_ids || []).some((s) => sections.has(s)), taken));
  }
  ringIds.forEach((id) => taken.add(id));
  ringIds.push(...ringPick(entries, product.id, RELATED_TOTAL - order.length - ringIds.length, () => true, taken));

  if (ringIds.length > 0) {
    const { data: ringRows } = await supabaseAdmin
      .from('products')
      .select(LISTING_COLUMNS)
      .in('id', ringIds)
      .eq('active', true)
      .is('deleted_at', null);
    const rows = new Map(((ringRows || []) as unknown as Product[]).map((p) => [p.id, p]));
    for (const id of ringIds) { const p = rows.get(id); if (p) add(p, RELATED_TOTAL); }
  }

  return order.map((id) => byId.get(id)!).slice(0, RELATED_TOTAL);
}

// The real customer reviews linked to this product (customer_reviews.product_id),
// same ordering as /api/reviews. Fetched here on the server — and rendered
// into the HTML — because robots.txt blocks /api, so Googlebot never sees
// reviews that are loaded in the browser. Mock ids aren't UUIDs and would
// make Postgres reject the query, so they skip it.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function fetchReviews(product: Product): Promise<CustomerReviewRow[]> {
  if (!UUID_RE.test(product.id)) return [];
  const { data, error } = await supabaseAdmin
    .from('customer_reviews')
    .select('*')
    .eq('product_id', product.id)
    .order('review_date_parsed', { ascending: false, nullsFirst: false })
    .order('display_order', { ascending: true })
    .order('id', { ascending: true })
    .limit(100);
  if (error) {
    console.error('product page: failed to fetch reviews:', error.message);
    return [];
  }
  // Every row is linked to this product, so show its current live title
  // (what /api/reviews' product_title join does).
  return ((data || []) as CustomerReviewRow[]).map((r) => ({ ...r, product_title: product.title }));
}

export async function generateStaticParams() {
  // Pre-render every active, non-deleted product — same scope the sitemap
  // uses (app/sitemap.ts), so what's indexed and what's statically built
  // stay in sync. dynamicParams defaults to true, so ids outside this set
  // (mock ids, or products created after the last build) still render fine
  // on demand rather than 404ing.
  const PAGE_SIZE = 1000;
  const ids: Array<{ id: string }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('active', true)
      .is('deleted_at', null)
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data) break;
    ids.push(...data.map((p) => ({ id: p.id as string })));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return ids;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) return { title: 'Product not found' };

  const title = seoTitle(product.title);
  const description = metaDescription(product.title, product.description || '');
  const url = `${BASE_URL}/product/${product.id}`;

  // Trashed/inactive products and the built-in placeholder products still
  // resolve (so old links keep working) but must not be indexed.
  const indexable = product.active && !product.deleted_at && !mockProducts.some((m) => m.id === product.id);

  return {
    title,
    description,
    alternates: { canonical: url },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      images: product.image_url ? [{ url: product.image_url }] : [],
      url,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) notFound();

  const [related, reviews] = await Promise.all([fetchRelated(product), fetchReviews(product)]);

  // Product structured data — lets Google show price/availability in
  // results. aggregateRating/review come only from this product's real
  // linked reviews (see app/lib/reviews.ts) and are omitted entirely when it
  // has none. The "4.8 · 1,200+ reviews" banner on the page is a site-wide
  // figure, so it is deliberately NOT used here.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: seoTitle(product.title),
    description: cleanDescription(product.description || '') || metaDescription(product.title, ''),
    image: product.image_url ? [product.image_url] : undefined,
    sku: product.id,
    brand: { '@type': 'Brand', name: 'ItemssyPrints' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: product.price_digital,
      highPrice: Math.max(product.price_digital, ...PHYSICAL_SIZES.map((s) => s.price)),
      offerCount: 1 + PHYSICAL_SIZES.length,
      availability: product.active && !product.deleted_at ? 'https://schema.org/InStock' : 'https://schema.org/Discontinued',
      url: `${BASE_URL}/product/${product.id}`,
    },
    ...reviewJsonLd(reviews),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ProductPageClient
        product={product}
        related={related.map(toListingProduct)}
        reviews={{ photos: reviews.filter((r) => r.image_path), text: reviews.filter((r) => !r.image_path) }}
      />
    </>
  );
}
