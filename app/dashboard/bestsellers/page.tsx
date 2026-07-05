// app/dashboard/bestsellers/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product } from '../../data/products';

const ALL_TAGS = ['Bestseller', 'New', 'Trending', 'Staff pick', 'Top rated'];

const TAG_COLORS: Record<string, string> = {
  'Bestseller': '#8B6F4E',
  'New': '#3B6D11',
  'Trending': '#6B3B8B',
  'Staff pick': '#2C2420',
  'Top rated': '#B8860B',
};

function cleanTags(raw: any): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(t => typeof t === 'string' && t.trim() !== '');
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

export default function TagManagerPage() {
  const [activeTag, setActiveTag] = useState('Bestseller');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [taggedProducts, setTaggedProducts] = useState<Product[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(activeTag); }, [activeTag]);

  async function load(tag: string) {
    setLoading(true);
    try {
      const [taggedRes, allRes, orderRes] = await Promise.all([
        fetch(`/api/products?tag=${encodeURIComponent(tag)}&limit=1000`),
        fetch('/api/products?limit=1000'),
        fetch(`/api/settings?key=${encodeURIComponent('tag_order:' + tag)}`),
      ]);
      const taggedData = await taggedRes.json();
      const allData = await allRes.json();
      const orderData = await orderRes.json();

      const tagged: Product[] = taggedData.products || [];
      const savedOrder: string[] = Array.isArray(orderData.value) ? orderData.value : [];

      const byId = new Map(tagged.map(p => [p.id, p]));
      const ordered: Product[] = [];
      for (const id of savedOrder) {
        const p = byId.get(id);
        if (p) { ordered.push(p); byId.delete(id); }
      }
      // Anything tagged but not yet in the saved order goes at the end
      ordered.push(...byId.values());

      setTaggedProducts(ordered);
      setOrder(ordered.map(p => p.id));
      setAllProducts(allData.products || []);
    } finally {
      setLoading(false);
    }
  }

  async function saveOrder(ids: string[]) {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: `tag_order:${activeTag}`, value: ids }),
    });
    setSaving(false);
  }

  async function addTag(p: Product) {
    const current = cleanTags((p as any).tags);
    const nextTags = current.includes(activeTag) ? current : [...current, activeTag];
    await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, tags: nextTags }),
    });
    const nextOrder = [...order, p.id];
    setOrder(nextOrder);
    await saveOrder(nextOrder);
    setSearch('');
    setShowPicker(false);
    load(activeTag);
  }

  async function removeTag(p: Product) {
    const current = cleanTags((p as any).tags);
    const nextTags = current.filter(t => t !== activeTag);
    const patch: any = { id: p.id, tags: nextTags };
    if (p.badge === activeTag) patch.badge = ''; // clear legacy badge too if it matches
    await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const nextOrder = order.filter(id => id !== p.id);
    setOrder(nextOrder);
    await saveOrder(nextOrder);
    load(activeTag);
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const updated = [...taggedProducts];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setTaggedProducts(updated);
    const ids = updated.map(p => p.id);
    setOrder(ids);
    saveOrder(ids);
  }

  function moveDown(idx: number) {
    if (idx === taggedProducts.length - 1) return;
    const updated = [...taggedProducts];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setTaggedProducts(updated);
    const ids = updated.map(p => p.id);
    setOrder(ids);
    saveOrder(ids);
  }

  const taggedIds = new Set(taggedProducts.map(p => p.id));
  const notTagged = allProducts.filter(p => !taggedIds.has(p.id));
  const filtered = search.trim()
    ? notTagged.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : notTagged;

  const isBestsellerTab = activeTag === 'Bestseller';

  return (
    <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto' }}>
      <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Dashboard</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Bestsellers</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saving && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Saving…</span>}
          <button onClick={() => setShowPicker(!showPicker)} style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer'
          }}>+ Add product</button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Manage every tag from here — Bestseller controls the homepage row, the rest power the sections on the public Bestsellers page.
      </p>

      {/* Tag tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {ALL_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() => { setActiveTag(tag); setShowPicker(false); setSearch(''); }}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: activeTag === tag ? TAG_COLORS[tag] : 'var(--bg-pill)',
              color: activeTag === tag ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.15s'
            }}
          >{tag}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '40px 0' }}>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: showPicker ? '1fr 1fr' : '1fr', gap: 32 }}>

          {/* Left — tagged product list, ordered */}
          <div>
            {isBestsellerTab && (
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 10 }}>
                Order controls the homepage row (first 5 shown there)
              </div>
            )}

            {taggedProducts.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                No products tagged "{activeTag}" yet — click "+ Add product" to get started
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {taggedProducts.map((p, i) => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10,
                    background: isBestsellerTab && i >= 5 ? '#F8F6F3' : 'white',
                    border: isBestsellerTab && i >= 5 ? '0.5px dashed var(--border)' : '0.5px solid var(--border)',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: isBestsellerTab && i >= 5 ? 'var(--bg-pill)' : TAG_COLORS[activeTag],
                      color: isBestsellerTab && i >= 5 ? 'var(--text-muted)' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700
                    }}>{i + 1}</div>

                    <div style={{ width: 44, height: 58, borderRadius: 6, background: p.bg_color, overflow: 'hidden', flexShrink: 0 }}>
                      {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanTitle(p.title)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>{p.category} · ${p.price_digital.toFixed(2)}</div>
                      {isBestsellerTab && i === 4 && (
                        <div style={{ fontSize: 10, color: '#8B6F4E', marginTop: 3, fontWeight: 600 }}>↑ Last visible on homepage</div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                      <button onClick={() => moveUp(i)} disabled={i === 0} style={{
                        width: 26, height: 26, borderRadius: 4, border: '0.5px solid var(--border)',
                        background: 'white', cursor: i === 0 ? 'not-allowed' : 'pointer',
                        fontSize: 12, opacity: i === 0 ? 0.3 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>↑</button>
                      <button onClick={() => moveDown(i)} disabled={i === taggedProducts.length - 1} style={{
                        width: 26, height: 26, borderRadius: 4, border: '0.5px solid var(--border)',
                        background: 'white', cursor: i === taggedProducts.length - 1 ? 'not-allowed' : 'pointer',
                        fontSize: 12, opacity: i === taggedProducts.length - 1 ? 0.3 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>↓</button>
                    </div>

                    <button onClick={() => removeTag(p)} style={{
                      flexShrink: 0, background: '#FEF2F2', border: 'none',
                      borderRadius: 6, width: 28, height: 28, cursor: 'pointer',
                      color: '#A32D2D', fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {isBestsellerTab && taggedProducts.length > 5 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                {taggedProducts.length - 5} more not shown on homepage
              </div>
            )}
          </div>

          {/* Right — add product picker */}
          {showPicker && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Add "{activeTag}" tag</div>
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
                    onClick={() => addTag(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', cursor: 'pointer', borderRadius: 8,
                      background: 'white', border: '0.5px solid var(--border)',
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
      )}
    </div>
  );
}