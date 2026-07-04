// app/dashboard/products/[id]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { categories } from '../../../data/products';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/products?id=${id}`);
      const data = await res.json();
      if (data.products?.[0]) setForm(data.products[0]);
    }
    load();
  }, [id]);

  function set(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
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

        <Field label="Category">
          <select value={form.category} onChange={e => set('category', e.target.value)} style={inputStyle}>
            {categories.filter(c => c !== 'All').map(c => (
              <option key={c} value={c.toLowerCase()}>{c}</option>
            ))}
          </select>
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
          <input value={form.badge || ''} onChange={e => set('badge', e.target.value)} style={inputStyle} />
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

        <Field label="Digital file URL">
          <input value={form.digital_file_url || ''} onChange={e => set('digital_file_url', e.target.value)} style={inputStyle} />
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