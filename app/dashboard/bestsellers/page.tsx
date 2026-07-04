// app/dashboard/bestsellers/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product } from '../../data/products';

export default function BestsellerManagerPage() {
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/products?limit=1000');
    const data = await res.json();
    const all: Product[] = data.products || [];
    setAllProducts(all);
    const bs = all
      .filter(p => p.badge === 'Bestseller')
      .sort((a, b) => ((a as any).sort_order ?? 999) - ((b as any).sort_order ?? 999));
    setBestsellers(bs);
    setLoading(false);
  }

  async function saveOrder(items: Product[]) {
    setSaving(true);
    await Promise.all(items.map((p, i) =>
      fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, sort_order: i }),
      })
    ));
    setSaving(false);
  }

  async function removeBestseller(id: string) {
    await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, badge: '', sort_order: null }),
    });
    load();
  }

  async function addBestseller(product: Product) {
    await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: product.id, badge: 'Bestseller', sort_order: bestsellers.length }),
    });
    setSearch('');
    setShowPicker(false);
    load();
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const updated = [...bestsellers];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setBestsellers(updated);
    saveOrder(updated);
  }

  function moveDown(idx: number) {
    if (idx === bestsellers.length - 1) return;
    const updated = [...bestsellers];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setBestsellers(updated);
    saveOrder(updated);
  }

  function cleanTitle(raw: string): string {
    const separators = [' | ', ' – ', ' - ', ', '];
    let cleaned = raw;
    for (const sep of separators) {
      const idx = cleaned.indexOf(sep);
      if (idx > 20) { cleaned = cleaned.substring(0, idx).trim(); break; }
    }
    return cleaned.length > 50 ? cleaned.substring(0, 50) + '…' : cleaned;
  }

  const nonBestsellers = allProducts.filter(p => p.badge !== 'Bestseller');
  const filtered = search.trim()
    ? nonBestsellers.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : nonBestsellers;

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto' }}>
      <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Dashboard</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Bestseller Manager</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saving && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Saving…</span>}
          <button onClick={() => setShowPicker(!showPicker)} style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer'
          }}>+ Add bestseller</button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
        {bestsellers.length} bestsellers total — first 5 show on homepage. Use arrows to reorder.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: showPicker ? '1fr 1fr' : '1fr', gap: 32 }}>

        {/* Left — bestseller list */}
        <div>
          {/* Homepage preview label */}
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 10 }}>
            Visible on homepage (first 5)
          </div>

          {bestsellers.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
              No bestsellers yet — click "+ Add bestseller" to get started
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bestsellers.map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10,
                  background: i < 5 ? 'white' : '#F8F6F3',
                  border: i < 5 ? '0.5px solid var(--border)' : '0.5px dashed var(--border)',
                  position: 'relative'
                }}>
                  {/* Position number */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: i < 5 ? '#8B6F4E' : 'var(--bg-pill)',
                    color: i < 5 ? 'white' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700
                  }}>{i + 1}</div>

                  {/* Image */}
                  <div style={{ width: 44, height: 58, borderRadius: 6, background: p.bg_color, overflow: 'hidden', flexShrink: 0 }}>
                    {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanTitle(p.title)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>{p.category} · ${p.price_digital.toFixed(2)}</div>
                    {i === 4 && (
                      <div style={{ fontSize: 10, color: '#8B6F4E', marginTop: 3, fontWeight: 600 }}>↑ Last visible on homepage</div>
                    )}
                    {i === 5 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>Hidden on homepage (position {i + 1}+)</div>
                    )}
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => moveUp(i)} disabled={i === 0} style={{
                      width: 26, height: 26, borderRadius: 4, border: '0.5px solid var(--border)',
                      background: 'white', cursor: i === 0 ? 'not-allowed' : 'pointer',
                      fontSize: 12, opacity: i === 0 ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>↑</button>
                    <button onClick={() => moveDown(i)} disabled={i === bestsellers.length - 1} style={{
                      width: 26, height: 26, borderRadius: 4, border: '0.5px solid var(--border)',
                      background: 'white', cursor: i === bestsellers.length - 1 ? 'not-allowed' : 'pointer',
                      fontSize: 12, opacity: i === bestsellers.length - 1 ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>↓</button>
                  </div>

                  <button onClick={() => removeBestseller(p.id)} style={{
                    flexShrink: 0, background: '#FEF2F2', border: 'none',
                    borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                    color: '#A32D2D', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>✕</button>

                  {/* Separator after position 5 */}
                  {i === 4 && bestsellers.length > 5 && (
                    <div style={{
                      position: 'absolute', bottom: -12, left: 0, right: 0,
                      borderBottom: '1px dashed #C4A882',
                      fontSize: 10, textAlign: 'center', color: '#8B6F4E'
                    }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {bestsellers.length > 5 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
              {bestsellers.length - 5} more bestseller{bestsellers.length - 5 !== 1 ? 's' : ''} not shown on homepage
            </div>
          )}
        </div>

        {/* Right — product picker */}
        {showPicker && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add to bestsellers</div>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              style={{
                width: '100%', padding: '10px 14px', fontSize: 13,
                border: '0.5px solid var(--border)', borderRadius: 8,
                background: 'white', outline: 'none', marginBottom: 10
              }}
            />
            <div style={{ height: 560, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => addBestseller(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', cursor: 'pointer', borderRadius: 8,
                    background: 'white', border: '0.5px solid var(--border)',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAF5EE'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'white'}
                >
                  <div style={{ width: 40, height: 52, borderRadius: 6, background: p.bg_color, overflow: 'hidden', flexShrink: 0 }}>
                    {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanTitle(p.title)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>{p.category} · ${p.price_digital.toFixed(2)}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--accent-soft)', flexShrink: 0 }}>+ Add</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}