// app/(shop)/bestsellers/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';
import { bestsellerProducts } from '../../data/products';
import ProductCard from '../../components/ProductCard';

export const metadata: Metadata = {
  title: 'Bestsellers',
  description: 'Our most loved digital wall art prints. Top rated designs available as instant download or printed and shipped.',
};

const bestsellers = bestsellerProducts;

export default function BestsellersPage() {
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

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, marginBottom: 64 }}>
        {bestsellers.map(p => <ProductCard key={p.id} product={p} />)}
      </div>

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