// app/components/ProductCard.tsx

'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Product } from '../data/products';

function cleanProductTitle(raw: string): string {
  if (!raw) return '';
  const separators = [' | ', ' – ', ' - ', ', '];
  let cleaned = raw;
  for (const sep of separators) {
    const idx = cleaned.indexOf(sep);
    if (idx > 20) { cleaned = cleaned.substring(0, idx).trim(); break; }
  }
  cleaned = cleaned.replace(/\s*(Print|Poster|Wall Art|Printable|Digital|Download|Art Print)$/i, '').trim();
  if (cleaned.length > 50) cleaned = cleaned.substring(0, 50).split(' ').slice(0, -1).join(' ');
  return cleaned;
}

const HEART_COLORS = [
  'rgba(220,50,50,0.9)',
  'rgba(220,80,150,0.9)',
  'rgba(150,50,200,0.9)',
  'rgba(50,120,220,0.9)',
  'rgba(220,120,50,0.9)',
  'rgba(220,180,0,0.9)',
];

function getHeartColor(id: string): string {
  const idx = id.charCodeAt(0) % HEART_COLORS.length;
  return HEART_COLORS[idx];
}

function cleanTags(raw: any): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(t => typeof t === 'string' && t.trim() !== '');
}

const TAG_DESCRIPTIONS: Record<string, string> = {
  'Bestseller': 'High sales volume over the past 3 months',
  'Trending': 'Rising in popularity right now',
  'Staff pick': 'Hand-selected by our team',
  'Top rated': 'Loved by customers in reviews',
  'New': 'Recently added to the shop',
};

// Priority order — highest wins when a product has multiple tags. Only the top match shows on the image.
const TAG_PRIORITY = ['Bestseller', 'Trending', 'Staff pick', 'Top rated', 'New'];

const GOLD = '#9C7A3C';

const TAG_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  'Bestseller': {
    color: GOLD,
    icon: <svg width="9" height="9" viewBox="0 0 24 24" fill={GOLD}><path d="M12 2l2.9 6.5L22 9.3l-5 4.9 1.2 7.1L12 17.9l-6.2 3.4L7 14.2 2 9.3l7.1-.8L12 2z"/></svg>,
  },
  'Trending': {
    color: GOLD,
    icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  },
  'Staff pick': {
    color: GOLD,
    icon: <svg width="9" height="9" viewBox="0 0 24 24" fill={GOLD}><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/></svg>,
  },
  'Top rated': {
    color: GOLD,
    icon: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2"><circle cx="12" cy="8" r="5"/><path d="M8.5 13 7 22l5-3 5 3-1.5-9"/></svg>,
  },
  'New': {
    color: GOLD,
    icon: <svg width="9" height="9" viewBox="0 0 24 24" fill={GOLD}><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z"/></svg>,
  },
};

export default function ProductCard({ product, favoritedIds }: { product: Product; favoritedIds?: Set<string> }) {
  const HEART_COLOR = getHeartColor(product.id);
const [hovered, setHovered] = useState(false);
  const [badgeHovered, setBadgeHovered] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (favoritedIds) {
      setFavorited(favoritedIds.has(product.id));
    } else {
      const cached = JSON.parse(localStorage.getItem('favorites') || '[]');
      setFavorited(cached.includes(product.id));
    }
  }, [favoritedIds, product.id]);

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn || !user) {
      window.location.href = '/sign-in';
      return;
    }
    const newFavorited = !favorited;
    setFavorited(newFavorited);

    const cached: string[] = JSON.parse(localStorage.getItem('favorites') || '[]');
    const updated = newFavorited
      ? [...cached, product.id]
      : cached.filter((id: string) => id !== product.id);
    localStorage.setItem('favorites', JSON.stringify(updated));

    fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, productId: product.id }),
    });
  }

  const tags = cleanTags((product as any).tags);
  const allTags = tags.length > 0 ? tags : (product.badge ? [product.badge] : []);

  const featuredTag = TAG_PRIORITY.find(t => allTags.includes(t));
  const tagStyle = featuredTag ? TAG_STYLES[featuredTag] : null;

  return (
    <Link
      href={`/product/${product.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ textDecoration: 'none', display: 'block' }}
    >

      <div style={{
        background: 'var(--bg-card)', borderRadius: 12,
        border: '0.5px solid var(--border-card)', overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.07)' : '0 0 0 rgba(0,0,0,0)',
      }}>
        <div style={{ background: product.bg_color, aspectRatio: '3/4', overflow: 'hidden', position: 'relative' }}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s', transform: hovered ? 'scale(1.03)' : 'scale(1)' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.25 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
          )}

{featuredTag && tagStyle && (
            <div
              onMouseEnter={e => { e.preventDefault(); setBadgeHovered(true); }}
              onMouseLeave={() => setBadgeHovered(false)}
              style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #FDFBF6, #F3EBDA)',
                border: `1px solid ${GOLD}45`,
                borderRadius: 999, padding: '5px 12px',
                boxShadow: '0 1px 4px rgba(156,122,60,0.18)'
              }}>
                <span style={{ display: 'flex' }}>{tagStyle.icon}</span>
                <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '1.4px', textTransform: 'uppercase', color: GOLD }}>{featuredTag}</span>
              </div>

              {badgeHovered && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                  background: 'white', borderRadius: 8, padding: '10px 13px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)', width: 200,
                  fontSize: 12, lineHeight: 1.45, color: 'var(--text-secondary)',
                  zIndex: 10
                }}>
                  {TAG_DESCRIPTIONS[featuredTag]}
                </div>
              )}
            </div>
          )}

          <button
            onClick={toggleFavorite}
            disabled={favLoading}
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 32, height: 32, borderRadius: '50%',
              background: favorited ? HEART_COLOR : 'rgba(255,255,255,0.85)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: hovered || favorited ? 1 : 0,
              transition: 'opacity 0.2s, background 0.2s',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
            }}
          >
           <svg width="15" height="15" viewBox="0 0 24 24" fill={favorited ? 'white' : 'none'} stroke={favorited ? 'none' : HEART_COLOR} strokeWidth="2" strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
            {cleanProductTitle(product.title)}
            <span style={{ display: 'none' }}>{product.title}</span>
          </div>
<div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'capitalize' }}>{product.category}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>from ${product.price_digital.toFixed(2)}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>digital + print</span>
          </div>

</div>
      </div>
    </Link>
  );
}