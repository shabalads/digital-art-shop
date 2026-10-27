// app/(shop)/shop/page.tsx
//
// SEO fix (2026-09): was fully client-side ('use client', fetch in
// useEffect) — Google's crawler saw an empty grid on /shop, the single most
// important listing page for indexing the catalog. Now a Server Component
// that fetches the initial product + section list directly from Supabase
// (mirroring app/api/products/route.ts's default query) and passes it to
// ShopPageClient, which keeps all existing interactivity (search, section/
// room filters, sort, pagination) exactly as before — it just seeds from
// real data instead of an empty array, so crawlers get real product cards
// in the first HTML response with no JS required.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '../../lib/supabase';
import { getActiveProductCountOrNull } from '../../lib/catalog';
import { countPhrase } from '../../lib/text';
import { LISTING_COLUMNS, Product, SHOP_PAGE_SIZE, toListingProduct } from '../../data/products';
import ShopPageClient from './ShopPageClient';

// /shop?page=N gets its own canonical (not /shop) so Google indexes each
// page of the grid and follows its product links, instead of folding
// every page into page 1. Search/section variants still canonicalise to
// /shop.
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
  const sp = await searchParams;
  const page = typeof sp.page === 'string' ? parseInt(sp.page) || 1 : 1;
  const plain = !sp.q && !sp.section && !sp.room;
  const paged = plain && page > 1;
  const total = await getActiveProductCountOrNull();
  return {
    // Internal search results are thin, endless variations — keep them out of
    // the index but let Google follow their product links.
    ...(sp.q ? { robots: { index: false, follow: true } } : {}),
    title: paged ? `Shop All Prints – Page ${page}` : 'Shop All Prints',
    description: `Browse ${countPhrase(total, 'digital wall art prints')}. Instant download or printed and shipped. Abstract, botanical, typography, vintage and more.`,
    alternates: { canonical: `https://www.itemssyprints.com/shop${paged ? `?page=${page}` : ''}` },
  };
}

async function fetchInitialProducts(q: string): Promise<Product[]> {
  let query = supabaseAdmin
    .from('products')
    .select(LISTING_COLUMNS)
    .eq('active', true)
    .is('deleted_at', null)
    .order('home_sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1000);

  if (q) {
    const STOPWORDS = new Set(['a', 'an', 'the', 'of', 'for', 'and', 'or', 'in', 'on', 'with', 'to']);
    const allWords = q.trim().split(/\s+/).filter(Boolean);
    const words = allWords.filter((w) => w.length > 2 && !STOPWORDS.has(w.toLowerCase()));
    for (const word of words.length > 0 ? words : allWords) {
      const escaped = word.replace(/[%_]/g, '\\$&');
      query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('shop page: failed to fetch products from Supabase:', error.message);
    return [];
  }

  if (q && (!data || data.length === 0)) {
    const { data: fuzzyData } = await supabaseAdmin.rpc('search_products_fuzzy', { search_term: q, result_limit: 1000 });
    if (fuzzyData && fuzzyData.length > 0) return fuzzyData as Product[];
  }

  return (data || []) as Product[];
}

// The unfiltered catalog is identical for every visitor and every ?page=N, so
// share one copy across requests for 5 minutes instead of re-querying the
// database each time (a crawl of all 13 pages used to mean 13 full queries,
// ~1.7 s each). Searches (q) are arbitrary strings and stay uncached.
const getCachedCatalog = unstable_cache(() => fetchInitialProducts(''), ['shop-catalog'], { revalidate: 300 });

async function fetchSections(): Promise<Array<{ id: string; name: string }>> {
  const { data } = await supabaseAdmin.from('sections').select('id, name').order('sort_order', { ascending: true });
  return data || [];
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';

  const [products, sections, totalPrints] = await Promise.all([
    q ? fetchInitialProducts(q) : getCachedCatalog(),
    fetchSections(),
    getActiveProductCountOrNull(),
  ]);

  // ?page=14 on a 13-page shop used to return 200 with an empty grid and a
  // "Next" link to page 15 — an endless crawl trap and a pile of soft 404s.
  // Only the plain listing is checked here: section/room filters are applied
  // in the browser, so the server can't know their page count.
  const page = typeof sp.page === 'string' ? parseInt(sp.page) || 1 : 1;
  const plain = !q && !sp.section && !sp.room;
  if (plain && page > Math.max(1, Math.ceil(products.length / SHOP_PAGE_SIZE))) notFound();

  return <ShopPageClient initialProducts={products.map(toListingProduct)} initialSections={sections} totalPrints={totalPrints} />;
}
