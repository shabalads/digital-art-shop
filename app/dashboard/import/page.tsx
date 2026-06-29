// app/dashboard/import/page.tsx

'use client';


import { useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';

export default function ImportPage() {
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('Parsing CSV…');
    setDone(false);
    setProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        setTotal(rows.length);
        setStatus(`Found ${rows.length} listings — importing…`);

        let success = 0;
        let failed = 0;

        for (const row of rows) {
          const product = mapEtsyRow(row);
          try {
            const res = await fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(product),
            });
            const data = await res.json();
            if (data.product) success++;
            else failed++;
          } catch {
            failed++;
          }
          setProgress(success + failed);
        }

        setStatus(`Done — ${success} imported, ${failed} failed.`);
        setDone(true);
      },
    });
  }

  function mapEtsyRow(row: any) {
    const category = guessCategory(row['TITLE'] || row['Title'] || '');
    const price = parseFloat(row['PRICE'] || row['Price'] || '3.99') || 3.99;

    return {
      title: row['TITLE'] || row['Title'] || 'Untitled',
      description: row['DESCRIPTION'] || row['Description'] || '',
      category,
      price_digital: price,
      price_physical: Math.max(price * 6, 24.99),
      badge: '',
      bg_color: randomBg(),
      image_url: row['IMAGE1'] || row['Image1'] || '',
      active: (row['STATUS'] || row['Status'] || '').toLowerCase() === 'active',
    };
  }

  function guessCategory(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('botanical') || t.includes('plant') || t.includes('leaf') || t.includes('floral') || t.includes('flower')) return 'botanical';
    if (t.includes('quote') || t.includes('text') || t.includes('word') || t.includes('saying') || t.includes('typography')) return 'typography';
    if (t.includes('photo') || t.includes('landscape') || t.includes('nature') || t.includes('sky')) return 'photography';
    if (t.includes('vintage') || t.includes('retro') || t.includes('antique')) return 'vintage';
    if (t.includes('minimal') || t.includes('simple') || t.includes('clean') || t.includes('line')) return 'minimal';
    return 'abstract';
  }

  function randomBg(): string {
    const bgs = ['#E8E2D8', '#D8E4DC', '#F0EBE3', '#E2E0EC', '#EDE8D0', '#E4E8EC', '#DCE8DC', '#EDE8E4', '#E8E4DC', '#DDE4E8'];
    return bgs[Math.floor(Math.random() * bgs.length)];
  }

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 32px' }}>
      <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Dashboard</Link>
      <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>Import from Etsy CSV</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
        Download your listings CSV from Etsy → Shop Manager → Settings → Options → Download Data
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
                width: `${pct}%`, transition: 'width 0.2s'
              }} />
            </div>
          )}
          {total > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              {progress} / {total} ({pct}%)
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