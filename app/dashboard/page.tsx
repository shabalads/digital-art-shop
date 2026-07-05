// app/dashboard/page.tsx

import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';

function SignOutButtonInline() {
  return (
    <SignOutButton>
      <button style={{
        background: 'none', border: '0.5px solid var(--border)',
        borderRadius: 8, padding: '6px 14px', fontSize: 13,
        color: 'var(--text-muted)', cursor: 'pointer'
      }}>Log out</button>
    </SignOutButton>
  );
}

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px clamp(20px, 4vw, 32px) 80px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 10, fontWeight: 500 }}>Admin</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px', marginBottom: 6 }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Manage your ItemssyCrafts shop</p>
        </div>
        <Link href="/" style={{
          fontSize: 13, color: 'var(--accent-soft)', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', border: '0.5px solid var(--border)',
          borderRadius: 8, marginTop: 8
        }}>
          ← View shop
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {[
          { href: '/dashboard/products', icon: '◻', label: 'Products', desc: 'Add, edit and manage listings', action: 'Manage listings' },
          { href: '/dashboard/orders', icon: '↓', label: 'Orders', desc: 'View and track all orders', action: 'View orders' },
          { href: '/dashboard/import', icon: '⊕', label: 'Import', desc: 'Bulk import from Etsy CSV', action: 'Import listings' },
          { href: '/shop', icon: '◈', label: 'Storefront', desc: 'See your live shop', action: 'View shop' },
          { href: '/dashboard/sections', icon: '▦', label: 'Sections', desc: 'Curated product groups for homepage', action: 'Manage sections' },
          { href: '/dashboard/mockups', icon: '◻', label: 'Mockups', desc: 'Link room photos to products', action: 'Manage mockups' },
          { href: '/dashboard/bestsellers', icon: '★', label: 'Bestsellers', desc: 'Manage and reorder bestsellers', action: 'Manage bestsellers' },
          { href: '/dashboard/categories', icon: '▤', label: 'Categories', desc: 'Add, rename, or delete categories', action: 'Manage categories' },
        ].map(card => (
          <Link key={card.href} href={card.href} style={{
            background: 'white', border: '0.5px solid var(--border-card)',
            borderRadius: 12, padding: '24px', textDecoration: 'none', display: 'block',
            transition: 'box-shadow 0.15s'
          }}>
            <div style={{ fontSize: 22, marginBottom: 14, color: 'var(--accent-soft)' }}>{card.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, letterSpacing: '-0.2px' }}>{card.desc}</div>
            <div style={{ fontSize: 13, color: 'var(--accent-soft)', marginTop: 12 }}>{card.action} →</div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div style={{ marginTop: 40, padding: '20px 24px', background: 'white', border: '0.5px solid var(--border)', borderRadius: 12, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Quick links:</span>
        <Link href="/dashboard/products/new" style={{ fontSize: 13, color: 'var(--accent-soft)' }}>+ Add product</Link>
        <Link href="/dashboard/orders" style={{ fontSize: 13, color: 'var(--accent-soft)' }}>Latest orders</Link>
        <Link href="/dashboard/import" style={{ fontSize: 13, color: 'var(--accent-soft)' }}>Import CSV</Link>
        <Link href="/" style={{ fontSize: 13, color: 'var(--accent-soft)' }}>View homepage</Link>
<div style={{ marginLeft: 'auto' }}>
          {/* @ts-ignore */}
          <SignOutButtonInline />
        </div>
      </div>
    </div>
  );
}