// app/dashboard/categories/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Category = { id: string; name: string; slug: string; sort_order: number };

export default function CategoryManagerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/products?limit=2000'),
      ]);
      const catData = await catRes.json();
      const prodData = await prodRes.json();
      setCategories(catData.categories || []);

      const counts: Record<string, number> = {};
      for (const p of prodData.products || []) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
      setProductCounts(counts);
    } finally {
      setLoading(false);
    }
  }

  async function createCategory() {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName('');
    setCreating(false);
    load();
  }

  async function rename(cat: Category) {
    if (!editName.trim() || editName.trim() === cat.name) { setEditingId(null); return; }

    const count = productCounts[cat.slug] || 0;
    let renameProducts = false;
    if (count > 0) {
      renameProducts = confirm(
        `${count} product${count !== 1 ? 's are' : ' is'} currently using "${cat.name}". Update them to the new name too? (Cancel keeps them on the old value.)`
      );
    }

    await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, name: editName.trim(), renameProducts }),
    });
    setEditingId(null);
    load();
  }

  async function remove(cat: Category) {
    const count = productCounts[cat.slug] || 0;
    const msg = count > 0
      ? `${count} product${count !== 1 ? 's use' : ' uses'} "${cat.name}". Deleting the category won't touch those products, but they'll no longer match a real filter. Delete anyway?`
      : `Delete "${cat.name}"?`;
    if (!confirm(msg)) return;
    await fetch(`/api/categories?id=${cat.id}`, { method: 'DELETE' });
    load();
  }

  async function move(id: string, direction: 'up' | 'down') {
    const idx = categories.findIndex(c => c.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const a = categories[idx];
    const b = categories[swapIdx];
    await Promise.all([
      fetch('/api/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, sort_order: b.sort_order }) }),
      fetch('/api/categories', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, sort_order: a.sort_order }) }),
    ]);
    load();
  }

  return (
    <div style={{ padding: '32px', maxWidth: 700, margin: '0 auto' }}>
      <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>← Dashboard</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Categories</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
        These power the filter pills on your Shop page. Renaming updates products only if you confirm it.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createCategory()}
          placeholder="New category name, e.g. 'Coastal'"
          style={{ flex: 1, padding: '10px 14px', fontSize: 14, border: '0.5px solid var(--border)', borderRadius: 8, background: 'white', outline: 'none' }}
        />
        <button onClick={createCategory} disabled={creating || !newName.trim()} style={{
          background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.6 : 1
        }}>+ Add</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => move(c.id, 'up')} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.25 : 1, fontSize: 12, lineHeight: 1, padding: 0 }}>▲</button>
                <button onClick={() => move(c.id, 'down')} disabled={i === categories.length - 1} style={{ background: 'none', border: 'none', cursor: i === categories.length - 1 ? 'default' : 'pointer', opacity: i === categories.length - 1 ? 0.25 : 1, fontSize: 12, lineHeight: 1, padding: 0 }}>▼</button>
              </div>

              {editingId === c.id ? (
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && rename(c)}
                  onBlur={() => rename(c)}
                  autoFocus
                  style={{ flex: 1, padding: '6px 10px', fontSize: 14, border: '0.5px solid var(--accent)', borderRadius: 6, outline: 'none' }}
                />
              ) : (
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{c.name}</span>
              )}

              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{productCounts[c.slug] || 0} products</span>
              <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} style={{ fontSize: 12, color: 'var(--accent-soft)', background: 'none', border: 'none', cursor: 'pointer' }}>Rename</button>
              <button onClick={() => remove(c)} style={{ fontSize: 12, color: '#A32D2D', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}