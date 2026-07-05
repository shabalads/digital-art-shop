// app/(shop)/product/[id]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { mockProducts, Product } from '../../../data/products';
import ProductCard from '../../../components/ProductCard';
import CartToast from '../../../components/CartToast';
import ImageZoom from '../../../components/ImageZoom';
import { useIsMobile } from '../../../components/useIsMobile';
import Link from 'next/link';
import HeartButton from '../../../components/HeartButton';

const DIGITAL_SIZES = [
  { ratio: '2:3', label: 'Portrait', sizes: ['4×6"', '8×12"', '12×18"', '16×24"', '20×30"', '24×36"'] },
  { ratio: '3:4', label: 'Portrait', sizes: ['6×8"', '9×12"', '12×16"', '18×24"', '24×32"'] },
  { ratio: '4:5', label: 'Portrait', sizes: ['8×10"', '16×20"', '24×30"'] },
  { ratio: '5:7', label: 'Portrait', sizes: ['5×7"', '10×14"', '20×28"', 'A4', 'A3', 'A2', 'A1'] },
  { ratio: '11:14', label: 'Portrait', sizes: ['11×14"', '22×28"'] },
];

const PHYSICAL_SIZES = [
  { label: '5×7"', price: 19.99, popular: false },
  { label: '8×10"', price: 24.99, popular: true },
  { label: '8×12"', price: 26.99, popular: false },
  { label: '11×14"', price: 34.99, popular: true },
  { label: 'A4', price: 22.99, popular: false },
  { label: 'A3', price: 32.99, popular: false },
  { label: '16×20"', price: 44.99, popular: false },
  { label: '18×24"', price: 54.99, popular: false },
  { label: 'A2', price: 49.99, popular: false },
  { label: '24×36"', price: 69.99, popular: false },
];


export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
const [type, setType] = useState<'digital' | 'physical'>('digital');
  const [activeImage, setActiveImage] = useState<string | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState(PHYSICAL_SIZES[1].label); // default 8×10"
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(false);
  const isMobile = useIsMobile();

