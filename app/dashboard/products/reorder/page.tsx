'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type Product = {
  id: string;
  title: string;
  category: string;
  bg_color: string;
  image_url?: string;
  price_digital: number;
  home_sort_order?: number;
};

const PAGE_SIZE = 60;

export default function ReorderProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [jumpValue, setJumpValue] = useState('');
  const mouseY = React.useRef(0);

  useEffect(() => { load(); }, []);

  // Auto-scroll while dragging near top/bottom edges
  useEffect(() => {
    if (dragIdx === null) return;

    const edge = 220;
    const maxSpeed = 2800;
    let raf: number;
    let lastTime: number | null = null;

    function trackMouse(e: DragEvent) {
      mouseY.current = e.clientY;
      e.preventDefault();
    }

    function loop(time: number) {
      if (lastTime === null) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const y = mouseY.current;
      const vh = window.innerHeight;
      let speed = 0;

      if (y < edge) speed = -maxSpeed;
      else if (y > vh - edge) speed = maxSpeed;

      if (speed !== 0) {
        const maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
        const atTop = window.scrollY <= 0;
        const atBottom = window.scrollY >= maxScrollTop - 1;
        if ((speed < 0 && !atTop) || (speed > 0 && !atBottom)) {
          window.scrollBy({ top: speed * dt, behavior: 'auto' });
        }
      }

      raf = requestAnimationFrame(loop);
    }

    window.addEventListener('dragover', trackMouse, { capture: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('dragover', trackMouse, { capture: true } as any);
      cancelAnimationFrame(raf);
    };
  }, [dragIdx]);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/products?limit=2000');
    const data = await res.json();
    const list: Product[] = data.products || [];
    list.sort((a, b) => {
      const ao = a.home_sort_order ?? 999999;
      const bo = b.home_sort_order ?? 999999;
      return ao - bo;
    });
    setProducts(list);
    setLoading(false);
  }

  const totalPages = Math.ceil(products.length / PAGE_SIZE);
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageItems = products.slice(pageStart, pageStart + PAGE_SIZE);

  function cleanTitle(raw: string): string {
    const separators = [' | ', ' – ', ' - ', ', '];
    let cleaned = raw;
    for (const sep of separators) {
      const idx = cleaned.indexOf(sep);
      if (idx > 20) { cleaned = cleaned.substring(0, idx).trim(); break; }
    }
    return cleaned.length > 50 ? cleaned.substring(0, 50) + '…' : cleaned;
  }

  function handleDragStart(idx: number) { setDragIdx(idx); }
  const dragOverIdxRef = React.useRef<number | null>(null);

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragOverIdxRef.current !== idx) {
      dragOverIdxRef.current = idx;
      setDragOverIdx(idx);
    }
  }

  function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }

    const updated = [...products];
    const fromGlobalIdx = pageStart + dragIdx;
    const toGlobalIdx = pageStart + idx;
    const [moved] = updated.splice(fromGlobalIdx, 1);
    updated.splice(toGlobalIdx, 0, moved);

    setProducts(updated);
    setDragIdx(null);
    setDragOverIdx(null);
    saveOrder(updated);
  }

  async function saveOrder(ordered: Product[]) {
    setSaving(true);
    const withIndex = ordered.map((p, i) => ({ ...p, home_sort_order: i }));
    setProducts(withIndex);

    const changed = withIndex.filter((p, i) => products[i]?.id !== p.id || products[i]?.home_sort_order !== i);

    try {
      for (const p of changed) {
        await fetch('/api/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: p.id, home_sort_order: p.home_sort_order }),
        });
      }
    } catch (err) {
      console.error('Error saving item order:', err);
    } finally {
      setSaving(false);
    }
  }

  function jumpToPage() {
    const n = parseInt(jumpValue);
    if (!n || n < 1 || n > totalPages) return;
    setPage(n);
    setJumpValue('');
  }

  async function moveToPosition(productId: string, targetPosition: number, currentVisibleIdx: number) {
    if (!targetPosition || targetPosition < 1 || targetPosition > products.length) return;
    const updated = [...products];
    const fromIdx = updated.findIndex(p => p.id === productId);
    if (fromIdx === -1) return;
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(targetPosition - 1, 0, moved);
    
    // Fire the save process without using "await" so it doesn't block layout execution
    saveOrder(updated);

    // Instantly force focus lock into the exact same physical slot on the screen
    setTimeout(() => {
      let targetIdx = currentVisibleIdx;
      
      if (targetIdx >= pageItems.length - 1) {
        targetIdx = pageItems.length - 1;
      }

      const activeInput = document.getElementById(`input-${targetIdx}`) as HTMLInputElement;
      if (activeInput) {
        activeInput.focus();
        activeInput.select();
      }
    }, 30);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, currentVisibleIdx: number) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.getElementById(`input-${currentVisibleIdx + 1}`) as HTMLInputElement;
      if (nextInput) { nextInput.focus(); nextInput.select(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`input-${currentVisibleIdx - 1}`) as HTMLInputElement;
      if (prevInput) { prevInput.focus(); prevInput.select(); }
    }
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
      <Link href="/dashboard/products" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Products</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Reorder all prints</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Controls the order products appear in "All Prints" on the homepage and shop when no filter is active.
          </p>
        </div>
        {saving && <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Saving…</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 16px', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Page {page} of {totalPages} · showing #{pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, products.length)} of {products.length}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, border: '0.5px solid var(--border)', background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
          <input
            value={jumpValue}
            onChange={e => setJumpValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && jumpToPage()}
            placeholder="Page #"
            style={{ width: 64, padding: '6px 8px', fontSize: 13, border: '0.5px solid var(--border)', borderRadius: 8, textAlign: 'center', outline: 'none' }}
          />
          <button onClick={jumpToPage} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, border: '0.5px solid var(--border)', background: 'white', cursor: 'pointer' }}>Go</button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, border: '0.5px solid var(--border)', background: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pageItems.map((p, i) => (
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
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', minWidth: 34, flexShrink: 0 }}>#{pageStart + i + 1}</span>
            <div style={{ width: 40, height: 52, borderRadius: 6, background: p.bg_color, overflow: 'hidden', flexShrink: 0 }}>
              {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanTitle(p.title)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>${p.price_digital.toFixed(2)}</div>
            </div>
            <input
              id={`input-${i}`}
              type="number"
              placeholder="Move to #"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  moveToPosition(p.id, parseInt((e.target as HTMLInputElement).value), i);
                  (e.target as HTMLInputElement).value = '';
                } else {
                  handleKeyDown(e, i);
                }
              }}
              style={{ width: 90, padding: '6px 8px', fontSize: 12, border: '0.5px solid var(--border)', borderRadius: 6, outline: 'none', flexShrink: 0 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}