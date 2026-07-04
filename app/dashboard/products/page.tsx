// app/dashboard/products/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Product } from '../../data/products';
import Link from 'next/link';

export default function DashboardProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [tagMode, setTagMode] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(products); return; }
    const q = search.toLowerCase();
    setFiltered(products.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    ));
  }, [search, products]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch('/api/products?limit=1000');
      const data = await res.json();
      setProducts(data.products || []);
      setFiltered(data.products || []);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    fetchProducts();
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return;
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    fetchProducts();
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  }

  async function batchAction(action: 'delete' | 'hide' | 'show') {
    if (action === 'delete' && !confirm(`Delete ${selected.size} products? Cannot be undone.`)) return;
    setBatchLoading(true);
    await Promise.all([...selected].map(id => {
      if (action === 'delete') return fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      return fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: action === 'show' }),
      });
    }));
    setSelected(new Set());
    fetchProducts();
    setBatchLoading(false);
  }

  function cleanTitle(raw: string): string {
    const separators = [' | ', ' – ', ' - ', ', '];
    let cleaned = raw;
    for (const sep of separators) {
      const idx = cleaned.indexOf(sep);
      if (idx > 20) { cleaned = cleaned.substring(0, idx).trim(); break; }
    }
    return cleaned.length > 45 ? cleaned.substring(0, 45) + '…' : cleaned;
  }

  return (
    <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>← Dashboard</Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>Products</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{filtered.length} of {products.length} listings</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', border: '0.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setView('grid')} style={{
              padding: '7px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
              background: view === 'grid' ? 'var(--accent)' : 'white',
              color: view === 'grid' ? 'white' : 'var(--text-secondary)'
            }}>Grid</button>
            <button onClick={() => setView('list')} style={{
              padding: '7px 14px', fontSize: 13, border: 'none', cursor: 'pointer',
              background: view === 'list' ? 'var(--accent)' : 'white',
              color: view === 'list' ? 'white' : 'var(--text-secondary)'
            }}>List</button>
          </div>
