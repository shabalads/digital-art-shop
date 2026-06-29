// app/success/page.tsx

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!cleared) {
      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('storage'));
      setCleared(true);
    }
  }, []);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px clamp(20px, 4vw, 40px)', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#DCE8DC', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, margin: '0 auto 28px', color: '#3B6D11'
      }}>✓</div>

      <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px', marginBottom: 12 }}>Order confirmed!</h1>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
        Thank you for your purchase. Check your email for your files or shipping confirmation.
      </p>
      {sessionId && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 40, fontFamily: 'monospace' }}>
          Order ref: {sessionId.slice(-12).toUpperCase()}
        </p>
      )}

      <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: 14, padding: '24px 28px', marginBottom: 36, textAlign: 'left' }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 16 }}>What happens next</div>
        {[
          { step: '1', label: 'Digital downloads', desc: 'Your files will arrive by email within minutes. Check spam if not received.' },
          { step: '2', label: 'Physical prints', desc: 'Your print will be produced and shipped within 3–5 business days.' },
          { step: '3', label: 'Need help?', desc: 'Email itemssycrafts@gmail.com — we respond within 24 hours.' },
        ].map(s => (
          <div key={s.step} style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-pill)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'var(--accent-soft)', flexShrink: 0
            }}>{s.step}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/shop" style={{
          background: 'var(--accent)', color: 'white',
          borderRadius: 24, padding: '12px 28px', fontSize: 14, fontWeight: 500
        }}>Continue shopping →</Link>
        <Link href="/contact" style={{
          background: 'white', color: 'var(--text-primary)',
          border: '0.5px solid var(--border)',
          borderRadius: 24, padding: '12px 24px', fontSize: 14
        }}>Contact support</Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>;
}