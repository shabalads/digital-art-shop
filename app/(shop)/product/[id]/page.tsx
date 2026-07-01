// app/(shop)/product/[id]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { mockProducts } from '../../../data/products';
import { Product } from '../../../data/products';
import ProductCard from '../../../components/ProductCard';
import CartToast from '../../../components/CartToast';
import ImageZoom from '../../../components/ImageZoom';
import { useIsMobile } from '../../../components/useIsMobile';
import Link from 'next/link';

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'digital' | 'physical'>('digital');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?id=${id}`);
        const data = await res.json();
        if (data.products?.[0]) {
          const p = data.products[0];
          setProduct(p);
          // fetch related
          const relRes = await fetch(`/api/products?category=${p.category}&limit=5`);
          const relData = await relRes.json();
          setRelated((relData.products || []).filter((r: Product) => r.id !== id).slice(0, 4));
        } else {
          // fallback to mock
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

  const price = type === 'digital' ? product.price_digital : product.price_physical;

  function addToCart() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existing = cart.find((i: any) => i.id === product!.id && i.type === type);
    if (existing && type === 'digital') { setToast(true); return; }
    if (existing) existing.quantity += 1;
    else cart.push({ id: product!.id, title: product!.title, price, type, quantity: 1, bg_color: product!.bg_color, image_url: product!.image_url });
    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('storage'));
    setAdding(true);
    setToast(true);
    setTimeout(() => setAdding(false), 1000);
  }

  return (
    <div>
      <div style={{ padding: '16px 40px', borderBottom: '0.5px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-muted)' }}>Home</Link><span>›</span>
        <Link href="/shop" style={{ color: 'var(--text-muted)' }}>Shop</Link><span>›</span>
        <Link href={`/shop?cat=${product.category}`} style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{product.category}</Link><span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{product.title}</span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(24px, 4vw, 48px) clamp(20px, 4vw, 40px)', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 32 : 64, alignItems: 'start' }}>
        <div style={{ position: isMobile ? 'relative' : 'sticky', top: 80 }}>
          <ImageZoom src={product.image_url} alt={product.title} bg={product.bg_color} />
        </div>

        <div>
          <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 12, fontWeight: 500 }}>{product.category}</div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: 8 }}>{product.title}</h1>
          {product.badge && (
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: 'var(--badge-bg)', color: 'var(--badge-text)', borderRadius: 4, padding: '3px 10px', marginBottom: 24 }}>{product.badge}</span>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28, marginTop: product.badge ? 0 : 24 }}>
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
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
                  ${(t === 'digital' ? product.price_digital : product.price_physical).toFixed(2)}
                </div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.65 }}>
                  {t === 'digital' ? 'Instant · 5 file sizes' : '3–5 days · 200gsm matte'}
                </div>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 28, paddingBottom: 28, borderBottom: '0.5px solid var(--border)' }}>
            {product.description || (type === 'digital'
              ? 'Instant digital download. Print at home or at your local print shop. Files are delivered immediately after payment.'
              : 'Premium quality print on 200gsm matte paper, printed and shipped within 3–5 business days.'
            )}
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 14 }}>
              {type === 'digital' ? "What's included" : 'Print details'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(type === 'digital'
                ? ['High-res JPG + PDF files', 'A3, A4, A5, 8×10", 5×7" sizes', 'Instant download after payment', 'Print at home or print shop']
                : ['200gsm premium matte paper', 'Printed by Printful', 'Shipped in protective packaging', 'Available in A3, A4, 8×10"']
              ).map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-soft)', fontSize: 16 }}>✓</span>{item}
                </div>
              ))}
            </div>
          </div>

          <button onClick={addToCart} style={{
            width: '100%', background: adding ? '#6B5F52' : 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 10, padding: '15px 0', fontSize: 15, fontWeight: 600,
            cursor: adding ? 'default' : 'pointer', transition: 'background 0.2s', marginBottom: 12
          }}>
            {adding ? '✓ Added to cart' : `Add to cart — $${price.toFixed(2)}`}
          </button>

          <Link href="/cart" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>View cart →</Link>
          <Link href="/shop" style={{ fontSize: 13, color: 'var(--accent-soft)' }}>← Back to shop</Link>
        </div>
      </div>

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

      <CartToast visible={toast} title={product.title} onClose={() => setToast(false)} />
    </div>
  );
}