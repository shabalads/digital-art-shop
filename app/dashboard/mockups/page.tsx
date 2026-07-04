// app/dashboard/mockups/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product } from '../../data/products';

const MOCKUP_IMAGES = [
  { key: 'bathroom', src: '/mockups/Image 2.png', room: 'Bathroom' },
  { key: 'hallway', src: '/mockups/Image 3.png', room: 'Hallway' },
  { key: 'mantle', src: '/mockups/Image 7.png', room: 'Mantle' },
  { key: 'gallery', src: '/mockups/Image 8.png', room: 'Gallery wall' },
  { key: 'nursery', src: '/mockups/Image 9.png', room: 'Nursery' },
  { key: 'living', src: '/mockups/Image 5.png', room: 'Living room' },
];

export default function MockupManagerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Load products
      const res = await fetch('/api/products?limit=1000');
      const data = await res.json();
      setProducts(data.products || []);

      // Load saved mockup links
      const settingsRes = await fetch('/api/settings?key=mockup_links');
      const settingsData = await settingsRes.json();
      if (settingsData.value) setLinks(settingsData.value);
      setLoading(false);
    }
    load();
  }, []);

  async function saveLinks(updated: Record<string, string>) {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'mockup_links', value: updated }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function selectProduct(productId: string) {
    if (!activeSlot) return;
    const updated = { ...links, [activeSlot]: `/product/${productId}` };
    setLinks(updated);
    saveLinks(updated);
    setActiveSlot(null);
    setSearch('');
  }

  function clearLink(key: string) {
    const updated = { ...links, [key]: '' };
    setLinks(updated);
    saveLinks(updated);
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

  const filteredProducts = search.trim()
    ? products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    : products;

  const linkedProductId = activeSlot ? links[activeSlot]?.split('/product/')?.[1] : null;

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div style={{ padding: '32px', maxWidth: 1300, margin: '0 auto' }}>
      <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Dashboard</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Mockup Manager</h1>
        {saved && <span style={{ fontSize: 13, color: '#3B6D11', fontWeight: 500 }}>✓ Saved</span>}
        {saving && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Saving…</span>}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
        Click a room photo to assign which product it links to. Changes save automatically.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: activeSlot ? '1fr 1fr' : '1fr', gap: 24 }}>

        {/* Left — mockup grid */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {MOCKUP_IMAGES.map(m => {
              const linkedId = links[m.key]?.split('/product/')?.[1];
              const linkedProduct = products.find(p => p.id === linkedId);
              const isActive = activeSlot === m.key;

              return (
                <div
                  key={m.key}
                  onClick={() => setActiveSlot(isActive ? null : m.key)}
                  style={{
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                    border: isActive ? '3px solid var(--accent)' : '0.5px solid var(--border)',
                    position: 'relative', background: 'white',
                    transition: 'border 0.15s'
                  }}
                >
                  <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative' }}>
                    <img src={m.src} alt={m.room} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isActive && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(44,36,32,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>Select a print →</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m.room}</div>
                    {linkedProduct ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 36, borderRadius: 4, background: linkedProduct.bg_color, overflow: 'hidden', flexShrink: 0 }}>
                          {linkedProduct.image_url && <img src={linkedProduct.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{cleanTitle(linkedProduct.title)}</div>
                          <button onClick={e => { e.stopPropagation(); clearLink(m.key); }} style={{ fontSize: 10, color: '#A32D2D', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>Remove link</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No print linked — click to assign</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right — product picker */}
        {activeSlot && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Select print for: <span style={{ color: 'var(--accent-soft)' }}>{MOCKUP_IMAGES.find(m => m.key === activeSlot)?.room}</span>
            </div>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search prints…"
              style={{
                width: '100%', padding: '10px 14px', fontSize: 13,
                border: '0.5px solid var(--border)', borderRadius: 8,
                background: 'white', outline: 'none', marginBottom: 12
              }}
            />
       <div style={{ height: 600, overflowY: 'auto' }}>
              {filteredProducts.map(p => {
                const isLinked = links[activeSlot] === `/product/${p.id}`;
                return (
                  <div
                    key={p.id}
                    onClick={() => selectProduct(p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', cursor: 'pointer',
                      borderRadius: 8, marginBottom: 4,
                      background: isLinked ? '#F2EDE6' : 'white',
                      border: isLinked ? '1.5px solid var(--accent)' : '0.5px solid var(--border)',
                      transition: 'background 0.1s'
                    }}
                  >
                    <div style={{ width: 44, height: 58, borderRadius: 6, background: p.bg_color, overflow: 'hidden', flexShrink: 0 }}>
                      {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanTitle(p.title)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 2 }}>{p.category} · ${p.price_digital.toFixed(2)}</div>
                    </div>
                    {isLinked && <span style={{ fontSize: 12, color: 'var(--accent-soft)', fontWeight: 600, flexShrink: 0 }}>✓ Linked</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}