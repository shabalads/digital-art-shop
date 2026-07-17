// app/components/ContactContent.tsx

'use client';

import { useState } from 'react';

export default function ContactContent() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); }

  async function submit() {
    if (!form.name || !form.email || !form.message) return;
    setSending(true);
    try {
      const fullMessage = form.subject ? `[${form.subject}] ${form.message}` : form.message;
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, message: fullMessage }),
      });
      if (res.ok) setSent(true);
    } finally {
      setSending(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: 14,
    border: '0.5px solid var(--border)', borderRadius: 8,
    background: 'white', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit'
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px clamp(20px, 4vw, 40px) 100px' }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 12, fontWeight: 500 }}>Get in touch</div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 12 }}>Contact us</h1>
<p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>Questions about your order or anything else — send us a message and we'll get back to you personally.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40, alignItems: 'start' }}>
        {sent ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0' }}>
<div style={{ width: 56, height: 56, borderRadius: '50%', background: '#DCE8DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px', color: '#3B6D11' }}>✓</div>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 10 }}>Message sent!</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
              Thanks for reaching out — response times vary, but if you don't hear back right away, don't worry. If it's been over an hour on an order-related request, you're still fully eligible for a refund or cancellation. We read every message.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="Your name" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="your@email.com" />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Subject</label>
              <select value={form.subject} onChange={e => set('subject', e.target.value)} style={inputStyle}>
                <option value="">Select a topic…</option>
                <option value="order">Order issue</option>
                <option value="download">Download problem</option>
                <option value="refund">Refund request</option>
                <option value="shipping">Shipping question</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Message</label>
              <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe your question or issue…" />
            </div>
            <button onClick={submit} disabled={sending || !form.name || !form.email || !form.message} style={{
              background: 'var(--accent)', color: 'white', border: 'none',
              borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 600,
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: (!form.name || !form.email || !form.message) ? 0.5 : 1
            }}>
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </div>
        )}

<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Response time', value: 'Varies — we read everything', desc: "Order request over an hour? You're still covered for a refund or cancellation" },
            { label: 'Email', value: 'itemssy@email.cz', desc: 'For all order and product questions' },
            { label: 'Downloads', value: 'Instant delivery', desc: 'Check spam if not received' },
          ].map(item => (
            <div key={item.label} style={{ padding: '20px', background: 'white', border: '0.5px solid var(--border)', borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}