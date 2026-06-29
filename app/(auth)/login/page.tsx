// app/(auth)/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function login() {
    if (!password) return;
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) router.push('/dashboard');
    else { setError('Incorrect password.'); setLoading(false); }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>
            Itemssy<span style={{ color: 'var(--accent-soft)', fontWeight: 400 }}>Crafts</span>
          </Link>
          <div style={{ marginTop: 24, fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 8 }}>Dashboard login</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Enter your password to continue</div>
        </div>
        <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: 14, padding: '28px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Password</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Enter password" autoFocus
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14,
                border: `0.5px solid ${error ? '#E24B4A' : 'var(--border)'}`,
                borderRadius: 8, outline: 'none', background: 'white',
                color: 'var(--text-primary)', fontFamily: 'inherit'
              }}
            />
            {error && <p style={{ fontSize: 12, color: '#A32D2D', marginTop: 6 }}>{error}</p>}
          </div>
          <button onClick={login} disabled={loading || !password} style={{
            width: '100%', background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 8, padding: '11px 0',
            fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: !password ? 0.5 : 1
          }}>
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/" style={{ fontSize: 13, color: 'var(--text-muted)' }}>← Back to shop</Link>
        </div>
      </div>
    </div>
  );
}