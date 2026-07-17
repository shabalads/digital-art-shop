// app/dashboard/messages/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  order_reference?: string;
  status: string;
  created_at: string;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new'>('all');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/messages');
    const data = await res.json();
    setMessages(data.messages || []);
    setLoading(false);
  }

  async function markStatus(id: string, status: string) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    await fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
  }

  function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  const filtered = filter === 'new' ? messages.filter(m => m.status === 'new') : messages;
  const newCount = messages.filter(m => m.status === 'new').length;

  return (
    <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
      <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 12 }}>← Dashboard</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Messages</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {newCount > 0 ? `${newCount} new message${newCount !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setFilter('all')} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            background: filter === 'all' ? 'var(--accent)' : 'white',
            color: filter === 'all' ? 'white' : 'var(--text-secondary)',
            border: '0.5px solid var(--border)'
          }}>All</button>
          <button onClick={() => setFilter('new')} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            background: filter === 'new' ? 'var(--accent)' : 'white',
            color: filter === 'new' ? 'white' : 'var(--text-secondary)',
            border: '0.5px solid var(--border)'
          }}>New {newCount > 0 && `(${newCount})`}</button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 15 }}>No messages{filter === 'new' ? ' — inbox is clear' : ' yet'}.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(m => (
            <div key={m.id} style={{
              background: 'white', border: '0.5px solid var(--border)', borderRadius: 12,
              padding: '18px 20px', borderLeft: m.status === 'new' ? '3px solid var(--accent)' : '3px solid transparent'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
<div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name || m.email}</div>
                  {m.name && <a href={`mailto:${m.email}`} style={{ fontSize: 12, color: 'var(--accent-soft)' }}>{m.email}</a>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(m.created_at)}</span>
                  {m.status === 'new' ? (
                    <button onClick={() => markStatus(m.id, 'read')} style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-pill)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Mark read</button>
                  ) : (
                    <span style={{ fontSize: 11, color: '#3B6D11', background: '#DCE8DC', borderRadius: 6, padding: '4px 10px' }}>Read</span>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.message}</p>
              {m.order_reference && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Order: {m.order_reference}</div>
              )}
              <a href={`mailto:${m.email}?subject=Re: your message to ItemssyPrints`} style={{ fontSize: 12, color: 'var(--accent-soft)', marginTop: 10, display: 'inline-block' }}>Reply by email →</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}