// app/dashboard/import/page.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ImportPage() {
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('Uploading CSV and artwork files…');
    setDone(false);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Import failed');

      setTotal(data.total || 0);
      setProgress(data.imported || 0);
      setStatus(`Done — ${data.imported} imported, ${data.skipped} skipped.`);
      setDone(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Import failed');
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 32px' }}>
      <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Dashboard</Link>
      <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>Import from Etsy CSV</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Download your listings CSV from Etsy → Shop Manager → Settings → Options → Download Data.
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
        This import parses your CSV, downloads artwork images into Supabase Storage, and inserts products into your catalog.
      </p>

      <label style={{
        display: 'block', border: '1px dashed var(--border)', borderRadius: 10,
        padding: '40px', textAlign: 'center', cursor: 'pointer',
        color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24
      }}>
        <input type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
        Click to select your Etsy CSV file
      </label>

      {status && (
        <div>
          <p style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-primary)' }}>{status}</p>
          {total > 0 && !done && (
            <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{
                background: 'var(--accent)', height: '100%',
                width: `${Math.round((progress / total) * 100)}%`, transition: 'width 0.2s'
              }} />
            </div>
          )}
          {total > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              {progress} / {total}
            </p>
          )}
          {done && (
            <a href="/dashboard/products" style={{
              display: 'inline-block', marginTop: 20,
              background: 'var(--accent)', color: 'white',
              borderRadius: 8, padding: '10px 20px', fontSize: 14
            }}>
              View products →
            </a>
          )}
        </div>
      )}
    </div>
  );
}