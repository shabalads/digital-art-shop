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
const [sort, setSort] = useState('featured');
  const [searchInput, setSearchInput] = useState(qParam || '');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 40;

  useEffect(() => {
    if (sortParam) setSort(sortParam);
  }, [sortParam]);

useEffect(() => {
    if (catParam) setActive(catParam.charAt(0).toUpperCase() + catParam.slice(1));
    else setActive('All');
  }, [catParam]);

useEffect(() => {
    setSearchInput(qParam || '');
    setPage(1);
  }, [qParam]);

  useEffect(() => {
    setPage(1);
  }, [active, sort]);

  useEffect(() => {
    async function fetch_() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (active !== 'All') params.set('category', active.toLowerCase());
        if (qParam) params.set('q', qParam);
        params.set('limit', '1000');
        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
if (data.products?.length > 0) setProducts(data.products);
        else setProducts([]);
      } catch { setProducts([]); }
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
{/* Search bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto 24px' }}>
          <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#8B7355', pointerEvents: 'none' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchInput.trim()) {
                router.push(`/shop?q=${encodeURIComponent(searchInput.trim())}`);
              }
              if (e.key === 'Escape') { setSearchInput(''); router.push('/shop'); }
            }}
            placeholder="Search 500+ prints… try 'beach', 'botanical', 'vintage'"
            style={{
              width: '100%', padding: '14px 44px 14px 46px', fontSize: 15,
              border: '1px solid #D4C4B0', borderRadius: 28,
              background: 'white', color: '#1E1810', outline: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
            }}
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); router.push('/shop'); }} style={{
              position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
              color: '#8B7355', lineHeight: 1
            }}>×</button>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, letterSpacing: '-0.8px', marginBottom: 4 }}>
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
      </div>

      <div style={{ marginBottom: 32 }}>
        <CategoryPills active={active} onChange={(cat) => {
          setActive(cat);
          if (cat === 'All') router.push('/shop');
          else router.push(`/shop?cat=${cat.toLowerCase()}`);
        }} align="left" />
      </div>
{(() => {
        const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
        const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                : paginated.map(p => <ProductCard key={p.id} product={p} />)
              }
            </div>
            {!loading && totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 48, flexWrap: 'wrap' }}>
                <button onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={page === 1} style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', background: 'white', border: '0.5px solid var(--border)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', opacity: page === 1 ? 0.4 : 1 }}>← Previous</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                  .reduce((acc: (number | string)[], n, idx, arr) => {
                    if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) => n === '...'
                    ? <span key={`dot-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
                    : <button key={n} onClick={() => { setPage(n as number); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ width: 36, height: 36, borderRadius: 8, fontSize: 13, cursor: 'pointer', background: page === n ? 'var(--accent)' : 'white', border: `0.5px solid ${page === n ? 'var(--accent)' : 'var(--border)'}`, color: page === n ? 'white' : 'var(--text-primary)', fontWeight: page === n ? 600 : 400 }}>{n}</button>
                  )
                }
                <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={page === totalPages} style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: 'white', border: '0.5px solid var(--border)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
              </div>
            )}
            {!loading && (
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} · {sorted.length} designs
              </div>
            )}
          </>
        );
      })()}

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