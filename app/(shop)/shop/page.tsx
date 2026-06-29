// app/(shop)/shop/page.tsx

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Product, mockProducts, categories } from '../../data/products';
import ProductCard from '../../components/ProductCard';
import CategoryPills from '../../components/CategoryPills';
import SkeletonCard from '../../components/SkeletonCard';

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
const catParam = searchParams.get('cat');
  const qParam = searchParams.get('q');
  const sortParam = searchParams.get('sort');

  const [active, setActive] = useState(catParam ? catParam.charAt(0).toUpperCase() + catParam.slice(1) : 'All');
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState(sortParam || 'featured');

  useEffect(() => {
    if (sortParam) setSort(sortParam);
  }, [sortParam]);

  useEffect(() => {
    if (catParam) setActive(catParam.charAt(0).toUpperCase() + catParam.slice(1));
    else setActive('All');
  }, [catParam]);

  useEffect(() => {
    async function fetch_() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (active !== 'All') params.set('category', active.toLowerCase());
        if (qParam) params.set('q', qParam);
        params.set('limit', '500');
        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        if (data.products?.length > 0) setProducts(data.products);
        else setProducts(mockProducts);
      } catch { setProducts(mockProducts); }
      finally { setLoading(false); }
    }
    fetch_();
  }, [active, qParam]);

  const sorted = [...products].sort((a, b) => {
    if (sort === 'price-asc') return a.price_digital - b.price_digital;
    if (sort === 'price-desc') return b.price_digital - a.price_digital;
    if (sort === 'name') return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px clamp(20px, 4vw, 40px) 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, letterSpacing: '-0.8px', marginBottom: 4 }}>
            {qParam ? `Results for "${qParam}"` : active === 'All' ? 'All Prints' : active}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${sorted.length} designs`}
          </p>
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{
          background: 'var(--bg)', border: '0.5px solid var(--border)',
          borderRadius: 8, padding: '8px 14px', fontSize: 13,
          color: 'var(--text-primary)', outline: 'none', cursor: 'pointer'
        }}>
          <option value="featured">Featured</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      <div style={{ marginBottom: 32 }}>
        <CategoryPills active={active} onChange={(cat) => {
          setActive(cat);
          if (cat === 'All') router.push('/shop');
          else router.push(`/shop?cat=${cat.toLowerCase()}`);
        }} align="left" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : sorted.map(p => <ProductCard key={p.id} product={p} />)
        }
      </div>

      {!loading && sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>◻</div>
          <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No prints found</p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>Try a different category or search term.</p>
          <button onClick={() => { setActive('All'); router.push('/shop'); }} style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 24, padding: '10px 24px', fontSize: 14, cursor: 'pointer'
          }}>Clear filters</button>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return <Suspense><ShopContent /></Suspense>;
}