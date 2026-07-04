// app/dashboard/trash/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Product } from '../../data/products';
import Link from 'next/link';

export default function TrashPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);

  useEffect(() => { fetchTrashed(); }, []);

  async function fetchTrashed() {
    setLoading(true);
    try {
      const res = await fetch('/api/products?trashed=true&limit=500');
      const data = await res.json();
      setProducts(data.products || []);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function restore(id: string) {
    await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, deleted_at: null, active: true }),
    });
    fetchTrashed();
  }

  async function permanentDelete(id: string) {
    if (!confirm('Permanently delete? This cannot be undone.')) return;
    await fetch(`/api/products?id=${id}&permanent=true`, { method: 'DELETE' });
    fetchTrashed();
  }

  async function restoreSelected() {
    setWorking(true);
    await Promise.all([...selected].map(id =>
      fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, deleted_at: null, active: true }),
      })
    ));
    setSelected(new Set());
    fetchTrashed();
    setWorking(false);
  }

  async function deleteSelected() {
    if (!confirm(`Permanently delete ${selected.size} products?`)) return;
    setWorking(true);
    await Promise.all([...selected].map(id =>
      fetch(`/api/products?id=${id}&permanent=true`, { method: 'DELETE' })
    ));
    setSelected(new Set());
    fetchTrashed();
    setWorking(false);
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

  return (
    <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>
      <Link href="/dashboard/products" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Products</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Trash</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
        {products.length} deleted product{products.length !== 1 ? 's' : ''} — restore or permanently delete
      </p>

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#2C2420', borderRadius: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{selected.size} selected</span>
          <button onClick={restoreSelected} disabled={working} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: 'white' }}>Restore</button>
          <button onClick={deleteSelected} disabled={working} style={{ background: '#A32D2D', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer', color: 'white' }}>Delete permanently</button>
          <button onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', fontSize: 13, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', marginLeft: 'auto' }}>✕ Cancel</button>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <p>Trash is empty</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {products.map(p => (
            <div key={p.id} style={{
              background: 'white', borderRadius: 10, overflow: 'hidden',
              border: selected.has(p.id) ? '2px solid var(--accent)' : '0.5px solid var(--border-card)',
              position: 'relative', opacity: 0.85
            }}>
              <div onClick={() => toggleSelect(p.id)} style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, cursor: 'pointer' }}>
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
              <div style={{ aspectRatio: '3/4', background: p.bg_color, overflow: 'hidden', filter: 'grayscale(30%)' }}>
                {p.image_url
                  ? <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : null
                }
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, lineHeight: 1.3 }}>{cleanTitle(p.title)}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => restore(p.id)} style={{ flex: 1, fontSize: 11, padding: '5px 0', background: '#DCE8DC', borderRadius: 6, border: 'none', cursor: 'pointer', color: '#3B6D11', fontWeight: 500 }}>Restore</button>
                  <button onClick={() => permanentDelete(p.id)} style={{ fontSize: 11, padding: '5px 8px', background: '#FEF2F2', borderRadius: 6, border: 'none', cursor: 'pointer', color: '#A32D2D' }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}