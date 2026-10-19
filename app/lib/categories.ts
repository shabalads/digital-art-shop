// app/lib/categories.ts
//
// Server-side data for the category pages (/shop/<slug>). Server-only: it
// uses the service-role Supabase client, so never import it from a client
// component (the footer imports app/data/categories.ts instead).
//
// Both lookups are cached for 5 minutes, the same as the /shop catalog, so a
// crawl of every category and page costs a handful of queries rather than one
// per request. They THROW on a database error instead of returning an empty
// result: unstable_cache doesn't store a thrown error, and a visitor or
// Googlebot gets a 5xx (retried later) rather than a cached empty page that
// looks like a soft 404.

import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from './supabase';
import { CATEGORY_LINKS } from '../data/categories';
import { CATEGORY_COPY } from '../data/category-copy';
import { LISTING_COLUMNS, Product, SHOP_PAGE_SIZE } from '../data/products';

export type PublicCategory = {
  id: string;
  slug: string;
  name: string;
  productCount: number;
  // created_at of the newest product in the category — the only real
  // "last changed" date available (products have no updated_at). Null when
  // no product carries a created_at.
  newestAt: string | null;
};

// The categories that get a page: listed in CATEGORY_LINKS, with copy, backed
// by a section that exists and currently holds at least one active product.
// Anything else 404s and stays out of the footer, homepage and sitemap.
async function loadPublicCategories(): Promise<PublicCategory[]> {
  const { data: sections, error } = await supabaseAdmin.from('sections').select('id, slug');
  if (error) throw new Error(`categories: failed to load sections: ${error.message}`);

  // One pass over every active product's section_ids. PostgREST caps a single
  // response at 1000 rows (same gotcha documented in app/sitemap.ts), so page
  // through with .range().
  const stats = new Map<string, { count: number; newest: string | null }>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error: productsError } = await supabaseAdmin
      .from('products')
      .select('section_ids, created_at')
      .eq('active', true)
      .is('deleted_at', null)
      .order('id')
      .range(from, from + PAGE - 1);
    if (productsError) throw new Error(`categories: failed to load products: ${productsError.message}`);

    for (const p of data || []) {
      for (const sectionId of (p.section_ids || []) as string[]) {
        const s = stats.get(sectionId) || { count: 0, newest: null };
        s.count += 1;
        if (p.created_at && (!s.newest || p.created_at > s.newest)) s.newest = p.created_at;
        stats.set(sectionId, s);
      }
    }
    if (!data || data.length < PAGE) break;
  }

  const sectionIdBySlug = new Map((sections || []).map((s: { id: string; slug: string }) => [s.slug, s.id]));
  return CATEGORY_LINKS.flatMap((link) => {
    const id = sectionIdBySlug.get(link.slug);
    const s = id ? stats.get(id) : undefined;
    if (!id || !s || s.count === 0 || !CATEGORY_COPY[link.slug]) return [];
    return [{ id, slug: link.slug, name: link.name, productCount: s.count, newestAt: s.newest }];
  });
}

// Category pages (dynamic, per request) use the 5-minute copy.
export const getPublicCategories = unstable_cache(loadPublicCategories, ['public-categories'], { revalidate: 300 });

// The homepage and sitemap are hourly pages (`revalidate = 3600`). A 5-minute
// cache read during their render would pull their whole revalidation interval
// down to 5 minutes (the homepage loads the full catalog), so they read their
// own hourly copy of the same loader.
const getPublicCategoriesHourly = unstable_cache(loadPublicCategories, ['public-categories-hourly'], { revalidate: 3600 });

// For those surfaces a missing category list is better than a broken page:
// log and carry on without category links.
export async function getPublicCategoriesOrEmpty(): Promise<PublicCategory[]> {
  try {
    return await getPublicCategoriesHourly();
  } catch (e) {
    console.error('categories: could not load, continuing without category links:', e);
    return [];
  }
}

// One page of a category's products, in the same order as /shop (curated
// home_sort_order first, then newest). `id` is the final tiebreaker: without a
// total order, rows that tie on both keys can swap between requests and a
// product could show up on two pages or none.
async function loadCategoryPage(sectionId: string, page: number): Promise<{ products: Product[]; total: number }> {
  const from = (page - 1) * SHOP_PAGE_SIZE;
  const { data, count, error } = await supabaseAdmin
    .from('products')
    .select(LISTING_COLUMNS, { count: 'exact' })
    .eq('active', true)
    .is('deleted_at', null)
    .contains('section_ids', [sectionId])
    .order('home_sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, from + SHOP_PAGE_SIZE - 1);
  if (error) throw new Error(`categories: failed to load products for section ${sectionId}: ${error.message}`);
  return { products: (data || []) as unknown as Product[], total: count ?? 0 };
}

export const getCategoryPage = unstable_cache(loadCategoryPage, ['category-page'], { revalidate: 300 });
