// app/components/MessageWidget.tsx

'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export default function MessageWidget() {
  const { user, isSignedIn } = useUser();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [localTime, setLocalTime] = useState('');

  useEffect(() => {
    function updateTime() {
      const time = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Bangkok',
      }).format(new Date());
      setLocalTime(time);
    }
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isSignedIn && user?.primaryEmailAddress?.emailAddress) {
      setForm(f => ({ ...f, email: user.primaryEmailAddress!.emailAddress }));
    }
  }, [isSignedIn, user]);

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); }

async function submit() {
    if (!form.email || !form.message) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) setSent(true);
    } finally {
      setSending(false);
    }
  }

function reset() {
    setOpen(false);
    setTimeout(() => {
      setSent(false);
      setForm({ email: isSignedIn && user?.primaryEmailAddress?.emailAddress ? user.primaryEmailAddress.emailAddress : '', message: '' });
    }, 300);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 13,
    border: '0.5px solid var(--border)', borderRadius: 8,
    background: 'white', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit'
  };

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 998,
          width: 320, maxWidth: 'calc(100vw - 48px)',
          background: 'white', borderRadius: 16,
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          border: '0.5px solid var(--border)',
          overflow: 'hidden'
        }}>
<div style={{ background: 'var(--accent)', padding: '16px 18px', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Message us</div>
              {localTime && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, opacity: 0.85 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8FD98F' }} />
                  {localTime} in Chiang Mai
                </div>
              )}
            </div>
            <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.85, lineHeight: 1.4 }}>
              We read every message personally — replies may take a little time. If you're asking about canceling or refunding a recent order, don't worry: a slow reply from us never affects your eligibility.
            </div>
          </div>

          {sent ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#DCE8DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, margin: '0 auto 14px', color: '#3B6D11' }}>✓</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Message sent</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.5 }}>We'll get back to you as soon as we can.</div>
              <button onClick={reset} style={{ fontSize: 12.5, color: 'var(--accent-soft)', background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
            </div>
          ) : (
<div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!(isSignedIn && form.email) && (
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Your email (so we can reply)" style={inputStyle} />
              )}
              <textarea value={form.message} onChange={e => set('message', e.target.value)} placeholder="How can we help?" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              <button
                onClick={submit}
                disabled={sending || !form.email || !form.message}
                style={{
                  background: 'var(--accent)', color: 'white', border: 'none',
                  borderRadius: 8, padding: '10px 0', fontSize: 13.5, fontWeight: 600,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: (!form.email || !form.message) ? 0.5 : 1
                }}
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => open ? reset() : setOpen(true)}
        aria-label="Message us"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--accent)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          transition: 'transform 0.15s'
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        )}
      </button>
    </>
  );
}