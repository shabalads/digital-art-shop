// app/components/HeartButton.tsx

'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export default function HeartButton({ productId }: { productId: string }) {
  const { user, isSignedIn } = useUser();
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorited(cached.includes(productId));
  }, [productId]);

  const HEART_COLORS = [
    'rgba(220,50,50,0.9)', 'rgba(220,80,150,0.9)', 'rgba(150,50,200,0.9)',
    'rgba(50,120,220,0.9)', 'rgba(220,120,50,0.9)', 'rgba(220,180,0,0.9)',
  ];
  const heartColor = HEART_COLORS[productId.charCodeAt(0) % HEART_COLORS.length];

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    if (!isSignedIn || !user) { window.location.href = '/sign-in'; return; }
    const newFav = !favorited;
    setFavorited(newFav);
    const cached: string[] = JSON.parse(localStorage.getItem('favorites') || '[]');
    const updated = newFav ? [...cached, productId] : cached.filter((id: string) => id !== productId);
    localStorage.setItem('favorites', JSON.stringify(updated));
    fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, productId }),
    });
  }

  return (
    <button onClick={toggle} style={{
      position: 'absolute', top: 12, right: 12, zIndex: 10,
      width: 40, height: 40, borderRadius: '50%',
      background: favorited ? heartColor : 'rgba(255,255,255,0.9)',
      border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      backdropFilter: 'blur(4px)',
      transition: 'transform 0.15s, background 0.2s'
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={favorited ? 'white' : 'none'} stroke={favorited ? 'none' : heartColor} strokeWidth="2" strokeLinecap="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  );
}