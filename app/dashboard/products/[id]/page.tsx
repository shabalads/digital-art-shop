// app/dashboard/products/[id]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ALL_TAGS = ['Bestseller', 'New', 'Trending', 'Staff pick', 'Top rated'];

const TAG_COLORS: Record<string, string> = {
  'Bestseller': '#8B6F4E',
  'New': '#3B6D11',
  'Trending': '#6B3B8B',
  'Staff pick': '#2C2420',
  'Top rated': '#B8860B',
};

function cleanTags(tags: any): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter(t => typeof t === 'string' && t.trim() !== '');
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
const [form, setForm] = useState<any>(null);
  const [relatedPicks, setRelatedPicks] = useState<Array<{ id: string; title: string; image_url?: string }>>([]);
  const [relatedSearch, setRelatedSearch] = useState('');
  const [relatedResults, setRelatedResults] = useState<Array<{ id: string; title: string; image_url?: string }>>([]);
  const [searchingRelated, setSearchingRelated] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/products?id=${id}`);
      const data = await res.json();
if (data.products?.[0]) {
        const p = data.products[0];
        setForm({ ...p, tags: cleanTags(p.tags) });
        if (p.related_product_ids?.length) {
          const relRes = await fetch(`/api/products?related_to=${p.id}`);
          const relData = await relRes.json();
          setRelatedPicks((relData.products || []).map((r: any) => ({ id: r.id, title: r.title, image_url: r.image_url })));
        }
      }
    }
    load();
  }, [id]);

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  function toggleTag(tag: string) {
    setForm((f: any) => {
      const current: string[] = cleanTags(f.tags);
      const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
      return { ...f, tags: next };
    });
  }

async function searchRelated(q: string) {
    setRelatedSearch(q);
    if (!q.trim()) { setRelatedResults([]); return; }
    setSearchingRelated(true);
    try {
      const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setRelatedResults((data.products || []).filter((p: any) => p.id !== id && !relatedPicks.some(rp => rp.id === p.id)));
    } finally {
      setSearchingRelated(false);
    }
  }

  function addRelated(p: { id: string; title: string; image_url?: string }) {
    setRelatedPicks(prev => [...prev, p]);
    setRelatedResults(prev => prev.filter(r => r.id !== p.id));
    setRelatedSearch('');
  }

  function removeRelated(pid: string) {
    setRelatedPicks(prev => prev.filter(p => p.id !== pid));
  }

  function moveRelated(idx: number, dir: 'up' | 'down') {
    setRelatedPicks(prev => {
      const updated = [...prev];
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= updated.length) return prev;
      [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
      return updated;
    });
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tags: cleanTags(form.tags), related_product_ids: relatedPicks.map(p => p.id) }),
    });
    const data = await res.json();
    if (data.product) router.push('/dashboard/products');
    else setSaving(false);
  }

  if (!form) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 32px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 32 }}>Edit product</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label="Title">
          <input value={form.title} onChange={e => set('title', e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Description">
          <textarea value={form.description || ''} onChange={e => set('description', e.target.value)}
            rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Digital price ($)">
            <input type="number" step="0.01" value={form.price_digital}
              onChange={e => set('price_digital', parseFloat(e.target.value))} style={inputStyle} />
          </Field>
          <Field label="Physical price ($)">
            <input type="number" step="0.01" value={form.price_physical}
              onChange={e => set('price_physical', parseFloat(e.target.value))} style={inputStyle} />
          </Field>
        </div>

        <Field label="Badge (legacy — single ribbon shown on card corner)">
          <input value={form.badge || ''} onChange={e => set('badge', e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Tags (multiple — used for homepage/bestsellers sections)">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ALL_TAGS.map(tag => {
              const active = cleanTags(form.tags).includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', border: `1px solid ${active ? TAG_COLORS[tag] : 'var(--border)'}`,
                    background: active ? TAG_COLORS[tag] : 'white',
                    color: active ? 'white' : 'var(--text-secondary)',
                    transition: 'all 0.15s'
                  }}
                >
                  {active ? '✓ ' : ''}{tag}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="You might also like (leave empty for automatic matching by title similarity)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {relatedPicks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {relatedPicks.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg-pill)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <button type="button" onClick={() => moveRelated(i, 'up')} disabled={i === 0} style={{ width: 18, height: 18, fontSize: 9, border: '0.5px solid var(--border)', borderRadius: 4, background: 'white', cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                      <button type="button" onClick={() => moveRelated(i, 'down')} disabled={i === relatedPicks.length - 1} style={{ width: 18, height: 18, fontSize: 9, border: '0.5px solid var(--border)', borderRadius: 4, background: 'white', cursor: i === relatedPicks.length - 1 ? 'not-allowed' : 'pointer', opacity: i === relatedPicks.length - 1 ? 0.3 : 1 }}>↓</button>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 16 }}>#{i + 1}</span>
                    {p.image_url && <img src={p.image_url} alt="" style={{ width: 30, height: 38, objectFit: 'cover', borderRadius: 4 }} />}
                    <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                    <button type="button" onClick={() => removeRelated(p.id)} style={{ fontSize: 11, color: '#A32D2D', background: '#FEF2F2', border: 'none', borderRadius: 6, padding: '4px 9px', cursor: 'pointer' }}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            <input
              value={relatedSearch}
              onChange={e => searchRelated(e.target.value)}
              placeholder="Search products to add…"
              style={inputStyle}
            />

            {searchingRelated && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Searching…</span>}

            {relatedResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, border: '0.5px solid var(--border)', borderRadius: 8, padding: 6, maxHeight: 220, overflowY: 'auto' }}>
                {relatedResults.map(p => (
                  <div key={p.id} onClick={() => addRelated(p)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-pill)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    {p.image_url && <img src={p.image_url} alt="" style={{ width: 28, height: 36, objectFit: 'cover', borderRadius: 4 }} />}
                    <span style={{ fontSize: 13 }}>{p.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Field>

        <Field label="Background color">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="color" value={form.bg_color} onChange={e => set('bg_color', e.target.value)}
              style={{ width: 48, height: 36, border: 'none', cursor: 'pointer', borderRadius: 6 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{form.bg_color}</span>
          </div>
        </Field>

        <Field label="Image">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {form.image_url && (
              <img src={form.image_url} alt="preview" style={{ width: 120, height: 160, objectFit: 'cover', borderRadius: 8, border: '0.5px solid var(--border)' }} />
            )}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: uploadingImage ? '#6B5F52' : 'var(--accent)', color: 'white', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: uploadingImage ? 'not-allowed' : 'pointer', width: 'fit-content' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingImage} onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingImage(true);
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
                  const data = await res.json();
                  if (data.publicUrl) {
                    set('image_url', data.publicUrl);
                  } else {
                    alert('Upload failed: ' + (data.error || 'Unknown error'));
                  }
                } catch (err) {
                  alert('Upload failed');
                } finally {
                  setUploadingImage(false);
                }
              }} />
              {uploadingImage ? 'Uploading…' : '↑ Upload new image'}
            </label>
            <input value={form.image_url || ''} onChange={e => set('image_url', e.target.value)} style={{ ...inputStyle, fontSize: 11, color: 'var(--text-muted)' }} placeholder="Or paste image URL" />
          </div>
        </Field>

<Field label="Digital file (the actual print-ready file customers receive after purchase)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {form.digital_file_url && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', background: 'var(--bg-pill)', borderRadius: 6, wordBreak: 'break-all' }}>
                Current file: {form.digital_file_url}
              </div>
            )}
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: uploadingFile ? '#6B5F52' : 'var(--accent)', color: 'white', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: uploadingFile ? 'not-allowed' : 'pointer', width: 'fit-content' }}>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf,.zip" style={{ display: 'none' }} disabled={uploadingFile} onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingFile(true);
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  fd.append('productId', id);
                  const res = await fetch('/api/upload', { method: 'POST', body: fd });
                  const data = await res.json();
                  if (data.path) {
                    set('digital_file_url', data.path);
                  } else {
                    alert('Upload failed: ' + (data.error || 'Unknown error'));
                  }
                } catch (err) {
                  alert('Upload failed');
                } finally {
                  setUploadingFile(false);
                }
              }} />
              {uploadingFile ? 'Uploading…' : '↑ Upload digital file'}
            </label>
            <input value={form.digital_file_url || ''} onChange={e => set('digital_file_url', e.target.value)} style={{ ...inputStyle, fontSize: 11, color: 'var(--text-muted)' }} placeholder="Or paste storage path manually" />
          </div>
        </Field>

        <Field label="Printful product ID">
          <input value={form.printful_product_id || ''} onChange={e => set('printful_product_id', e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Visible in shop">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Active</span>
          </div>
        </Field>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={save} disabled={saving} style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 8, padding: '11px 24px', fontSize: 14,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
          }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button onClick={() => router.back()} style={{
            background: 'none', color: 'var(--text-secondary)', border: '0.5px solid var(--border)',
            borderRadius: 8, padding: '11px 20px', fontSize: 14, cursor: 'pointer'
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 14,
  border: '0.5px solid var(--border)', borderRadius: 8,
  background: 'white', color: 'var(--text-primary)', outline: 'none',
};