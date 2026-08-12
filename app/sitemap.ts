// app/sitemap.ts
//
// Was previously static-only (8 hardcoded pages, no products, and pointed
// at the OLD domain itemssycrafts.com). Fixed 2026-08-11: now queries the
// live Supabase `products` table for every active, non-deleted product and
// points at the real domain, itemssyprints.com, so Google indexes actual
// working product pages instead of nothing / dead links.

import { MetadataRoute } from 'next';
import { supabaseAdmin } from './lib/supabase';

// Revalidate hourly rather than force-dynamic — the catalog doesn't change
// minute-to-minute, and this avoids hitting Supabase on every crawler hit.
export const revalidate = 3600;

const BASE_URL = 'https://www.itemssyprints.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '', priority: 1, changeFrequency: 'daily' },
    { path: '/shop', priority: 0.9, changeFrequency: 'daily' },
    { path: '/bestsellers', priority: 0.9, changeFrequency: 'daily' },
    { path: '/reviews', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/faq', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/refunds', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPages.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  // Only active, non-deleted products — these are the only product pages
  // that actually resolve (see app/api/products/route.ts's default filter:
  // .eq('active', true).is('deleted_at', null)). Listing an inactive or
  // trashed product here would send Googlebot to a "Product not found"
  // page, which hurts crawl budget and rankings.
  //
  // PostgREST caps a single response at 1000 rows (same gotcha documented
  // in app/api/admin/match-reviews/queue/route.ts) — the catalog is well
  // under Google's 50,000-URL sitemap limit, but IS already past 1000 rows,
  // so this pages through with .range() instead of a single .select().
  const PAGE_SIZE = 1000;
  const products: Array<{ id: string; created_at: string }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, created_at')
      .eq('active', true)
      .is('deleted_at', null)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('sitemap: failed to fetch products from Supabase:', error.message);
      break;
    }

    const batch = data || [];
    products.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/product/${p.id}`,
    lastModified: p.created_at ? new Date(p.created_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries];
}