useEffect(() => {
    if (product?.image_url) setActiveImage(product.image_url);
    if (product?.id) {
      fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
    }
  }, [product]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?id=${id}`);
        const data = await res.json();
        if (data.products?.[0]) {
          const p = data.products[0];
          setProduct(p);
          const relRes = await fetch(`/api/products?category=${p.category}&limit=5`);
          const relData = await relRes.json();
          setRelated((relData.products || []).filter((r: Product) => r.id !== id).slice(0, 4));
        } else {
          const mock = mockProducts.find(p => p.id === id);
          if (mock) {
            setProduct(mock);
            setRelated(mockProducts.filter(p => p.category === mock.category && p.id !== id).slice(0, 4));
          }
        }
      } catch {
        const mock = mockProducts.find(p => p.id === id);
        if (mock) {
          setProduct(mock);
          setRelated(mockProducts.filter(p => p.category === mock.category && p.id !== id).slice(0, 4));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading…</div>
    </div>
  );

  if (!product) return (
    <div style={{ padding: '80px 40px', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Product not found.</p>
      <Link href="/shop" style={{ color: 'var(--accent-soft)' }}>← Back to shop</Link>
    </div>
  );

  const activePhysicalSize = PHYSICAL_SIZES.find(size => size.label === selectedSize) ?? PHYSICAL_SIZES[1];
  const price = type === 'digital' ? product.price_digital : activePhysicalSize.price;

  // Clean description — strip Etsy template boilerplate
function cleanDescription(raw: string): string {
    if (!raw) return '';
    const cutMarkers = [
      '𝗗𝗜𝗚𝗜𝗧𝗔𝗟', 'DIGITAL WALL ART', 'DIGITAL DOWNLOAD', '⬇︎', '** WHAT YOU',
      '•• WHAT YOU', 'WHAT YOU\'LL RECEIVE', 'FILE SIZES', '300dpi',
      'HOW TO DOWNLOAD', 'IMPORTANT NOTES', 'PERSONAL USE ONLY',
      '𝐅𝐈𝐋𝐄', '𝐖𝐇𝐀𝐓', '- ••', '••', '**', '| ⬇'
    ];
    let cleaned = raw;
    for (const marker of cutMarkers) {
      const idx = cleaned.indexOf(marker);
      if (idx >= 0) {
        cleaned = cleaned.substring(0, idx).trim();
        break;
      }
    }
    cleaned = cleaned.replace(/^[\s\-|•·▪►]+/, '').replace(/[\s\-|•·▪►]+$/, '').trim();
    // If nothing left after cleaning, return empty
    if (cleaned.length < 20) return '';
    return cleaned;
  }

  const cleanDesc = cleanDescription(product.description || '');

  function addToCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartId = `${product!.id}-${type}-${type === 'physical' ? activePhysicalSize.label : ''}`;
    const existing = cart.find((i: any) => i.cartId === cartId);
    if (existing && type === 'digital') { setToast(true); return; }
    if (existing) existing.quantity += 1;
else cart.push({
      cartId,
      id: product!.id,
      title: product!.title,
      price,
      type,
      size: type === 'physical' ? activePhysicalSize.label : null,
      quantity: 1,
      bg_color: product!.bg_color,
      image_url: product!.image_url,
      badge: product!.badge
    });
    
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    setAdding(true);
    setToast(true);
    setTimeout(() => setAdding(false), 1000);
  }

  // Clean title — truncate at first pipe, dash or comma after ~50 chars
function cleanTitle(raw: string): string {
    if (!raw) return '';
    // Cut at separators
    const separators = [' | ', ' – ', ' - ', ', '];
    let cleaned = raw;
    for (const sep of separators) {
      const idx = cleaned.indexOf(sep);
      if (idx > 20) { cleaned = cleaned.substring(0, idx).trim(); break; }
    }
    // Remove trailing filler words
    cleaned = cleaned
      .replace(/\s*(Print|Poster|Wall Art|Printable|Digital|Download|Art Print)$/i, '')
      .trim();
    // Cap at 60 chars on word boundary
    if (cleaned.length > 60) {
      cleaned = cleaned.substring(0, 60).split(' ').slice(0, -1).join(' ');
    }
    return cleaned;
  }

  const displayTitle = cleanTitle(product.title);

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ padding: '16px 40px', borderBottom: '0.5px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link><span>›</span>
        <Link href="/shop" style={{ color: 'var(--text-muted)' }}>Shop</Link><span>›</span>
        <Link href={`/shop?cat=${product.category}`} style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{product.category}</Link><span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{displayTitle}</span>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(24px, 4vw, 48px) clamp(20px, 4vw, 40px)', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 32 : 64, alignItems: 'start' }}>

        {/* Image */}
<div style={{ position: isMobile ? 'relative' : 'sticky', top: 80 }}>
          <div style={{ position: 'relative' }}>
            <ImageZoom src={activeImage || product.image_url} alt={displayTitle} bg={product.bg_color} />
            <HeartButton productId={product.id} />
            {(() => {
              const GOLD = '#9C7A3C';
              const cleanTags = (raw: any): string[] => Array.isArray(raw) ? raw.filter(t => typeof t === 'string' && t.trim() !== '') : [];
              const tags = cleanTags((product as any).tags);
              const isBestseller = tags.includes('Bestseller') || product.badge === 'Bestseller';
              if (!isBestseller) return null;
              return (
                <div style={{
                  position: 'absolute', top: 14, left: 14, zIndex: 3,
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(3px)',
                  borderRadius: 6, padding: '5px 11px 5px 8px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill={GOLD}><path d="M12 2l2.9 6.5L22 9.3l-5 4.9 1.2 7.1L12 17.9l-6.2 3.4L7 14.2 2 9.3l7.1-.8L12 2z"/></svg>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: GOLD }}>Bestseller</span>
                </div>
              );
            })()}
          </div>

          {/* Thumbnail strip */}
          {product.images && product.images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {/* Main image thumbnail */}
              <div
                onClick={() => setActiveImage(product.image_url)}
                style={{
                  width: 56, height: 72, borderRadius: 8, overflow: 'hidden',
                  cursor: 'pointer', border: (activeImage === product.image_url || !activeImage) ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: product.bg_color, flexShrink: 0
                }}
              >
                {product.image_url && <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              {/* Extra image thumbnails */}
              {(product.images as string[]).map((img, i) => (
                <div
                  key={i}
                  onClick={() => setActiveImage(img)}
                  style={{
                    width: 56, height: 72, borderRadius: 8, overflow: 'hidden',
                    cursor: 'pointer', border: activeImage === img ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: product.bg_color, flexShrink: 0
                  }}
                >
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 10, fontWeight: 500 }}>{product.category}</div>
<h1 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, letterSpacing: '-0.8px', lineHeight: 1.2, marginBottom: 16 }}>{displayTitle}</h1>

{(() => {
            const GOLD = '#9C7A3C';
            const cleanTags = (raw: any): string[] => Array.isArray(raw) ? raw.filter(t => typeof t === 'string' && t.trim() !== '') : [];
            const tags = cleanTags((product as any).tags);
            const otherTags = tags.length > 0
              ? tags.filter(t => t !== 'Bestseller')
              : (product.badge && product.badge !== 'Bestseller' ? [product.badge] : []);

            if (otherTags.length === 0) return null;

            return (
              <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {otherTags.map(t => (
                  <span key={t} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: GOLD }}>{t}</span>
                ))}
              </div>
            );
          })()}

          {/* Type selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {(['digital', 'physical'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                padding: '14px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: type === t ? 'var(--accent)' : 'white',
                color: type === t ? 'white' : 'var(--text-primary)',
                border: `1px solid ${type === t ? 'var(--accent)' : 'var(--border)'}`,
                transition: 'all 0.15s'
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, opacity: type === t ? 0.8 : 0.5 }}>
                  {t === 'digital' ? 'Digital download' : 'Printed & shipped'}
                </div>
<div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px' }}>
                  {t === 'digital' ? `$${product.price_digital.toFixed(2)}` : t === type ? `$${activePhysicalSize.price.toFixed(2)}` : `from $${PHYSICAL_SIZES[0].price.toFixed(2)}`}
                </div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.65 }}>
                  {t === 'digital' ? 'Instant · all sizes included' : '3–5 days · 200gsm matte'}
                </div>
              </button>
            ))}
          </div>

          {/* Digital content */}
          {type === 'digital' && (
            <div style={{ marginBottom: 24 }}>
              {cleanDesc && (
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 20, paddingBottom: 20, borderBottom: '0.5px solid var(--border)' }}>
                  {cleanDesc}
                </p>
              )}

              {/* File sizes */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 14 }}>
                  5 high-res JPEGs included — all sizes below
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {DIGITAL_SIZES.map(group => (
                    <div key={group.ratio} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'var(--bg-pill)', borderRadius: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-soft)', minWidth: 36, paddingTop: 1 }}>{group.ratio}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {group.sizes.map(s => (
                          <span key={s} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'white', border: '0.5px solid var(--border)', borderRadius: 4, padding: '2px 8px' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {['300 DPI — print-ready resolution', 'Instant download after payment', 'Print at home or at any local print shop', 'Personal use license included'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-soft)' }}>✓</span>{item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Physical content */}
          {type === 'physical' && (
            <div style={{ marginBottom: 24 }}>
              {cleanDesc && (
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 20, paddingBottom: 20, borderBottom: '0.5px solid var(--border)' }}>
                  {cleanDesc}
                </p>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 12 }}>
                  Select size
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                  {PHYSICAL_SIZES.map(size => (
                    <button
                      key={size.label}
                      onClick={() => setSelectedSize(size.label)}
                      style={{
                        padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                        textAlign: 'center', position: 'relative',
                        background: selectedSize === size.label ? 'var(--accent)' : 'white',
                        color: selectedSize === size.label ? 'white' : 'var(--text-primary)',
                        border: `1px solid ${selectedSize === size.label ? 'var(--accent)' : 'var(--border)'}`,
                        transition: 'all 0.15s'
                      }}
                    >
                      {size.popular && selectedSize !== size.label && (
                        <div style={{ position: 'absolute', top: -6, right: -6, background: '#8B6F4E', color: 'white', fontSize: 8, fontWeight: 700, borderRadius: 4, padding: '1px 4px', letterSpacing: '0.3px' }}>TOP</div>
                      )}
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{size.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.75 }}>${size.price.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {['Premium 200gsm matte paper', 'Printed by Printful', 'Shipped in protective packaging', 'Arrives in 3–5 business days'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent-soft)' }}>✓</span>{item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button onClick={addToCart} style={{
            width: '100%', background: adding ? '#6B5F52' : 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 10, padding: '15px 0', fontSize: 15, fontWeight: 600,
            cursor: adding ? 'default' : 'pointer', transition: 'background 0.2s', marginBottom: 12
          }}>
            {adding ? '✓ Added to cart' : `Add to cart — $${price.toFixed(2)}`}
          </button>

          <Link href="/cart" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>View cart →</Link>
          <Link href="/shop" style={{ fontSize: 13, color: 'var(--accent-soft)' }}>← Back to shop</Link>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div style={{ borderTop: '0.5px solid var(--border)', padding: '56px clamp(20px, 4vw, 40px) 80px', background: 'white' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>More like this</div>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 28 }}>You might also like</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </div>
      )}

      <CartToast visible={toast} title={displayTitle} onClose={() => setToast(false)} />
    </div>
  );
}