// app/(dashboard)/dashboard/products/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Product } from '../../data/products';
import Link from 'next/link';

export default function DashboardProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch('/api/products?limit=500');
      const data = await res.json();
      setProducts(data.products || []);
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

  return (
    <div style={{ padding: '40px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Dashboard</Link>
        <h1 style={{ fontSize: 26, fontWeight: 500, marginBottom: 4 }}>Products</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{products.length} listings</p>
        </div>
        <Link href="/dashboard/products/new" style={{
          background: 'var(--accent)', color: 'white',
          borderRadius: 8, padding: '10px 20px', fontSize: 14
        }}>
          + Add product
        </Link>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Search products…"
          onChange={e => {
            const q = e.target.value.toLowerCase();
            if (!q) fetchProducts();
            else setProducts(prev => prev.filter(p => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
          }}
          style={{
            padding: '9px 14px', fontSize: 13, width: 280,
            border: '0.5px solid var(--border)', borderRadius: 8,
            background: 'white', color: 'var(--text-primary)', outline: 'none'
          }}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: 16 }}>No products yet.</p>
          <Link href="/dashboard/products/new" style={{
            background: 'var(--accent)', color: 'white',
            borderRadius: 8, padding: '10px 20px', fontSize: 14
          }}>Add your first product</Link>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Product</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Digital</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Physical</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 48, borderRadius: 4, background: p.bg_color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 500 }}>{p.title}</span>
                </td>
                <td style={{ padding: '12px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p.category}</td>
                <td style={{ padding: '12px' }}>${p.price_digital.toFixed(2)}</td>
                <td style={{ padding: '12px' }}>${p.price_physical.toFixed(2)}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    fontSize: 11, borderRadius: 4, padding: '2px 8px',
                    background: p.active ? '#DCE8DC' : '#F0EBE3',
                    color: p.active ? '#3B6D11' : '#8B7355'
                  }}>
                    {p.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/dashboard/products/${p.id}`} style={{
                      fontSize: 12, color: 'var(--accent-soft)', textDecoration: 'none'
                    }}>Edit</Link>
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