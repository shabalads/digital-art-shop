// app/(auth)/register/page.tsx

import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>
          Itemssy<span style={{ color: 'var(--accent-soft)', fontWeight: 400 }}>Crafts</span>
        </Link>
        <div style={{ marginTop: 32, background: 'white', border: '0.5px solid var(--border)', borderRadius: 14, padding: '36px 28px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 8 }}>Create account</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
            Customer accounts are coming soon. For now you can browse and purchase without an account.
          </p>
          <Link href="/shop" style={{
            display: 'block', background: 'var(--accent)', color: 'white',
            borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 600, marginBottom: 12
          }}>Browse shop →</Link>
          <Link href="/login" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Dashboard login →</Link>
        </div>
        <div style={{ marginTop: 20 }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--text-muted)' }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}