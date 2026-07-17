// app/(shop)/bestsellers/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { bestsellerProducts, Product } from '../../data/products';
import ProductCard from '../../components/ProductCard';

const TAG_SECTIONS: { tag: string; title: string; desc: string }[] = [
  { tag: 'Bestseller', title: 'Bestsellers', desc: 'Our most popular prints — loved by thousands of customers.' },
  { tag: 'New', title: 'New Arrivals', desc: 'The latest designs, fresh off the (digital) press.' },
  { tag: 'Trending', title: 'Trending Now', desc: 'What everyone\'s adding to their walls right now.' },
  { tag: 'Staff pick', title: 'Staff Picks', desc: 'Hand-picked favorites from the ItemssyPrints team.' },
  { tag: 'Top rated', title: 'Top Rated', desc: 'Our highest-reviewed prints, chosen by hand.' },
];

export default function BestsellersPage() {
  const [sections, setSections] = useState<Record<string, Product[]>>({ Bestseller: bestsellerProducts });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const results = await Promise.all(
          TAG_SECTIONS.map(s =>
            fetch(`/api/products?tag=${encodeURIComponent(s.tag)}&limit=50`)
              .then(r => r.json())
              .then(data => ({ tag: s.tag, products: data.products || [] }))
              .catch(() => ({ tag: s.tag, products: [] }))
          )
        );
        const next: Record<string, Product[]> = {};
        for (const r of results) {
          const sorted = [...r.products].sort((a: any, b: any) => ((a.sort_order ?? 999) - (b.sort_order ?? 999)));
          next[r.tag] = sorted;
        }
        // fallback to mock bestsellers if the DB has nothing tagged Bestseller yet
        if (!next['Bestseller'] || next['Bestseller'].length === 0) {
          next['Bestseller'] = bestsellerProducts;
        }
        setSections(next);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

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
        const products = sections[section.tag] || [];
        if (!loading && products.length === 0) return null;
        return (
          <div key={section.tag} style={{ marginBottom: 64 }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 6 }}>
                {section.title}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{section.desc}</p>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20,
              opacity: loading ? 0.4 : 1, transition: 'opacity 0.2s'
            }}>
              {loading && idx === 0
                ? bestsellerProducts.map(p => <ProductCard key={p.id} product={p} />)
                : products.map(p => <ProductCard key={p.id} product={p} />)
              }
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