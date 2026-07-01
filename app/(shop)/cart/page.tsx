// app/(shop)/cart/page.tsx

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useIsMobile } from '../../components/useIsMobile';

type CartItem = {
  cartId: string;
  id: string;
  title: string;
  price: number;
  type: 'digital' | 'physical';
  size?: string | null;
  quantity: number;
  bg_color: string;
  image_url?: string;
};

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleared, setCleared] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem('cart') || '[]'));
  }, []);

  function save(updated: CartItem[]) {
    setCart(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  }

  function clearAll() {
    setCleared(true);
    setTimeout(() => { save([]); setCleared(false); }, 300);
  }

  function remove(cartId: string) {
    save(cart.filter(i => i.cartId !== cartId));
  }

  function updateQty(cartId: string, qty: number) {
    if (qty < 1) return remove(cartId);
    save(cart.map(i => i.cartId === cartId ? { ...i, quantity: qty } : i));
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const hasPhysical = cart.some(i => i.type === 'physical');

  async function checkout() {
    setLoading(true);
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  if (cart.length === 0) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '100px 40px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 20 }}>◻</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.5px' }}>Your cart is empty</h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>Browse our collection and find something you love.</p>
      <Link href="/shop" style={{ background: 'var(--accent)', color: 'white', borderRadius: 24, padding: '12px 28px', fontSize: 14, fontWeight: 500 }}>
        Browse prints →
      </Link>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 40px 80px', opacity: cleared ? 0 : 1, transition: 'opacity 0.3s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px' }}>Your cart</h1>
        <button onClick={clearAll} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>Clear all</button>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 40 }}>{cart.length} item{cart.length !== 1 ? 's' : ''}</p>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: isMobile ? 32 : 48, alignItems: 'start' }}>
        <div>
          {cart.map((item, i) => (
            <div key={item.cartId || `${item.id}-${item.type}-${i}`} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 20, alignItems: 'center',
              padding: '20px 0', borderBottom: i < cart.length - 1 ? '0.5px solid var(--border)' : 'none'
            }}>
              {/* Thumbnail */}
              <div style={{ width: 80, height: 100, borderRadius: 8, background: item.bg_color, border: '0.5px solid var(--border-card)', overflow: 'hidden', flexShrink: 0 }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
              </div>

              {/* Info */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {item.type === 'digital' ? '⬇ Digital download' : '◻ Printed & shipped'}
                </div>
                {item.type === 'physical' && item.size && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, background: 'var(--bg-pill)', display: 'inline-block', padding: '2px 10px', borderRadius: 4 }}>
                    {item.size}
                  </div>
                )}
                {item.type === 'digital' && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontStyle: 'italic' }}>
                    One-time purchase · all sizes included
                  </div>
                )}
                {item.type === 'physical' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <button onClick={() => updateQty(item.cartId, item.quantity - 1)} style={{ width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 14, fontWeight: 500, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.cartId, item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-pill)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '4px 12px' }}>Qty: 1</div>
                  </div>
                )}
              </div>

              {/* Price + remove */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>${(item.price * item.quantity).toFixed(2)}</div>
                <button onClick={() => remove(item.cartId)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: 14, padding: '28px', position: 'sticky', top: 80 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Order summary</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, paddingBottom: 20, borderBottom: '0.5px solid var(--border)' }}>
            <span>Shipping</span>
            <span style={{ color: hasPhysical ? 'var(--text-secondary)' : '#3B6D11' }}>{hasPhysical ? 'Calculated at checkout' : 'Free'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, marginBottom: 24 }}>
            <span>Total</span><span>${subtotal.toFixed(2)}</span>
          </div>
          <button onClick={checkout} disabled={loading} style={{
            width: '100%', background: loading ? '#6B5F52' : 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 15, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 12
          }}>
            {loading ? 'Redirecting…' : `Checkout — $${subtotal.toFixed(2)}`}
          </button>
          <Link href="/shop" style={{ display: 'block', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>← Continue shopping</Link>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Secure checkout via Stripe', 'Instant delivery for digital files', 'Print fulfilled by Printful'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ color: '#3B6D11' }}>✓</span> {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}