<Link href="/dashboard/trash" style={{
            background: 'none', border: '0.5px solid var(--border)', color: 'var(--text-secondary)',
            borderRadius: 8, padding: '9px 18px', fontSize: 13, textDecoration: 'none'
          }}>🗑 Trash</Link>
          <Link href="/dashboard/products/new" style={{
            background: 'var(--accent)', color: 'white',
            borderRadius: 8, padding: '9px 18px', fontSize: 13, textDecoration: 'none', fontWeight: 500
          }}>+ Add product</Link>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          style={{
            width: '100%', padding: '10px 14px', fontSize: 13,
            border: '0.5px solid var(--border)', borderRadius: 8,
            background: 'white', color: 'var(--text-primary)', outline: 'none'
          }}
        />
      </div>

      {/* Quick tag bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Quick tag:</span>
        {['Bestseller', 'New', 'Trending', 'Staff pick', 'Top rated'].map(tag => (
          <button key={tag} onClick={() => setTagMode(tagMode === tag ? null : tag)} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: tagMode === tag
              ? tag === 'Bestseller' ? '#8B6F4E'
              : tag === 'New' ? '#3B6D11'
              : tag === 'Trending' ? '#6B3B8B'
              : '#2C2420'
              : 'var(--bg-pill)',
            color: tagMode === tag ? 'white' : 'var(--text-secondary)',
            transition: 'all 0.15s'
          }}>{tag}</button>
        ))}
        {tagMode && (
          <span style={{ fontSize: 12, color: 'var(--accent-soft)', fontStyle: 'italic' }}>
            Click any product to toggle "{tagMode}" tag
          </span>
        )}
        {tagMode && (
          <button onClick={() => setTagMode(null)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 4 }}>✕ Done</button>
        )}
      </div>

      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: '#2C2420', borderRadius: 8, marginBottom: 16, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{selected.size} selected</span>
          <button onClick={() => batchAction('show')} disabled={batchLoading} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: 'white' }}>Make active</button>
          <button onClick={() => batchAction('hide')} disabled={batchLoading} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: 'white' }}>Hide</button>
          <button onClick={() => batchAction('delete')} disabled={batchLoading} style={{ background: '#A32D2D', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: 'white' }}>
            {batchLoading ? 'Working…' : 'Delete'}
          </button>
          <button onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', fontSize: 13, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', marginLeft: 'auto' }}>✕ Cancel</button>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} style={{ width: 15, height: 15, cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={toggleSelectAll}>
            {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
          </span>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '40px 0' }}>Loading…</p>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {filtered.map(p => (
<div key={p.id} style={{
              background: 'white', borderRadius: 10, overflow: 'hidden',
              border: tagMode && p.badge === tagMode ? `2px solid ${tagMode === 'Bestseller' ? '#8B6F4E' : tagMode === 'New' ? '#3B6D11' : tagMode === 'Trending' ? '#6B3B8B' : '#2C2420'}`
                : selected.has(p.id) ? '2px solid var(--accent)'
                : '0.5px solid var(--border-card)',
              position: 'relative'
            }}>
              <div onClick={() => !tagMode && toggleSelect(p.id)} style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, cursor: tagMode ? 'default' : 'pointer', opacity: tagMode ? 0 : 1 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  background: selected.has(p.id) ? 'var(--accent)' : 'rgba(255,255,255,0.9)',
                  border: `1.5px solid ${selected.has(p.id) ? 'var(--accent)' : 'rgba(0,0,0,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: 'white'
                }}>
                  {selected.has(p.id) && '✓'}
                </div>
              </div>
<div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '2px 7px',
                  background: p.active ? 'rgba(59,109,17,0.9)' : 'rgba(139,115,85,0.9)',
                  color: 'white'
                }}>{p.active ? 'Active' : 'Hidden'}</span>
                {p.badge && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 7px',
                    background: p.badge === 'Bestseller' ? 'rgba(139,111,78,0.95)'
                      : p.badge === 'New' ? 'rgba(59,109,17,0.95)'
                      : p.badge === 'Trending' ? 'rgba(107,59,139,0.95)'
                      : 'rgba(44,36,32,0.95)',
                    color: 'white'
                  }}>{p.badge}</span>
                )}
              </div>
              <div style={{ aspectRatio: '3/4', background: p.bg_color, overflow: 'hidden', cursor: tagMode ? 'pointer' : 'pointer' }} onClick={async () => {
                if (tagMode) {
                  const newBadge = p.badge === tagMode ? '' : tagMode;
                  await fetch('/api/products', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: p.id, badge: newBadge }),
                  });
                  fetchProducts();
                } else {
                  toggleSelect(p.id);
                }
              }}>
                {p.image_url
                  ? <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                }
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, lineHeight: 1.3 }}>{cleanTitle(p.title)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'capitalize' }}>{p.category} · ${p.price_digital.toFixed(2)}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={`/dashboard/products/${p.id}`} style={{ flex: 1, textAlign: 'center', fontSize: 12, padding: '5px 0', background: 'var(--bg-pill)', borderRadius: 6, color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>Edit</Link>
                  <button onClick={() => toggleActive(p.id, p.active)} style={{ flex: 1, fontSize: 12, padding: '5px 0', background: 'var(--bg-pill)', borderRadius: 6, border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>{p.active ? 'Hide' : 'Show'}</button>
                  <button onClick={() => deleteProduct(p.id)} style={{ fontSize: 12, padding: '5px 8px', background: '#FEF2F2', borderRadius: 6, border: 'none', cursor: 'pointer', color: '#A32D2D' }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <th style={{ width: 36, padding: '8px 12px' }}></th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Product</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Digital</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '0.5px solid var(--border)', background: selected.has(p.id) ? '#FAF5EE' : 'transparent' }}>
                <td style={{ padding: '10px 12px' }}>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} style={{ cursor: 'pointer', width: 15, height: 15 }} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 52, borderRadius: 4, background: p.bg_color, flexShrink: 0, overflow: 'hidden' }}>
                      {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <span style={{ fontWeight: 500, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanTitle(p.title)}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p.category}</td>
                <td style={{ padding: '10px 12px' }}>${p.price_digital.toFixed(2)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ fontSize: 11, borderRadius: 4, padding: '2px 8px', background: p.active ? '#DCE8DC' : '#F0EBE3', color: p.active ? '#3B6D11' : '#8B7355' }}>
                    {p.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Link href={`/dashboard/products/${p.id}`} style={{ fontSize: 12, color: 'var(--accent-soft)' }}>Edit</Link>
                    <button onClick={() => toggleActive(p.id, p.active)} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{p.active ? 'Hide' : 'Show'}</button>
                    <button onClick={() => deleteProduct(p.id)} style={{ fontSize: 12, color: '#A32D2D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}