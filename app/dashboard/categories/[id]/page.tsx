// app/dashboard/categories/[id]/page.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type Product = {
  id: string;
  title: string;
  category: string;
  badge?: string;
  bg_color: string;
  image_url?: string;
  price_digital: number;
  section_ids?: string[];
  sort_order?: number;
};

type Section = { id: string; name: string; };

const ALL_TAGS = ['Bestseller', 'New', 'Trending', 'Staff pick', 'Top rated'];
const PAGE_SIZE = 60;

export default function CategoryProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sectionId } = React.use(params);
  const [section, setSection] = useState<Section | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('All');
  const [showInSection, setShowInSection] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [sectionProducts, setSectionProducts] = useState<Product[]>([]);
  const [reorderMode, setReorderMode] = useState(false);

  useEffect(() => { load(); }, [sectionId]);

  async function load() {
    setLoading(true);
    const [secRes, prodRes] = await Promise.all([
      fetch('/api/sections'),
      fetch('/api/products?limit=1000'),
    ]);
    const secData = await secRes.json();
    const prodData = await prodRes.json();
    const sec = (secData.sections || []).find((s: Section) => s.id === sectionId);
    setSection(sec || null);
    const allProds: Product[] = prodData.products || [];
    setAllProducts(allProds);
    const inSec = allProds
      .filter(p => (p.section_ids || []).includes(sectionId))
      .sort((a, b) => ((a.sort_order ?? 999) - (b.sort_order ?? 999)));
    setSectionProducts(inSec);
    setLoading(false);
  }

  const inSection = new Set(allProducts.filter(p => (p.section_ids || []).includes(sectionId)).map(p => p.id));

  const filtered = allProducts.filter(p => {
    if (showInSection && !inSection.has(p.id)) return false;
    if (tagFilter !== 'All' && p.badge !== tagFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, tagFilter, showInSection]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  }

  async function batchAction(action: 'add' | 'remove') {
    if (!selected.size) return;
    setSaving(true);
    await fetch(`/api/sections/${sectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: [...selected], action }),
    });
    setSelected(new Set());
    await load();
    setSaving(false);
  }

  async function toggleOne(productId: string) {
    const action = inSection.has(productId) ? 'remove' : 'add';
    await fetch(`/api/sections/${sectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: [productId], action }),
    });
    await load();
  }

  // Drag to reorder
  function handleDragStart(idx: number) { setDragIdx(idx); }
  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }
  function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const updated = [...sectionProducts];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setSectionProducts(updated);
    setDragIdx(null);
    setDragOverIdx(null);
    saveOrder(updated);
  }

  async function saveOrder(ordered: Product[]) {
    setSaving(true);
    await Promise.all(ordered.map((p, i) =>
      fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, sort_order: i }),
      })
    ));
    setSaving(false);
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


  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading…</div>;
  if (!section) return <div style={{ padding: 40 }}>Category not found. <Link href="/dashboard/categories">← Back</Link></div>;

  return (
    <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
      <Link href="/dashboard/categories" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Categories</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{section.name}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {inSection.size} product{inSection.size !== 1 ? 's' : ''} in this category · {filtered.length} shown
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {saving && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Saving…</span>}
          <button
            onClick={() => setReorderMode(!reorderMode)}
            style={{
              background: reorderMode ? 'var(--accent)' : 'white',
              color: reorderMode ? 'white' : 'var(--text-secondary)',
              border: '0.5px solid var(--border)', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500
            }}
          >
            {reorderMode ? '✓ Reorder mode' : '⠿ Reorder'}
          </button>
        </div>
      </div>

      {/* Reorder mode */}
      {reorderMode ? (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Drag the ⠿ handle to reorder. Order saved automatically. This controls which products appear first on page 1 of this category.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sectionProducts.map((p, i) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={e => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'white',
                  border: dragOverIdx === i ? '2px solid var(--accent)' : '0.5px solid var(--border)',
                  borderRadius: 8, cursor: 'grab',
                  opacity: dragIdx === i ? 0.4 : 1,
                  transition: 'border 0.1s'
                }}
              >
                <span style={{ fontSize: 18, color: 'var(--text-muted)', cursor: 'grab', userSelect: 'none', flexShrink: 0 }}>⠿</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', minWidth: 28, flexShrink: 0 }}>#{i + 1}</span>
                <div style={{ width: 40, height: 52, borderRadius: 6, background: p.bg_color, overflow: 'hidden', flexShrink: 0 }}>
                  {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanTitle(p.title)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>{p.category} · ${p.price_digital.toFixed(2)}</div>
                </div>
                <button onClick={() => toggleOne(p.id)} style={{ fontSize: 11, color: '#A32D2D', background: '#FEF2F2', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}>Remove</button>
              </div>
            ))}
          </div>
          {sectionProducts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              No products in this category yet. Exit reorder mode to add some.
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or category…" style={{ flex: 1, minWidth: 200, padding: '9px 14px', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 8, background: 'white', outline: 'none' }} />
            <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={{ padding: '9px 12px', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 8, background: 'white', outline: 'none', cursor: 'pointer' }}>
              <option value="All">All tags</option>
              {ALL_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={showInSection} onChange={e => setShowInSection(e.target.checked)} />
              In category only
            </label>
          </div>

          {/* Select all + batch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAllFiltered} style={{ width: 15, height: 15 }} />
              {selected.size === filtered.length && filtered.length > 0 ? 'Deselect all' : `Select all ${filtered.length}`}
            </label>
            {selected.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#2C2420', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{selected.size} selected</span>
                <button onClick={() => batchAction('add')} disabled={saving} style={{ background: '#3B6D11', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: 'white', fontWeight: 500 }}>+ Add to {section.name}</button>
                <button onClick={() => batchAction('remove')} disabled={saving} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', color: 'white' }}>− Remove</button>
                <button onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', fontSize: 12, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>✕</button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>🟢 Green = in category · 🔵 Blue = selected · Click image to toggle</span>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {paginated.map(p => {
              const isInSection = inSection.has(p.id);
              const isSelected = selected.has(p.id);
              return (
                <div key={p.id} style={{ background: 'white', borderRadius: 10, overflow: 'hidden', border: isSelected ? '2.5px solid var(--accent)' : isInSection ? '2.5px solid #3B6D11' : '0.5px solid var(--border-card)', position: 'relative' }}>
                  <div onClick={() => toggleSelect(p.id)} style={{ position: 'absolute', top: 6, left: 6, zIndex: 3, cursor: 'pointer' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.9)', border: `1.5px solid ${isSelected ? 'var(--accent)' : 'rgba(0,0,0,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white' }}>
                      {isSelected && '✓'}
                    </div>
                  </div>
                  {isInSection && (
                    <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 3, background: '#3B6D11', borderRadius: 4, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 700 }}>✓</div>
                  )}
                  <div onClick={() => toggleOne(p.id)} style={{ aspectRatio: '3/4', background: p.bg_color, overflow: 'hidden', cursor: 'pointer' }}>
                    {p.image_url
                      ? <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                    }
                  </div>
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanTitle(p.title)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{p.category} · ${p.price_digital.toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, border: '0.5px solid var(--border)', background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc: (number | string)[], n, idx, arr) => {
                  if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) => n === '...'
                  ? <span key={`d${i}`} style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
                  : <button key={n} onClick={() => setPage(n as number)} style={{ width: 34, height: 34, borderRadius: 8, fontSize: 13, border: `0.5px solid ${page === n ? 'var(--accent)' : 'var(--border)'}`, background: page === n ? 'var(--accent)' : 'white', color: page === n ? 'white' : 'var(--text-primary)', cursor: 'pointer', fontWeight: page === n ? 600 : 400 }}>{n}</button>
                )
              }
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, border: '0.5px solid var(--border)', background: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Page {page} of {totalPages} · {filtered.length} products
          </div>
        </>
      )}
    </div>
  );
}