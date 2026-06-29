// app/components/Navbar.tsx

'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useIsMobile } from './useIsMobile';
import { useUser, SignInButton, UserButton } from '@clerk/nextjs';

function NavbarContent() {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { isSignedIn } = useUser();

  useEffect(() => {
    setMounted(true);
    function updateCount() {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(cart.reduce((sum: number, i: any) => sum + i.quantity, 0));
    }
    updateCount();
    window.addEventListener('storage', updateCount);
    window.addEventListener('focus', updateCount);
    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('focus', updateCount);
    };
  }, []);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8); }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);

  function handleSearch(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && search.trim()) {
      router.push(`/shop?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
      setSearchOpen(false);
    }
    if (e.key === 'Escape') { setSearchOpen(false); setSearch(''); }
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/shop', label: 'Shop' },
    { href: '/bestsellers', label: 'Best Sellers' },
    { href: '/faq', label: 'FAQ' },
    { href: '/about', label: 'About' },
  ];

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    width: 40, height: 40, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#6B5440', transition: 'background 0.15s, color 0.15s',
    flexShrink: 0
  };

  return (
    <>
      {/* Top announcement bar */}
      <div style={{
        background: '#2C2420', color: '#E8DDD0',
        textAlign: 'center', padding: '9px 20px',
        fontSize: 12, letterSpacing: '0.8px', fontWeight: 400
      }}>
        Free instant download with every order · Printed & shipped worldwide
      </div>

      <nav style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr auto' : '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 40px',
        height: 72,
        background: mounted && scrolled ? 'rgba(250,248,245,0.97)' : '#FAF8F5',
        backdropFilter: mounted && scrolled ? 'blur(20px)' : 'none',
        borderBottom: `0.5px solid ${mounted && scrolled ? '#D8D0C4' : '#EAE4DC'}`,
        position: 'sticky', top: 0, zIndex: 100,
        transition: 'background 0.3s, border-color 0.3s',
        boxShadow: mounted && scrolled ? '0 1px 20px rgba(44,36,32,0.06)' : 'none'
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B6F4E, #C4A882)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '-0.3px',
            flexShrink: 0
          }}>IC</div>
          <span style={{
            fontSize: 19, fontWeight: 700, letterSpacing: '-0.6px',
            color: '#1E1810',
            fontFamily: 'Georgia, serif'
          }}>
            Itemssy<span style={{ color: '#8B6F4E', fontWeight: 400, fontStyle: 'italic' }}>Crafts</span>
          </span>
        </Link>

        {/* Center nav */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            {navLinks.map(link => {
              const isActive = pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(link.href.split('?')[0]) && !searchParams.toString());
              return (
                <Link key={link.href} href={link.href} style={{
                  fontSize: 14, fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#1E1810' : '#7A6450',
                  textDecoration: 'none', letterSpacing: '0.1px',
                  position: 'relative', padding: '4px 0',
                  transition: 'color 0.15s'
                }}>
                  {link.label}
                  {isActive && (
                    <span style={{
                      position: 'absolute', bottom: -2, left: 0, right: 0,
                      height: 2, background: '#8B6F4E', borderRadius: 2
                    }} />
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>

          {/* Search */}
          {!isMobile && (
            <>
              {searchOpen ? (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginRight: 4 }}>
                  <svg style={{ position: 'absolute', left: 12, color: '#8B7355', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={handleSearch}
                    onBlur={() => { if (!search) setSearchOpen(false); }}
                    placeholder="Search prints…"
                    style={{
                      background: '#F2EDE6', border: '1px solid #C8B89A',
                      borderRadius: 22, padding: '8px 16px 8px 34px', fontSize: 13,
                      color: '#1E1810', width: 220, outline: 'none',
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  style={iconBtn}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F0E8DC'; (e.currentTarget as HTMLElement).style.color = '#2C2420'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#6B5440'; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>
              )}
            </>
          )}

          {/* Account */}
          {isSignedIn ? (
            <div style={{ marginLeft: 4 }}><UserButton /></div>
          ) : (
            <SignInButton mode="modal">
              <button
                style={iconBtn}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F0E8DC'; (e.currentTarget as HTMLElement).style.color = '#2C2420'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#6B5440'; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
            </SignInButton>
          )}

          {/* Cart */}
          <Link
            href="/cart"
            style={{ ...iconBtn, position: 'relative', textDecoration: 'none' } as React.CSSProperties}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F0E8DC'; (e.currentTarget as HTMLElement).style.color = '#2C2420'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#6B5440'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                background: '#8B6F4E', color: 'white',
                borderRadius: '50%', width: 17, height: 17,
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #FAF8F5', letterSpacing: 0
              }}>{cartCount}</span>
            )}
          </Link>

          {/* Mobile hamburger */}
          {isMobile && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={iconBtn}
            >
              {menuOpen
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              }
            </button>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <div style={{
          position: 'fixed', top: 108, left: 0, right: 0, bottom: 0,
          background: '#FAF8F5', zIndex: 99,
          padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 4,
          borderTop: '0.5px solid #EAE4DC'
        }}>
          <div style={{ marginBottom: 20 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              placeholder="Search prints…"
              style={{
                width: '100%', background: '#F2EDE6', border: '0.5px solid #C8B89A',
                borderRadius: 12, padding: '13px 16px', fontSize: 15,
                color: '#1E1810', outline: 'none', fontFamily: 'inherit'
              }}
            />
          </div>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} style={{
              fontSize: 26, fontWeight: 500, color: '#1E1810',
              padding: '16px 0', borderBottom: '0.5px solid #EAE4DC',
              letterSpacing: '-0.5px', textDecoration: 'none',
              fontFamily: 'Georgia, serif'
            }}>{link.label}</Link>
          ))}
        </div>
      )}
    </>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={null}>
      <NavbarContent />
    </Suspense>
  );
}