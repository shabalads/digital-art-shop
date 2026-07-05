// app/(shop)/favorites/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Product } from '../../data/products';
import ProductCard from '../../components/ProductCard';
import Link from 'next/link';

export default function FavoritesPage() {
  const { user, isSignedIn } = useUser();
  const [products, setProducts] = useState<Product[]>([]);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn || !user) { setLoading(false); return; }
    async function load() {
      try {
        const res = await fetch(`/api/favorites?userId=${user!.id}`);
        const data = await res.json();
        const ids: string[] = data.favorites || [];
        setFavoritedIds(new Set(ids));
        localStorage.setItem('favorites', JSON.stringify(ids));

        if (ids.length > 0) {
          // Fetch all products and filter client-side to avoid URL length issues
          const productRes = await fetch('/api/products?limit=1000');
          const productData = await productRes.json();
          const favSet = new Set(ids);
          const favProducts = (productData.products || []).filter((p: Product) => favSet.has(p.id));
          setProducts(favProducts);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isSignedIn, user]);

  if (!isSignedIn) return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '100px 40px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 20 }}>♡</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 10 }}>Your favourites</h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>Sign in to save and view your favourite prints.</p>
      <Link href="/sign-in" style={{ background: 'var(--accent)', color: 'white', borderRadius: 24, padding: '12px 28px', fontSize: 14, fontWeight: 500 }}>Sign in</Link>
    </div>
  );

  if (loading) return (
    <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
  );

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '48px clamp(20px, 4vw, 40px) 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>Saved prints</div>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, letterSpacing: '-0.8px' }}>Your favourites</h1>
        {products.length > 0 && <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>{products.length} saved print{products.length !== 1 ? 's' : ''}</p>}
      </div>

      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>♡</div>
          <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No favourites yet</p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>Tap the heart on any print to save it here.</p>
          <Link href="/shop" style={{ background: 'var(--accent)', color: 'white', borderRadius: 24, padding: '12px 28px', fontSize: 14, fontWeight: 500 }}>Browse prints</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
          {products.map(p => <ProductCard key={p.id} product={p} favoritedIds={favoritedIds} />)}
        </div>
      )}
    </div>
  );
}