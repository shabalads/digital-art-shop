// app/(info)/about/page.tsx

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about ItemssyPrints — digital wall art prints designed with care, delivered instantly or shipped to your door.',
};

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px clamp(20px, 4vw, 40px) 100px' }}>
      <div style={{ marginBottom: 56 }}>
        <div style={{ fontSize: 11, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 14, fontWeight: 500 }}>Our story</div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 20 }}>
          Art for every home,<br />at an honest price.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.8, maxWidth: 580 }}>
          ItemssyPrints started as a simple idea — beautiful wall art shouldn't cost a fortune or take weeks to arrive. We design every print ourselves and make them available instantly as digital downloads or as premium physical prints shipped to your door.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 56 }}>
        {[
          { title: 'Designed with care', desc: 'Every piece is created in-house. No stock art, no shortcuts.' },
          { title: 'Instant delivery', desc: 'Digital files arrive in seconds. No waiting, no shipping delays.' },
          { title: 'Print quality', desc: 'Premium matte paper, printed and shipped by our trusted print partners.' },
          { title: '600+ designs', desc: 'Abstract, botanical, typography, vintage and more — always growing.' },
        ].map(v => (
          <div key={v.title} style={{ background: 'white', border: '0.5px solid var(--border)', borderRadius: 12, padding: '20px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{v.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{v.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 28 }}>How it works</h2>
        {[
          { step: '01', title: 'Browse & choose', desc: 'Find a print you love from our collection of 600+ designs.' },
          { step: '02', title: 'Pick your format', desc: 'Digital download for instant access, or printed & shipped to your door.' },
          { step: '03', title: 'Checkout securely', desc: 'Pay via Stripe — fast, secure, no account required.' },
          { step: '04', title: 'Enjoy your art', desc: 'Download instantly or receive your print within 3–5 business days.' },
        ].map((s, i, arr) => (
          <div key={s.step} style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 20, padding: '20px 0', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-soft)', paddingTop: 3 }}>{s.step}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#F2EDE6', borderRadius: 16, padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>Ready to find your print?</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.7 }}>Browse 600+ designs and download instantly or get it shipped to your door.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/shop" style={{ background: 'var(--accent)', color: 'white', borderRadius: 24, padding: '12px 28px', fontSize: 14, fontWeight: 500 }}>Browse all prints →</Link>
          <Link href="/contact" style={{ background: 'white', color: 'var(--text-primary)', border: '0.5px solid var(--border)', borderRadius: 24, padding: '12px 24px', fontSize: 14 }}>Get in touch</Link>
        </div>
      </div>
    </div>
  );
}