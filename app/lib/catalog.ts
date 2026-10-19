// app/lib/catalog.ts
//
// The live number of prints for marketing copy ("Browse 512 prints"). It used
// to be a hardcoded "600+" in a dozen places while the catalog actually held
// fewer than that. Server-only: it uses the service-role Supabase client.
//
// "Active" matches every other catalog query on the site: active = true and
// not in the trash, so it equals what /shop and the sitemap list.
//
// Cached for an hour, the same cadence as the homepage and sitemap
// (`revalidate = 3600`), so reading it never lowers a page's revalidation
// interval. Throws on a database error (unstable_cache doesn't store a throw);
// callers use getActiveProductCountOrNull and fall back to wording without a
// number rather than to a made-up one.

import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from './supabase';

async function loadActiveProductCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('active', true)
    .is('deleted_at', null);
  if (error || count == null) throw new Error(`catalog: failed to count active products: ${error?.message ?? 'no count returned'}`);
  return count;
}

export const getActiveProductCount = unstable_cache(loadActiveProductCount, ['active-product-count'], { revalidate: 3600 });

export async function getActiveProductCountOrNull(): Promise<number | null> {
  try {
    return await getActiveProductCount();
  } catch (e) {
    console.error('catalog: could not load product count, using copy without a number:', e);
    return null;
  }
}
