// app/dashboard/sections/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Section = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  product_count: number;
};

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/sections');
    const data = await res.json();
    setSections(data.sections || []);
    setLoading(false);
  }

  async function create() {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName('');
    setCreating(false);
    load();
  }

  async function rename(id: string) {
    if (!renameValue.trim()) return;
    await fetch('/api/sections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: renameValue.trim() }),
    });
    setRenamingId(null);
    load();
  }

  async function deleteSection(id: string, name: string) {
    if (!confirm(`Delete section "${name}"? Products will not be affected.`)) return;
    await fetch(`/api/sections?id=${id}`, { method: 'DELETE' });
    load();
  }

  async function move(idx: number, dir: 'up' | 'down') {
    const updated = [...sections];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= updated.length) return;
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    setSections(updated);
    await Promise.all([
      fetch('/api/sections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: updated[idx].id, sort_order: idx }) }),
      fetch('/api/sections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: updated[swapIdx].id, sort_order: swapIdx }) }),
    ]);
  }

  return (
    <div style={{ padding: '32px', maxWidth: 800, margin: '0 auto' }}>
      <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Dashboard</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Sections</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Curated groups shown on the homepage. Separate from categories and tags.</p>
        </div>
      </div>

      {/* Create new section */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && create()}
          placeholder="New section name…"
          style={{
            flex: 1, padding: '10px 14px', fontSize: 14,
            border: '0.5px solid var(--border)', borderRadius: 8,
            background: 'white', color: 'var(--text-primary)', outline: 'none'
          }}
        />
        <button onClick={create} disabled={creating || !newName.trim()} style={{
          background: 'var(--accent)', color: 'white', border: 'none',
          borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500,
          cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer',
          opacity: !newName.trim() ? 0.5 : 1
        }}>
          {creating ? 'Adding…' : '+ Add'}
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
      ) : sections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: 15, marginBottom: 8 }}>No sections yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Type a name above and press Enter or click + Add</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sections.map((s, i) => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', background: 'white',
              border: '0.5px solid var(--border)', borderRadius: 10
            }}>
              {/* Reorder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => move(i, 'up')} disabled={i === 0} style={{
                  width: 24, height: 24, borderRadius: 4, border: '0.5px solid var(--border)',
                  background: 'var(--bg)', cursor: i === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 10, opacity: i === 0 ? 0.3 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>↑</button>
                <button onClick={() => move(i, 'down')} disabled={i === sections.length - 1} style={{
                  width: 24, height: 24, borderRadius: 4, border: '0.5px solid var(--border)',
                  background: 'var(--bg)', cursor: i === sections.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: 10, opacity: i === sections.length - 1 ? 0.3 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>↓</button>
              </div>

              {/* Name / rename */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {renamingId === s.id ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') rename(s.id); if (e.key === 'Escape') setRenamingId(null); }}
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: 14, fontWeight: 600,
                        border: '1px solid var(--accent)', borderRadius: 6,
                        outline: 'none', background: 'white'
                      }}
                    />
                    <button onClick={() => rename(s.id)} style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setRenamingId(null)} style={{ background: 'none', border: '0.5px solid var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {s.product_count} product{s.product_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {renamingId !== s.id && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => { setRenamingId(s.id); setRenameValue(s.name); }} style={{
                    fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-pill)',
                    border: '0.5px solid var(--border)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer'
                  }}>Rename</button>
                  <Link href={`/dashboard/sections/${s.id}`} style={{
                    fontSize: 12, color: 'var(--accent-soft)', background: 'var(--bg-pill)',
                    border: '0.5px solid var(--border)', borderRadius: 6, padding: '5px 12px',
                    textDecoration: 'none', whiteSpace: 'nowrap'
                  }}>Manage products →</Link>
                  <button onClick={() => deleteSection(s.id, s.name)} style={{
                    fontSize: 12, color: '#A32D2D', background: '#FEF2F2',
                    border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer'
                  }}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}