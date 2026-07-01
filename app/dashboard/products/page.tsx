// app/dashboard/products/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Product } from '../../data/products';
import Link from 'next/link';

export default function DashboardProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

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
    setDeleting(id);
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    fetchProducts();
    setDeleting(null);
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
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  }

  async function batchDelete() {
    if (!confirm(`Delete ${selected.size} products? This cannot be undone.`)) return;
    setBatchLoading(true);
    await Promise.all([...selected].map(id =>
      fetch(`/api/products?id=${id}`, { method: 'DELETE' })
    ));
    setSelected(new Set());
    fetchProducts();
    setBatchLoading(false);
  }

  async function batchHide() {
    setBatchLoading(true);
    await Promise.all([...selected].map(id =>
      fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: false }),
      })
    ));
    setSelected(new Set());
    fetchProducts();
    setBatchLoading(false);
  }

  async function batchShow() {
    setBatchLoading(true);
    await Promise.all([...selected].map(id =>
      fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: true }),
      })
    ));
    setSelected(new Set());
    fetchProducts();
    setBatchLoading(false);
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>← Dashboard</Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Products</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{filtered.length} of {products.length} listings</p>
        </div>
        <Link href="/dashboard/products/new" style={{
          background: 'var(--accent)', color: 'white',
          borderRadius: 8, padding: '10px 20px', fontSize: 14, textDecoration: 'none'
        }}>
          + Add product
        </Link>
      </div>

      {/* Search + batch actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          style={{
            flex: 1, minWidth: 200, padding: '9px 14px', fontSize: 13,
            border: '0.5px solid var(--border)', borderRadius: 8,
            background: 'white', color: 'var(--text-primary)', outline: 'none'
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{
            background: 'none', border: '0.5px solid var(--border)', borderRadius: 8,
            padding: '9px 14px', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer'
          }}>Clear</button>
        )}
      </div>

      {/* Batch action bar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: '#EDE8E0', borderRadius: 8, marginBottom: 16, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {selected.size} selected
          </span>
          <button onClick={batchShow} disabled={batchLoading} style={{
            background: 'white', border: '0.5px solid var(--border)', borderRadius: 6,
            padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: '#3B6D11'
          }}>Show all</button>
          <button onClick={batchHide} disabled={batchLoading} style={{
            background: 'white', border: '0.5px solid var(--border)', borderRadius: 6,
            padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)'
          }}>Hide all</button>
          <button onClick={batchDelete} disabled={batchLoading} style={{
            background: 'white', border: '0.5px solid #E24B4A', borderRadius: 6,
            padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: '#A32D2D'
          }}>
            {batchLoading ? 'Deleting…' : 'Delete all'}
          </button>
          <button onClick={() => setSelected(new Set())} style={{
            background: 'none', border: 'none', fontSize: 13,
            color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto'
          }}>Cancel</button>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: 16 }}>No products found.</p>
          <button onClick={() => setSearch('')} style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer'
          }}>Clear search</button>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', width: 36 }}>
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer', width: 15, height: 15 }}
                />
              </th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Product</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Digital</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Physical</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{
                borderBottom: '0.5px solid var(--border)',
                background: selected.has(p.id) ? '#FAF5EE' : 'transparent'
              }}>
                <td style={{ padding: '10px 12px' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    style={{ cursor: 'pointer', width: 15, height: 15 }}
                  />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 48, borderRadius: 4, background: p.bg_color,
                      flexShrink: 0, overflow: 'hidden'
                    }}>
                      {p.image_url && (
                        <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <span style={{ fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title.length > 60 ? p.title.substring(0, 60) + '…' : p.title}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p.category}</td>
                <td style={{ padding: '10px 12px' }}>${p.price_digital.toFixed(2)}</td>
                <td style={{ padding: '10px 12px' }}>${p.price_physical.toFixed(2)}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    fontSize: 11, borderRadius: 4, padding: '2px 8px',
                    background: p.active ? '#DCE8DC' : '#F0EBE3',
                    color: p.active ? '#3B6D11' : '#8B7355'
                  }}>
                    {p.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Link href={`/dashboard/products/${p.id}`} style={{ fontSize: 12, color: 'var(--accent-soft)' }}>Edit</Link>
                    <button onClick={() => toggleActive(p.id, p.active)} style={{
                      fontSize: 12, color: 'var(--text-secondary)', background: 'none',
                      border: 'none', cursor: 'pointer', padding: 0
                    }}>
                      {p.active ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => deleteProduct(p.id)} style={{
                      fontSize: 12, color: '#A32D2D', background: 'none',
                      border: 'none', cursor: 'pointer', padding: 0,
                      opacity: deleting === p.id ? 0.5 : 1
                    }}>Delete</button>
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