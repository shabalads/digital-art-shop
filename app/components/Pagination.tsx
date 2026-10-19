// app/components/Pagination.tsx
//
// Server-rendered pagination: every control is a real <a href>, present in the
// first HTML response, so crawlers can walk from page 1 to the last page and
// reach every product without running JS. Mirrors the pager in
// app/(shop)/shop/ShopPageClient.tsx (which is tied to client-side filtering
// and so can't be shared).

import Link from 'next/link';

const BOX = { borderRadius: 8, fontSize: 13, background: 'white', border: '0.5px solid var(--border)' } as const;
const DISABLED = { ...BOX, padding: '9px 18px', color: 'var(--text-muted)', opacity: 0.4, cursor: 'not-allowed' } as const;
const ENABLED = { ...BOX, padding: '9px 18px', color: 'var(--text-primary)', textDecoration: 'none' } as const;

export default function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (n: number) => string }) {
  if (totalPages <= 1) return null;

  // Every page number is a link while there are few pages, so any page is one
  // click away. Only very long lists fall back to first/last/neighbours.
  const numbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => totalPages <= 20 || n === 1 || n === totalPages || Math.abs(n - page) <= 2)
    .reduce<(number | 'gap')[]>((acc, n, idx, arr) => {
      if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('gap');
      acc.push(n);
      return acc;
    }, []);

  return (
    <nav aria-label="Pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 48, flexWrap: 'wrap' }}>
      {page <= 1 ? <span style={DISABLED}>← Previous</span> : <Link href={hrefFor(page - 1)} rel="prev" style={ENABLED}>← Previous</Link>}
      {numbers.map((n, i) =>
        n === 'gap' ? (
          <span key={`gap-${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>
        ) : (
          <Link
            key={n}
            href={hrefFor(n)}
            aria-current={page === n ? 'page' : undefined}
            style={{
              ...BOX, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
              background: page === n ? 'var(--accent)' : 'white',
              border: `0.5px solid ${page === n ? 'var(--accent)' : 'var(--border)'}`,
              color: page === n ? 'white' : 'var(--text-primary)',
              fontWeight: page === n ? 600 : 400,
            }}
          >{n}</Link>
        )
      )}
      {page >= totalPages ? <span style={DISABLED}>Next →</span> : <Link href={hrefFor(page + 1)} rel="next" style={ENABLED}>Next →</Link>}
    </nav>
  );
}
