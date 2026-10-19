// app/components/Footer.tsx

'use client';
import Link from 'next/link';
import { useIsMobile } from './useIsMobile';
import { CATEGORY_LINKS } from '../data/categories';

export default function Footer() {
  const isMobile = useIsMobile();
  return (
    <footer style={{
      borderTop: '0.5px solid var(--border)',
      padding: '40px',
      background: 'var(--bg)',
      marginTop: 80
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.4fr 1fr', gap: isMobile ? 32 : 40 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px', marginBottom: 10 }}>
            Itemssy<span style={{ color: 'var(--accent-soft)', fontWeight: 400 }}>Prints</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Digital wall art prints for every home.<br />Instant download or printed & shipped.
          </p>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 14 }}>Shop</div>
          <Link href="/shop" style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>All prints</Link>
          {/* One real link per category page (/shop/<slug>) — static, so they're in the HTML of every page */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', columnGap: 16, rowGap: 10 }}>
            {CATEGORY_LINKS.map((c) => (
              <Link key={c.slug} href={`/shop/${c.slug}`} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.name}</Link>
            ))}
          </div>
        </div>
        <div>
<div>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 14 }}>Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/faq" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>FAQ</Link>
              <Link href="/reviews" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Reviews</Link>
              <Link href="/refunds" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Refund policy</Link>
              <Link href="/contact" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Contact</Link>
              <Link href="/privacy" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Privacy policy</Link>
              <Link href="/terms" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Terms of use</Link>
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '32px auto 0', paddingTop: 24, borderTop: '0.5px solid var(--border)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 0, justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
        <span>© 2026 ItemssyPrints. All rights reserved.</span>
        <span>Digital prints · Instant delivery</span>
      </div>
    </footer>
  );
}