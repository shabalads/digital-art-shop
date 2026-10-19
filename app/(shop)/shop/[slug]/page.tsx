// app/(shop)/shop/[slug]/page.tsx
//
// Real, indexable category pages: /shop/<slug>, e.g. /shop/coastal-seaside.
// Until now a category was only reachable as /shop?section=<uuid>, which
// canonicalises to /shop — so Google could never rank a page for "coastal wall
// art" or the like. Each page here is a Server Component with its own title,
// meta description, hand-written intro, a self-referencing canonical, and a
// grid of real product links with crawlable pagination, all in the first HTML
// response (no JS or API call needed).
//
// Pagination follows /shop: /shop/<slug>?page=N, each page canonical to itself.
// The intro is shown on page 1 only — repeating the same paragraph on every
// page of a category would just be duplicate text.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductCard from '../../../components/ProductCard';
import Pagination from '../../../components/Pagination';
import { getCategoryPage, getPublicCategories } from '../../../lib/categories';
import { CATEGORY_COPY } from '../../../data/category-copy';
import { SHOP_PAGE_SIZE, toListingProduct } from '../../../data/products';

const SITE_URL = 'https://www.itemssyprints.com';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// ?page must be a plain positive integer. Anything else (0, -1, 2.5, abc, an
// empty or repeated param) is a 404 rather than a quiet duplicate of page 1,
// so the crawlable URL space stays exactly one URL per real page.
function parsePage(raw: string | string[] | undefined): number | null {
  if (raw === undefined) return 1;
  if (typeof raw !== 'string' || !/^[1-9]\d{0,5}$/.test(raw)) return null;
  return parseInt(raw, 10);
}

async function resolve(slug: string, rawPage: string | string[] | undefined) {
  const categories = await getPublicCategories();
  const page = parsePage(rawPage);
  const category = categories.find((c) => c.slug === slug);
  const copy = CATEGORY_COPY[slug];
  // Checked against the cached product count before any query runs, so junk
  // values like ?page=99999 are a cheap 404 and can't fan out into one
  // database query and cache entry each.
  if (!category || !copy || page === null || page > Math.ceil(category.productCount / SHOP_PAGE_SIZE)) notFound();
  return { categories, category, copy, page };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { category, copy, page } = await resolve(slug, (await searchParams).page);

  const paged = page > 1;
  const title = paged ? `${copy.title} – Page ${page}` : copy.title;
  // Deeper pages get their own short description rather than repeating page 1's.
  const description = paged ? `Page ${page} of our ${category.name} wall art prints. Instant download or printed and shipped.` : copy.description;
  const url = `${SITE_URL}/shop/${slug}${paged ? `?page=${page}` : ''}`;
  const socialTitle = `${title} | ItemssyPrints`;

  return {
    title,
    description,
    alternates: { canonical: url },
    // The root layout's openGraph/twitter would otherwise be inherited as-is
    // and every category would share the homepage's title and description.
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: 'ItemssyPrints',
      title: socialTitle,
      description,
      url,
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'ItemssyPrints Digital Wall Art' }],
    },
    twitter: { card: 'summary_large_image', title: socialTitle, description, images: ['/og-image.jpg'] },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { categories, category, copy, page } = await resolve(slug, (await searchParams).page);

  const { products, total } = await getCategoryPage(category.id, page);
  const totalPages = Math.ceil(total / SHOP_PAGE_SIZE);
  // Authoritative check against the live count (the pre-check above used the
  // cached one, which can lag by a few minutes).
  if (total === 0 || page > totalPages) notFound();

  const hrefFor = (n: number) => `/shop/${slug}${n > 1 ? `?page=${n}` : ''}`;
  const first = (page - 1) * SHOP_PAGE_SIZE + 1;
  const last = Math.min(page * SHOP_PAGE_SIZE, total);
  const others = categories.filter((c) => c.slug !== slug);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px clamp(20px, 4vw, 40px) 80px' }}>

      <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        <Link href="/">Home</Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <Link href="/shop">Shop</Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span aria-current="page" style={{ color: 'var(--text-secondary)' }}>{category.name}</span>
      </nav>

      <header style={{ maxWidth: 760, marginBottom: 40 }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 16 }}>
          {copy.title}
        </h1>
        {page === 1 ? (
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{copy.intro}</p>
        ) : (
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
            Page {page} of {totalPages}. <Link href={hrefFor(1)} style={{ color: 'var(--accent-soft)', textDecoration: 'underline' }}>Read the {category.name} overview</Link>
          </p>
        )}
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 14 }}>
          {total} print{total !== 1 ? 's' : ''}{totalPages > 1 ? ` · showing ${first}–${last}` : ''}
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
        {products.map((p) => <ProductCard key={p.id} product={toListingProduct(p)} />)}
      </div>

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
      {totalPages > 1 && (
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
          Page {page} of {totalPages} · {total} prints
        </div>
      )}

      {others.length > 0 && (
        <nav aria-label="More categories" style={{ marginTop: 72, paddingTop: 40, borderTop: '0.5px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 16 }}>More categories</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {others.map((c) => (
              <Link key={c.slug} href={`/shop/${c.slug}`} style={{
                background: 'var(--bg-pill)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)',
                borderRadius: 20, padding: '7px 18px', fontSize: 13,
              }}>{c.name}</Link>
            ))}
            <Link href="/shop" style={{
              background: 'white', color: 'var(--text-primary)', border: '0.5px solid var(--border)',
              borderRadius: 20, padding: '7px 18px', fontSize: 13,
            }}>All prints →</Link>
          </div>
        </nav>
      )}
    </div>
  );
}
