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
import { supabaseAdmin } from '../../lib/supabase';
import { Product } from '../../data/products';
import ShopPageClient from './ShopPageClient';

export const metadata: Metadata = {
  title: 'Shop All Prints | ItemssyPrints',
  description: 'Browse 600+ digital wall art prints. Instant download or printed and shipped. Abstract, botanical, typography, vintage and more.',
  alternates: { canonical: 'https://www.itemssyprints.com/shop' },
};

async function fetchInitialProducts(q: string): Promise<Product[]> {
  let query = supabaseAdmin
    .from('products')
    .select('*')
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

async function fetchSections(): Promise<Array<{ id: string; name: string }>> {
  const { data } = await supabaseAdmin.from('sections').select('id, name').order('sort_order', { ascending: true });
  return data || [];
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';

  const [products, sections] = await Promise.all([fetchInitialProducts(q), fetchSections()]);

  return <ShopPageClient initialProducts={products} initialSections={sections} />;
}
