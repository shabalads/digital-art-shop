// app/not-found.tsx

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '120px 40px', textAlign: 'center' }}>
      <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: '-4px', color: 'var(--border)', marginBottom: 16 }}>404</div>
      <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 12 }}>Page not found</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 36 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link href="/" style={{
          background: 'var(--accent)', color: 'white',
          borderRadius: 24, padding: '11px 24px', fontSize: 14, fontWeight: 500
        }}>Go home</Link>
        <Link href="/shop" style={{
          background: 'var(--bg-pill)', color: 'var(--text-primary)',
          border: '0.5px solid var(--border)',
          borderRadius: 24, padding: '11px 24px', fontSize: 14
        }}>Browse shop</Link>
      </div>
    </div>
  );
}