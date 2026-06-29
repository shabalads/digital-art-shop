// app/components/ScrollToTop.tsx

'use client';

import { useState, useEffect } from 'react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() { setVisible(window.scrollY > 400); }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        position: 'fixed', bottom: 32, left: 32, zIndex: 998,
        width: 40, height: 40, borderRadius: '50%',
        background: 'white', border: '0.5px solid var(--border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        cursor: 'pointer', fontSize: 18, color: 'var(--text-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: visible ? 'translateY(0)' : 'translateY(80px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s, opacity 0.3s',
        pointerEvents: visible ? 'all' : 'none'
      }}
    >
      ↑
    </button>
  );
}