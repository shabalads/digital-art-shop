// app/(shop)/bestsellers/page.tsx
//
// SEO fix: this used to be a 'use client' page that fetched /api/products in
// a useEffect and started from 10 hardcoded mock products (ids b1…b10).
// Googlebot got those mock cards — links to /product/b1 etc., which 404 —
// and robots.txt blocks /api, so its renderer could never load the real
// lists either. Now a Server Component: the real tagged products are in the
// first HTML response, no JS or API call needed. Re-generated every 5
// minutes so tag changes made in the dashboard show up quickly.

import type { Metadata } from 'next';
import Link from 'next/link';
import ProductCard from '../../components/ProductCard';
import { supabaseAdmin } from '../../lib/supabase';
import { Product, toListingProduct } from '../../data/products';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Bestselling Wall Art Prints',
  description: 'Our most popular digital wall art prints, new arrivals, trending designs and staff picks. Instant download or printed and shipped.',
  alternates: { canonical: '/bestsellers' },
};

const TAG_SECTIONS: { tag: string; title: string; desc: string }[] = [
  { tag: 'Bestseller', title: 'Bestsellers', desc: 'Our most popular prints — loved by thousands of customers.' },
  { tag: 'New', title: 'New Arrivals', desc: 'The latest designs, fresh off the (digital) press.' },
  { tag: 'Trending', title: 'Trending Now', desc: 'What everyone\'s adding to their walls right now.' },
  { tag: 'Staff pick', title: 'Staff Picks', desc: 'Hand-picked favorites from the ItemssyPrints team.' },
  { tag: 'Top rated', title: 'Top Rated', desc: 'Our highest-reviewed prints, chosen by hand.' },
];

// Same query /api/products?tag=…&limit=50 runs, then the same sort_order
// ordering the old client page applied on top of it.
async function fetchTagged(tag: string): Promise<Product[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('home_sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50)
    .eq('active', true)
    .is('deleted_at', null)
    .or(`tags.cs.{${tag}},badge.eq.${tag}`);
  return ((data || []) as any[]).sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
}

export default async function BestsellersPage() {
  const lists = await Promise.all(TAG_SECTIONS.map((s) => fetchTagged(s.tag)));

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px clamp(20px, 4vw, 40px) 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 48, maxWidth: 600 }}>
        <div style={{ fontSize: 11, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 14, fontWeight: 500 }}>
          Most loved
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 16 }}>
          Bestsellers
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Our most popular prints — loved by thousands of customers. Available as instant digital download or printed and shipped to your door.
        </p>
      </div>

      {/* One grid section per tag, skipped if empty */}
      {TAG_SECTIONS.map((section, idx) => {
        const products = lists[idx];
        if (products.length === 0) return null;
        return (
          <div key={section.tag} style={{ marginBottom: 64 }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 6 }}>
                {section.title}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{section.desc}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {products.map((p) => <ProductCard key={p.id} product={toListingProduct(p)} />)}
            </div>
          </div>
        );
      })}

      {/* Banner to full shop */}
      <div style={{
        background: '#F2EDE6', borderRadius: 16,
        padding: 'clamp(28px, 4vw, 48px) clamp(24px, 4vw, 56px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 32, flexWrap: 'wrap'
      }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 8 }}>
            Want to see everything?
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Browse our full collection of 600+ prints across all categories.
          </p>
        </div>
        <Link href="/shop" style={{
          background: 'var(--accent)', color: 'white', flexShrink: 0,
          borderRadius: 12, padding: '13px 28px', fontSize: 14, fontWeight: 500
        }}>
          Browse all prints →
        </Link>
      </div>
    </div>
  );
}
