// app/components/ProductCard.tsx

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Product } from '../data/products';

export default function ProductCard({ product }: { product: Product }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/product/${product.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 12,
        border: '0.5px solid var(--border-card)',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.07)' : '0 0 0 rgba(0,0,0,0)',
      }}>
        {/* Image area */}
        <div style={{
          background: product.bg_color,
          aspectRatio: '3/4',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s', transform: hovered ? 'scale(1.03)' : 'scale(1)' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.5 }}>{product.title}</span>
            </div>
          )}
          {product.badge && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: 'white', color: 'var(--accent-soft)',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
              textTransform: 'uppercase', borderRadius: 4, padding: '3px 8px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }}>
              {product.badge}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
            {product.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'capitalize' }}>
            {product.category}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              from ${product.price_digital.toFixed(2)}
            </span>
<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              digital + print
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}