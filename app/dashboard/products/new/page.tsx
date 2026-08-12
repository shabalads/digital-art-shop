// app/(dashboard)/dashboard/products/new/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// "Category" here means the same thing the dashboard's own "Categories" nav
// item means (/dashboard/categories, which is actually powered by the
// `sections` table/API — "Coastal & Seaside", "Wildflower & Botanical",
// etc.). That's the taxonomy that actually drives the live shop's filter
// pills and homepage groupings. There's a second, older `category` text
// column + `categories` table + /api/categories that this form used to
// pull from (hardcoded even further, to a stale 5-item mock list) — that
// system isn't wired into any live customer-facing filtering anymore (its
// only visible trace is the small capitalized line under each product
// card/title), so it's kept here only for that cosmetic purpose, set
// automatically from whichever section is chosen below.
type Section = { id: string; name: string; slug: string };

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [form, setForm] = useState({
    title: '',
    category: '',
    price_digital: 3.99,
    price_physical: 29.99,
    badge: '',
    bg_color: '#F0EBE3',
    image_url: '',
    printful_product_id: '',
    digital_file_url: '',
    active: true,
  });

  function set(key: string, value: any) {
    setForm(f => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    fetch('/api/sections')
      .then(r => r.json())
      .then(data => setSections(data.sections || []))
      .catch(() => setSections([]));
  }, []);

  function selectSection(id: string) {
    setSectionId(id);
    const sec = sections.find(s => s.id === id);
    set('category', sec ? sec.slug : '');
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('productId', 'new');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.path) set('digital_file_url', data.path);
    setUploading(false);
  }

  // Same storage convention already used by the "Image" upload on the edit
  // product page (app/dashboard/products/[id]/page.tsx) — uploads to the
  // public "artwork" Supabase Storage bucket via /api/upload-image and gets
  // back a public URL, unlike the digital file upload above (which stores a
  // private storage path, not a public URL, since that file is gated behind
  // purchase).
  async function uploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.publicUrl) set('image_url', data.publicUrl);
      else alert('Upload failed: ' + (data.error || 'Unknown error'));
    } catch {
      alert('Upload failed');
    } finally {
      setUploadingImage(false);
    }
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.product) { setSaving(false); return; }

    // The `category` text column set above is cosmetic only (see note at
    // top of file) — this is what actually puts the product on the shop's
    // real filter pills / homepage groupings, same endpoint the dashboard's
    // per-category "Add products" screen uses.
    if (sectionId) {
      await fetch(`/api/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: [data.product.id], action: 'add' }),
      });
    }

    router.push('/dashboard/products');
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 32px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 32 }}>Add product</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Field label="Title">
          <input value={form.title} onChange={e => set('title', e.target.value)}
            style={inputStyle} placeholder="e.g. Warm Oval Study" />
        </Field>

        <Field label="Category (optional)">
          <select value={sectionId} onChange={e => selectSection(e.target.value)} style={inputStyle}>
            <option value="">— None yet —</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {sections.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              No categories exist yet — create one first at <a href="/dashboard/categories" style={{ color: 'var(--accent-soft)' }}>/dashboard/categories</a>.
            </div>
          )}
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

        <Field label="Badge (optional)">
          <input value={form.badge} onChange={e => set('badge', e.target.value)}
            style={inputStyle} placeholder="e.g. Bestseller, New" />
        </Field>

        <Field label="Background color">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="color" value={form.bg_color} onChange={e => set('bg_color', e.target.value)}
              style={{ width: 48, height: 36, border: 'none', cursor: 'pointer', borderRadius: 6 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{form.bg_color}</span>
          </div>
        </Field>

        <Field label="Image URL">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {form.image_url && (
              <img src={form.image_url} alt="preview" style={{ width: 100, height: 130, objectFit: 'cover', borderRadius: 8, border: '0.5px solid var(--border)' }} />
            )}
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', border: '0.5px solid var(--border)', borderRadius: 8,
              cursor: uploadingImage ? 'not-allowed' : 'pointer', fontSize: 13,
              color: 'var(--text-secondary)', width: 'fit-content',
              opacity: uploadingImage ? 0.6 : 1,
            }}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage}
                disabled={uploadingImage} style={{ display: 'none' }} />
              {uploadingImage ? 'Uploading…' : '↑ Upload image'}
            </label>
            <input value={form.image_url} onChange={e => set('image_url', e.target.value)}
              style={inputStyle} placeholder="https://... (or upload above)" />
          </div>
        </Field>

        <Field label="Digital file">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', border: '0.5px solid var(--border)', borderRadius: 8,
              cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 13,
              color: 'var(--text-secondary)', width: 'fit-content',
              opacity: uploading ? 0.6 : 1,
            }}>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf,.zip,.ai,.svg" onChange={uploadFile}
                disabled={uploading} style={{ display: 'none' }} />
              {uploading ? 'Uploading…' : '↑ Upload file'}
            </label>
            <input value={form.digital_file_url} onChange={e => set('digital_file_url', e.target.value)}
              style={inputStyle} placeholder="Storage path or https:// URL" />
          </div>
        </Field>

        <Field label="Printful product ID">
          <input value={form.printful_product_id} onChange={e => set('printful_product_id', e.target.value)}
            style={inputStyle} placeholder="From your Printful dashboard" />
        </Field>

        <Field label="Visible in shop">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Active</span>
          </div>
        </Field>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={save} disabled={saving || !form.title} style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 8, padding: '11px 24px', fontSize: 14,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
          }}>
            {saving ? 'Saving…' : 'Save product'}
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
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-primary)' }}>
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