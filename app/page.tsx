// app/page.tsx
//
// SEO fix (2026-09): HomeContent is a client component that used to fetch
// bestsellers, recently-added, sections and the main catalog in useEffects,
// with only 10 hardcoded mock products as its initial state — meaning the
// first HTML response (what a non-JS crawler sees) showed placeholder mock
// products, not the real 600+ catalog. This page now fetches all of that
// directly from Supabase and passes it down as props, so the real content
// is present on first render. HomeContent's own useEffects still run
// afterward and re-fetch client-side, unchanged — this only replaces the
// *initial* state with real data instead of mocks.

import type { Metadata } from 'next';
import HomeContent from './components/HomeContent';
import { supabaseAdmin } from './lib/supabase';
import { Product, toListingProduct } from './data/products';

export const metadata: Metadata = {
  title: 'Digital Wall Art Prints — Instant Download',
  description: 'Shop 600+ digital wall art prints. Instant download or get it printed and shipped. Abstract, botanical, typography, vintage and more.',
  alternates: { canonical: '/' },
};

export const revalidate = 3600;

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('active', true)
    .is('deleted_at', null)
    .order('home_sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return [];
  return data || [];
}

async function fetchBestsellers(): Promise<Product[]> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('active', true)
    .is('deleted_at', null)
    .or('tags.cs.{Bestseller},badge.eq.Bestseller')
    .limit(200);
  const { data: orderSetting } = await supabaseAdmin
    .from('settings')
    .select('value')
    .eq('key', 'tag_order:Bestseller')
    .single();

  const list = products || [];
  const savedOrder: string[] = Array.isArray(orderSetting?.value) ? orderSetting.value : [];
  if (list.length === 0) return [];

  const byId = new Map(list.map((p: any) => [p.id, p]));
  const ordered: Product[] = [];
  for (const id of savedOrder) {
    if (byId.has(id)) { ordered.push(byId.get(id)); byId.delete(id); }
  }
  ordered.push(...(Array.from(byId.values()) as Product[]));
  return ordered.slice(0, 5);
}

async function fetchRecentlyAdded(): Promise<Product[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('active', true)
    .is('deleted_at', null)
    .or('tags.cs.{New},badge.eq.New')
    .order('home_sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(6);
  return data || [];
}

async function fetchSections(): Promise<{
  shopCategories: Array<{ id: string; name: string }>;
  moodSections: Array<{ id: string; name: string; product_count: number }>;
}> {
  const { data: sections } = await supabaseAdmin.from('sections').select('*').order('sort_order', { ascending: true });
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('section_ids')
    .eq('active', true)
    .is('deleted_at', null);

  const counts: Record<string, number> = {};
  (products || []).forEach((p: any) => {
    (p.section_ids || []).forEach((sid: string) => {
      counts[sid] = (counts[sid] || 0) + 1;
    });
  });

  const sectionsWithCounts = (sections || []).map((s: any) => ({ ...s, product_count: counts[s.id] || 0 }));
  const shopCategories = [{ id: '', name: 'All' }, ...sectionsWithCounts.map((s: any) => ({ id: s.id, name: s.name }))];
  const moodSections = [...sectionsWithCounts].sort((a, b) => (b.product_count || 0) - (a.product_count || 0)).slice(0, 6);

  return { shopCategories, moodSections };
}

async function fetchMockupLinks(): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'mockup_links').single();
  return data?.value || {};
}

export default async function Home() {
  const [products, bestsellers, recentlyAdded, { shopCategories, moodSections }, mockupLinks] = await Promise.all([
    fetchProducts(),
    fetchBestsellers(),
    fetchRecentlyAdded(),
    fetchSections(),
    fetchMockupLinks(),
  ]);

  // Tells Google what the site is and what brand name to show in results.
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'ItemssyPrints', url: 'https://www.itemssyprints.com' },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'ItemssyPrints', url: 'https://www.itemssyprints.com' },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <HomeContent
        initialProducts={products.map(toListingProduct)}
        initialBestsellers={bestsellers.map(toListingProduct)}
        initialRecentlyAdded={recentlyAdded.map(toListingProduct)}
        initialShopCategories={shopCategories}
        initialMoodSections={moodSections}
        initialMockupLinks={mockupLinks}
      />
    </>
  );
}
