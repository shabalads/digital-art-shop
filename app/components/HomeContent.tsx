// app/components/HomeContent.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { mockProducts as allProducts, bestsellerProducts, Product, categories } from '../data/products';
import ProductCard from './ProductCard';
import SkeletonCard from './SkeletonCard';
import Link from 'next/link';

const moods = [
  { label: 'Calm & Minimal', desc: 'Clean lines, quiet spaces', bg: '#E8E4DC', color: '#6B5F52', cat: 'minimal' },
  { label: 'Warm & Cozy', desc: 'Earthy tones, soft botanicals', bg: '#EDE0D0', color: '#8B5E3C', cat: 'botanical' },
  { label: 'Bold & Dramatic', desc: 'Strong shapes, deep contrast', bg: '#2C2420', color: '#E8DDD0', cat: 'abstract' },
  { label: 'Fresh & Natural', desc: 'Greens, florals, organic forms', bg: '#D8E4D0', color: '#3B5E3C', cat: 'botanical' },
  { label: 'Vintage & Nostalgic', desc: 'Faded tones, retro charm', bg: '#E4D8C0', color: '#6B5020', cat: 'vintage' },
  { label: 'Words to Live By', desc: 'Quotes that mean something', bg: '#E8E4EC', color: '#4B3B6B', cat: 'typography' },
];

// Mockup images — replace src with your real mockup URLs when ready
const MOCKUP_DEFAULTS = [
  { key: 'bathroom', src: '/mockups/Image 2.png', room: 'Bathroom', desc: 'A coastal print bringing calm to an everyday space' },
  { key: 'hallway', src: '/mockups/Image 3.png', room: 'Hallway', desc: 'A statement print that sets the tone the moment you walk in' },
  { key: 'mantle', src: '/mockups/Image 7.png', room: 'Mantle', desc: 'A framed print as the centrepiece of a styled display' },
  { key: 'gallery', src: '/mockups/Image 8.png', room: 'Gallery wall', desc: 'Mix and match prints to build a wall that tells your story' },
  { key: 'nursery', src: '/mockups/Image 9.png', room: 'Nursery', desc: 'Gentle prints that grow with your little one' },
  { key: 'living', src: '/mockups/Image 5.png', room: 'Living room', desc: 'The right print above a sofa ties the whole room together' },
];

export default function HomeContent() {
  const [products, setProducts] = useState<Product[]>(allProducts);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sort, setSort] = useState('featured');
  const [loading, setLoading] = useState(false);
const [bestsellers, setBestsellers] = useState<Product[]>(bestsellerProducts);

const shopRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mockupLinks, setMockupLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/settings?key=mockup_links')
      .then(r => r.json())
      .then(data => { if (data.value) setMockupLinks(data.value); });
  }, []);

  const mockups = MOCKUP_DEFAULTS.map(m => ({ ...m, link: mockupLinks[m.key] || '' }));

