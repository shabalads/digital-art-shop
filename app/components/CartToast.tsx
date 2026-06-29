// app/components/CartToast.tsx

'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function CartToast({ visible, title, onClose }: {
  visible: boolean;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [visible]);

  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32, zIndex: 999,
      background: 'var(--accent)', color: 'white',
      borderRadius: 12, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      transform: visible ? 'translateY(0)' : 'translateY(120px)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s',
      minWidth: 260, pointerEvents: visible ? 'all' : 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>✓</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Added to cart</div>
          <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{title}</div>
        </div>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'white', opacity: 0.6, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
      </div>
      <Link href="/cart" style={{
        display: 'block', textAlign: 'center', background: 'white',
        color: 'var(--accent)', borderRadius: 8, padding: '8px 0',
        fontSize: 13, fontWeight: 600
      }}>
        View cart →
      </Link>
    </div>
  );
}