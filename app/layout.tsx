// app/layout.tsx

import type { Metadata } from 'next';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import ConditionalLayout from './components/ConditionalLayout';
import ScrollToTop from './components/ScrollToTop';
import { getActiveProductCountOrNull } from './lib/catalog';
import { countPhrase } from './lib/text';

// Async so the descriptions can quote the live number of prints instead of a
// hardcoded "600+". The count is cached for an hour (see lib/catalog.ts) and
// falls back to wording without a number if it can't be loaded.
export async function generateMetadata(): Promise<Metadata> {
  const prints = countPhrase(await getActiveProductCountOrNull(), 'digital wall art prints');
  return {
    title: {
      default: 'ItemssyPrints — Digital Wall Art Prints',
      template: '%s | ItemssyPrints'
    },
    description: `Browse ${prints}. Instant download or printed and shipped. Abstract, botanical, typography and more.`,
    keywords: ['digital wall art', 'printable wall art', 'instant download prints', 'wall art prints', 'botanical prints', 'abstract art prints'],
    authors: [{ name: 'ItemssyPrints' }],
    creator: 'ItemssyPrints',
    metadataBase: new URL('https://www.itemssyprints.com'),
    openGraph: {
      type: 'website',
      locale: 'en_US',
      // No `url` here: every page without its own openGraph inherits this object,
      // so a hard-coded homepage URL made /about, /faq, /shop, /bestsellers ...
      // all claim to be the homepage (og:url contradicting their canonical).
      siteName: 'ItemssyPrints',
      title: 'ItemssyPrints — Digital Wall Art Prints',
      description: `Browse ${prints}. Instant download or printed and shipped.`,
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'ItemssyPrints Digital Wall Art' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'ItemssyPrints — Digital Wall Art Prints',
      description: `Browse ${prints}. Instant download or printed and shipped.`,
      images: ['/og-image.jpg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' }
    }
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ConditionalLayout>{children}</ConditionalLayout>
          <ScrollToTop />
        </body>
      </html>
    </ClerkProvider>
  );
}