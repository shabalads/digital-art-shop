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
import { mockProducts, Product } from '../../../data/products';
import { supabaseAdmin } from '../../../lib/supabase';
import { cleanDescription, seoTitle, metaDescription } from './product-utils';
import { PHYSICAL_SIZES } from '../../../data/physical-sizes';
import ProductPageClient from './ProductPageClient';

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

// Mirrors app/api/products/route.ts's `related_to` handling: manually
// curated related_product_ids first (filtered to active/non-deleted), then
// the fuzzy-similarity RPC as a fallback. Done directly against Supabase
// here (rather than calling the API route) since this runs server-side
// during rendering/build.
async function fetchRelated(product: Product): Promise<Product[]> {
  const { data: sourceProduct } = await supabaseAdmin
    .from('products')
    .select('related_product_ids')
    .eq('id', product.id)
    .single();

  const manualIds: string[] = sourceProduct?.related_product_ids || [];

  if (manualIds.length > 0) {
    const { data: relatedData } = await supabaseAdmin
      .from('products')
      .select('*')
      .in('id', manualIds)
      .eq('active', true)
      .is('deleted_at', null);

    const byId = new Map((relatedData || []).map((p: any) => [p.id, p]));
    const ordered = manualIds.map((mid) => byId.get(mid)).filter(Boolean) as Product[];
    if (ordered.length > 0) return ordered.slice(0, 4);
  }

  const { data: fuzzyRelated } = await supabaseAdmin.rpc('related_products_by_similarity', {
    product_id: product.id,
    result_limit: 4,
  });
  if (fuzzyRelated && fuzzyRelated.length > 0) {
    return (fuzzyRelated as Product[]).filter((r) => r.id !== product.id).slice(0, 4);
  }

  // No placeholder fallback: the built-in mock products aren't real listings
  // (their pages are noindex), so showing them as "related" would put fake
  // products in front of customers and link Google to them.
  return [];
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

  const related = await fetchRelated(product);

  // Product structured data — lets Google show price/availability in
  // results. Deliberately no aggregateRating: the on-page review count is
  // site-wide, not per product, and Google penalises ratings that aren't.
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
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ProductPageClient product={product} related={related} />
    </>
  );
}