useEffect(() => {
    async function fetchBestsellers() {
      try {
        const res = await fetch('/api/products?badge=Bestseller&limit=10');
        const data = await res.json();
        if (data.products?.length > 0) {
          const sorted = [...data.products].sort((a: any, b: any) =>
            ((a.sort_order ?? 999) - (b.sort_order ?? 999))
          );
          setBestsellers(sorted);
        }
      } catch {
        // keep mock fallback
      }
    }
    fetchBestsellers();
  }, []);
  
  const recentlyAdded = [...allProducts].reverse().slice(0, 6);

  useEffect(() => {
    async function fetch_() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeCategory !== 'All') params.set('category', activeCategory.toLowerCase());
        const res = await fetch(`/api/products?${params.toString()}&limit=100`);
        const data = await res.json();
        if (data.products?.length > 0) setProducts(data.products);
        else setProducts(allProducts);
      } catch { setProducts(allProducts); }
      finally { setLoading(false); }
    }
    fetch_();
  }, [activeCategory]);

  const sorted = [...products].sort((a, b) => {
    if (sort === 'price-asc') return a.price_digital - b.price_digital;
    if (sort === 'price-desc') return b.price_digital - a.price_digital;
    if (sort === 'name') return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div>

      {/* ── HERO ── */}
      <div style={{ textAlign: 'center', padding: 'clamp(48px, 8vw, 88px) clamp(20px, 5vw, 40px) 56px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 11, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 20, fontWeight: 500 }}>
          Digital wall art · instant download · printed & shipped
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 20 }}>
          Prints for every<br />wall, every mood.
        </h1>
        <p style={{ fontSize: 17, color: 'var(--text-secondary)', marginBottom: 40, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 40px' }}>
          600+ designs — download instantly or get it printed and shipped to your door.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => shopRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{
            background: 'var(--accent)', color: 'white', border: 'none',
            borderRadius: 24, padding: '13px 32px', fontSize: 15, fontWeight: 500, cursor: 'pointer'
          }}>
            Browse all prints
          </button>
          <Link href="/shop" style={{
            background: 'transparent', color: 'var(--text-primary)',
            border: '0.5px solid var(--border)', borderRadius: 24,
            padding: '13px 28px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6
          }}>
            Go to shop →
          </Link>
        </div>
      </div>

      {/* ── VALUE PROPS ── */}
      <div style={{ borderTop: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)', background: 'white', padding: '20px 40px', marginBottom: 0 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {[
            { label: 'Instant download', desc: 'Files delivered immediately after payment' },
            { label: '5 sizes per print', desc: 'A3, A4, A5, 8×10" and 5×7" in every order' },
            { label: 'Printed & shipped', desc: 'Premium 200gsm matte, fulfilled by Printful' },
          ].map((v, i) => (
            <div key={v.label} style={{ textAlign: 'center', padding: '18px 24px', borderLeft: i > 0 ? '0.5px solid var(--border)' : 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{v.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </div>

{/* ── BESTSELLERS ── */}
{bestsellers.length > 0 && (
        <div style={{ padding: '64px clamp(20px, 4vw, 40px) 80px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Most loved</div>
              <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px' }}>Bestsellers</h2>
            </div>
            <Link href="/bestsellers" style={{ fontSize: 13, color: 'var(--accent-soft)' }}>View all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            {bestsellers.slice(0, 5).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      {/* ── SHOP BY MOOD ── */}

<div style={{ background: 'white', borderTop: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)', padding: '64px clamp(20px, 4vw, 40px)', marginBottom: 80 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ marginBottom: 36, textAlign: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>Find your style</div>
            <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px' }}>Shop by mood</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>

            {moods.map(mood => (
              <Link key={mood.label} href={`/shop?cat=${mood.cat}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: mood.bg, borderRadius: 12, padding: '28px 20px',
                  cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                  aspectRatio: '4/3', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: mood.color, marginBottom: 4, letterSpacing: '-0.2px' }}>{mood.label}</div>
                  <div style={{ fontSize: 12, color: mood.color, opacity: 0.7, lineHeight: 1.4 }}>{mood.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── LOOKS ON YOUR WALL ── */}
<div style={{ padding: '0 clamp(20px, 4vw, 40px) 80px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>In your home</div>
          <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px' }}>How it looks on your wall</h2>
        </div>
<div style={{
          display: 'grid',
          gap: 6,
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridTemplateRows: 'clamp(140px, 20vw, 220px) clamp(140px, 20vw, 220px) clamp(180px, 25vw, 280px)',
          borderRadius: 16, overflow: 'hidden'
        }}>
          {[
            { ...mockups[0], area: '1 / 1 / 2 / 5' },
            { ...mockups[1], area: '1 / 5 / 3 / 9' },
            { ...mockups[2], area: '1 / 9 / 2 / 13' },
            { ...mockups[3], area: '2 / 1 / 3 / 5' },
            { ...mockups[4], area: '2 / 9 / 4 / 13' },
            { ...mockups[5], area: '3 / 1 / 4 / 9' },
          ].map((m, i) => (
            <div
              key={i}
            style={{ gridArea: m.area, position: 'relative', overflow: 'hidden', cursor: m.link ? 'pointer' : 'default' }}
            onClick={() => m.link && (window.location.href = m.link)}
              onMouseEnter={e => {
                const overlay = (e.currentTarget as HTMLElement).querySelector('.overlay') as HTMLElement;
                if (overlay) overlay.style.opacity = '1';
              }}
              onMouseLeave={e => {
                const overlay = (e.currentTarget as HTMLElement).querySelector('.overlay') as HTMLElement;
                if (overlay) overlay.style.opacity = '0';
              }}
            >
              <img
                src={m.src}
                alt={m.room}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
              />
              <div className="overlay" style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 55%)',
                opacity: 0, transition: 'opacity 0.25s',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '14px 16px'
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'white', marginBottom: 2 }}>{m.room}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
</div>

{/* ── RECENTLY ADDED ── */}
<div style={{ borderTop: '0.5px solid var(--border)', background: 'white', padding: '64px clamp(20px, 4vw, 40px) 72px', marginBottom: 0 }}>
  <div style={{ maxWidth: 1280, margin: '0 auto' }}>
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Just dropped</div>
      <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px' }}>Recently added</h2>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
      {recentlyAdded.map(p => (
        <Link key={p.id} href={`/product/${p.id}`} style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 10, border: '0.5px solid var(--border-card)', overflow: 'hidden' }}>
            <div style={{ background: p.bg_color, aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {p.image_url
                ? <img src={p.image_url} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.4 }}>{p.title}</span>
              }
            </div>
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 6 }}>{p.category}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>${p.price_digital.toFixed(2)}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  </div>
</div>

      {/* ── FULL SHOP SECTION ── */}
      <div ref={shopRef} style={{ borderTop: '0.5px solid var(--border)', padding: '56px clamp(20px, 4vw, 40px) 80px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Browse</div>
              <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px' }}>All Prints</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sorted.length} designs</span>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{
                background: 'var(--bg)', border: '0.5px solid var(--border)',
                borderRadius: 8, padding: '7px 12px', fontSize: 13,
                color: 'var(--text-primary)', outline: 'none', cursor: 'pointer'
              }}>
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 36 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                background: activeCategory === cat ? 'var(--accent)' : 'var(--bg-pill)',
                color: activeCategory === cat ? 'white' : 'var(--text-secondary)',
                border: `0.5px solid ${activeCategory === cat ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 20, padding: '7px 18px', fontSize: 13,
                cursor: 'pointer', fontWeight: activeCategory === cat ? 500 : 400,
                transition: 'all 0.15s'
              }}>{cat}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, opacity: loading ? 0.4 : 1, transition: 'opacity 0.2s' }}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
              : sorted.map(p => <ProductCard key={p.id} product={p} />)
            }
          </div>

          {!loading && sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 16 }}>No prints found in this category.</p>
              <button onClick={() => setActiveCategory('All')} style={{
                background: 'var(--accent)', color: 'white', border: 'none',
                borderRadius: 24, padding: '10px 24px', fontSize: 14, cursor: 'pointer'
              }}>Show all</button>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href="/shop" style={{
              display: 'inline-block', background: 'transparent', color: 'var(--text-primary)',
              border: '0.5px solid var(--border)', borderRadius: 24, padding: '12px 32px', fontSize: 14
            }}>See full shop with all 600+ prints →</Link>
          </div>
        </div>
      </div>

      {/* ── BANNER ── */}
      <div style={{ padding: '64px clamp(20px, 4vw, 40px) 80px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          background: '#F2EDE6', borderRadius: 20,
          padding: 'clamp(32px, 5vw, 56px) clamp(24px, 5vw, 64px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 48, flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 14, fontWeight: 500 }}>Ready to hang</div>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 12, lineHeight: 1.15 }}>Download. Print. Hang.</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 400 }}>
              Every design is print-ready at full resolution. Works with any home printer or local print shop.
            </p>
          </div>
          <Link href="/shop" style={{
            background: 'var(--accent)', color: 'white', flexShrink: 0,
            borderRadius: 12, padding: '16px 32px', fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap'
          }}>
            Browse 600+ prints →
          </Link>
        </div>
      </div>

{/* ── TRUST BAR ── */}
      <div style={{ padding: '0 clamp(20px, 4vw, 40px) 0', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          background: 'white', border: '0.5px solid var(--border)',
          borderRadius: 16, padding: '28px 40px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 24, textAlign: 'center'
        }}>
          {[
            { value: '7,200+', label: 'Happy customers' },
            { value: '4.8 ★', label: 'Average rating' },
            { value: '527', label: 'Verified reviews' },
            { value: '2.5 yrs', label: 'On Etsy' },
            { value: '600+', label: 'Designs' },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              borderLeft: i > 0 ? '0.5px solid var(--border)' : 'none',
              padding: '0 12px'
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.8px', marginBottom: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── REVIEWS ── */}
      
      <div style={{ background: 'white', borderTop: '0.5px solid var(--border)', padding: '64px clamp(20px, 4vw, 40px) 80px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>What customers say</div>
              <h2 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, letterSpacing: '-0.5px' }}>Reviews</h2>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>★★★★★ 4.8 · 527 reviews on Etsy</div>
          </div>

          <ReviewsSection />
        </div>
      </div>

    </div>
  );
}

const allReviews = [
  { name: 'Sarah M.', country: '🇺🇸 United States', text: 'Absolutely love the print! The quality is amazing and the download was instant. Already ordered a second one for my bedroom.', product: 'Botanical Print' },
  { name: 'Emma L.', country: '🇬🇧 United Kingdom', text: 'Perfect for my new apartment. The colours are exactly as shown and it looks stunning in a white frame. Very fast delivery too!', product: 'Abstract Study' },
  { name: 'Julia K.', country: '🇩🇪 Germany', text: 'Third time ordering from this shop. The prints are always high quality and the files are easy to download. Highly recommend.', product: 'Minimal Arc' },
  { name: 'Anna P.', country: '🇨🇿 Czech Republic', text: 'Krásný tisk, skvělá kvalita. Rám z IKEA a vypadá naprosto perfektně. Rychlé stažení, vše bez problémů.', product: 'Typography Print' },
  { name: "Marie D.", country: '🇫🇷 France', text: "Superbe qualité, téléchargement immédiat. J'ai imprimé en A3 chez mon imprimeur local et le rendu est magnifique.", product: 'Botanical Study' },
  { name: 'Olivia T.', country: '🇦🇺 Australia', text: 'Such a great find. Bought 3 prints for my living room gallery wall and they look incredible together. Will definitely be back!', product: 'Abstract Collection' },
  { name: 'Jessica R.', country: '🇺🇸 United States', text: 'I printed this at Walgreens and it came out so beautiful. The file size was perfect and the colours were vibrant. Love it!', product: 'Floral Print' },
  { name: 'Sophie B.', country: '🇨🇦 Canada', text: 'Ordered 4 prints for my new home and they all look amazing. Super easy to download and the quality is outstanding.', product: 'Coastal Collection' },
  { name: 'Laura M.', country: '🇺🇸 United States', text: 'This is my third purchase from this shop. Every single time the quality is perfect and the files are exactly as described.', product: 'Abstract Print' },
  { name: 'Hannah K.', country: '🇩🇪 Germany', text: 'Wunderschöner Druck, sehr gute Qualität. Habe ihn in A3 ausgedruckt und er sieht fantastisch aus. Sehr empfehlenswert!', product: 'Botanical Print' },
  { name: 'Charlotte W.', country: '🇬🇧 United Kingdom', text: 'Gorgeous print, exactly what I was looking for. Downloaded instantly and printed perfectly. My hallway looks amazing now!', product: 'Minimal Print' },
  { name: 'Isabella F.', country: '🇮🇹 Italy', text: 'Bellissima stampa! La qualità è eccellente e il download è stato immediato. Lo consiglio vivamente a tutti!', product: 'Abstract Study' },
  { name: 'Mia S.', country: '🇸🇪 Sweden', text: 'Fantastic quality and such a beautiful design. Printed on A4 and framed it — looks like it cost ten times more than it did!', product: 'Botanical Print' },
  { name: 'Chloe P.', country: '🇫🇷 France', text: 'Très belle impression, couleurs fidèles à ce qui est montré. Livraison instantanée, je recommande vivement!', product: 'Typography Print' },
  { name: 'Grace L.', country: '🇦🇺 Australia', text: 'Ordered this as a gift and the recipient absolutely loved it. The print quality is incredible — will definitely order again!', product: 'Floral Study' },
  { name: 'Ava N.', country: '🇺🇸 United States', text: 'I was skeptical about digital prints but this completely changed my mind. The resolution is incredible and it printed beautifully.', product: 'Abstract Collection' },
  { name: 'Ella B.', country: '🇳🇿 New Zealand', text: 'Beautiful artwork, downloaded and printed within minutes. Looks stunning above my fireplace. Very happy customer!', product: 'Coastal Print' },
  { name: 'Zoe H.', country: '🇺🇸 United States', text: 'This shop is my go-to for wall art now. Affordable, beautiful, instant. What more could you want? 10/10!', product: 'Gallery Collection' },
  { name: 'Natalie C.', country: '🇨🇦 Canada', text: 'Perfect addition to my nursery! The soft colours are exactly what I wanted and the print quality is amazing.', product: 'Botanical Print' },
  { name: 'Victoria R.', country: '🇺🇸 United States', text: 'Stunning print, beautiful colours. I bought a frame from IKEA and it fits perfectly. Looks like a professional piece!', product: 'Abstract Study' },
];

function ReviewsSection() {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? allReviews : allReviews.slice(0, 8);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {visible.map((review, i) => (
          <div key={i} style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{review.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{review.country}</div>
              </div>
              <div style={{ fontSize: 12, color: '#8B7355', letterSpacing: '2px' }}>★★★★★</div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 12 }}>"{review.text}"</p>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '0.5px solid var(--border)', paddingTop: 10 }}>
              Purchased: {review.product}
            </div>
          </div>
        ))}
      </div>

      {!expanded && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setExpanded(true)}
            style={{
              background: 'none', border: '0.5px solid var(--border)',
              borderRadius: 24, padding: '10px 28px', fontSize: 13,
              color: 'var(--text-secondary)', cursor: 'pointer'
            }}
          >
            Show all 20 reviews ↓
          </button>
        </div>
      )}

      {expanded && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setExpanded(false)}
            style={{
              background: 'none', border: '0.5px solid var(--border)',
              borderRadius: 24, padding: '10px 28px', fontSize: 13,
              color: 'var(--text-secondary)', cursor: 'pointer'
            }}
          >
            Show less ↑
          </button>
        </div>
      )}
    </div>
  );
}