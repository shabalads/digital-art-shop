// app/(shop)/shop/page.tsx

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '../../components/ProductCard';
import SkeletonCard from '../../components/SkeletonCard';
import { Product } from '../../data/products';

const PAGE_SIZE = 40;

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
const qParam = searchParams.get('q') || '';
  const sectionParam = searchParams.get('section') || '';
  const roomParam = searchParams.get('room') || '';
  const pageParam = parseInt(searchParams.get('page') || '1') || 1;

  const [products, setProducts] = useState<Product[]>([]);
  const [sections, setSections] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(sectionParam);
  const [activeRoom, setActiveRoom] = useState(roomParam);
  const [sort, setSort] = useState('featured');
  const [searchInput, setSearchInput] = useState(qParam);
  const [page, setPage] = useState(pageParam);

  // Load sections
  useEffect(() => {
    fetch('/api/sections')
      .then(r => r.json())
      .then(data => setSections(data.sections || []));
  }, []);

// Load products
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (qParam) params.set('q', qParam);
        params.set('limit', '1000');
        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        setProducts(data.products || []);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [qParam]);

  // Restore scroll position after returning from a product page (once content is loaded and rendered)
  useEffect(() => {
    if (loading) return;
    const key = `shop-scroll:${window.location.pathname}${window.location.search}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: parseInt(saved), behavior: 'auto' });
      });
      sessionStorage.removeItem(key);
    }
  }, [loading, page, activeSection, products.length]);

  function saveScrollBeforeLeaving() {
    const key = `shop-scroll:${window.location.pathname}${window.location.search}`;
    sessionStorage.setItem(key, String(window.scrollY));
  }

// Sync URL params to state (page synced from URL directly so browser back/forward restores it)
  useEffect(() => { setActiveSection(sectionParam); }, [sectionParam]);
  useEffect(() => { setActiveRoom(roomParam); }, [roomParam]);
  useEffect(() => { setSearchInput(qParam); }, [qParam]);
  useEffect(() => { setPage(pageParam); }, [pageParam]);

// Filter by section and/or room
  const filtered = products.filter(p => {
    if (activeSection && !(p.section_ids || []).includes(activeSection)) return false;
    if (activeRoom && (p as any).room !== activeRoom) return false;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price-asc') return a.price_digital - b.price_digital;
    if (sort === 'price-desc') return b.price_digital - a.price_digital;
    if (sort === 'name') return a.title.localeCompare(b.title);
if (sort === 'name') return a.title.localeCompare(b.title);
    return ((a as any).home_sort_order ?? 999999) - ((b as any).home_sort_order ?? 999999);
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

function selectSection(id: string) {
    setActiveSection(id);
    const params = new URLSearchParams();
    if (id) params.set('section', id);
    if (qParam) params.set('q', qParam);
    router.push(`/shop${params.toString() ? '?' + params.toString() : ''}`);
  }

  function goToPage(n: number) {
    const params = new URLSearchParams();
    if (activeSection) params.set('section', activeSection);
    if (qParam) params.set('q', qParam);
    if (n > 1) params.set('page', String(n));
    router.push(`/shop${params.toString() ? '?' + params.toString() : ''}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px clamp(20px, 4vw, 40px) 80px' }}>

      {/* Search bar */}
      <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto 36px' }}>
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
          placeholder="Search 500+ prints…"
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
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: '#8B7355', lineHeight: 1
          }}>×</button>
        )}
      </div>

      {/* Section filter pills */}
      {sections.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, justifyContent: 'center' }}>
          <button
            onClick={() => selectSection('')}
            style={{
              padding: '8px 20px', borderRadius: 24, fontSize: 13, cursor: 'pointer',
              background: !activeSection ? 'var(--accent)' : 'white',
              color: !activeSection ? 'white' : 'var(--text-secondary)',
              border: `0.5px solid ${!activeSection ? 'var(--accent)' : 'var(--border)'}`,
              fontWeight: !activeSection ? 600 : 400, transition: 'all 0.15s'
            }}
          >All</button>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => selectSection(s.id)}
              style={{
                padding: '8px 20px', borderRadius: 24, fontSize: 13, cursor: 'pointer',
                background: activeSection === s.id ? 'var(--accent)' : 'white',
                color: activeSection === s.id ? 'white' : 'var(--text-secondary)',
                border: `0.5px solid ${activeSection === s.id ? 'var(--accent)' : 'var(--border)'}`,
                fontWeight: activeSection === s.id ? 600 : 400, transition: 'all 0.15s'
              }}
            >{s.name}</button>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
<h1 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 2 }}>
            {qParam
              ? `Results for "${qParam}"`
              : activeRoom
              ? `Perfect for the ${activeRoom}`
              : activeSection
              ? sections.find(s => s.id === activeSection)?.name || 'All Prints'
              : 'All Prints'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : `${sorted.length} design${sorted.length !== 1 ? 's' : ''}`}
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

{/* Grid */}
      <div onClickCapture={saveScrollBeforeLeaving} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, opacity: loading ? 0.4 : 1, transition: 'opacity 0.2s' }}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : paginated.map(p => <ProductCard key={p.id} product={p} />)
        }
      </div>

      {/* Empty state */}
      {!loading && sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>◻</div>
          <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No prints found</p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>Try a different section or search term.</p>
          <button onClick={() => { selectSection(''); router.push('/shop'); }} style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 24, padding: '10px 24px', fontSize: 14, cursor: 'pointer'
          }}>Show all prints</button>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 48, flexWrap: 'wrap' }}>
<button onClick={() => goToPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, cursor: page === 1 ? 'not-allowed' : 'pointer', background: 'white', border: '0.5px solid var(--border)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', opacity: page === 1 ? 0.4 : 1 }}>← Previous</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
            .reduce((acc: (number | string)[], n, idx, arr) => {
              if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
              acc.push(n);
              return acc;
            }, [])
            .map((n, i) => n === '...'
              ? <span key={`dot-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
              : <button key={n} onClick={() => goToPage(n as number)} style={{ width: 36, height: 36, borderRadius: 8, fontSize: 13, cursor: 'pointer', background: page === n ? 'var(--accent)' : 'white', border: `0.5px solid ${page === n ? 'var(--accent)' : 'var(--border)'}`, color: page === n ? 'white' : 'var(--text-primary)', fontWeight: page === n ? 600 : 400 }}>{n}</button>
            )
          }
          <button onClick={() => goToPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: 'white', border: '0.5px solid var(--border)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
      {!loading && totalPages > 1 && (
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
          Page {page} of {totalPages} · {sorted.length} designs
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return <Suspense><ShopContent /></Suspense>;
}