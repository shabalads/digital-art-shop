// app/layout.tsx

import type { Metadata } from 'next';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import ConditionalLayout from './components/ConditionalLayout';
import ScrollToTop from './components/ScrollToTop';

export const metadata: Metadata = {
  title: {
    default: 'ItemssyPrints — Digital Wall Art Prints',
    template: '%s | ItemssyPrints'
  },
  description: 'Browse 600+ digital wall art prints. Instant download or printed and shipped. Abstract, botanical, typography and more.',
  keywords: ['digital wall art', 'printable wall art', 'instant download prints', 'wall art prints', 'botanical prints', 'abstract art prints'],
  authors: [{ name: 'ItemssyPrints' }],
  creator: 'ItemssyPrints',
  metadataBase: new URL('https://itemssycrafts.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://itemssycrafts.com',
    siteName: 'ItemssyPrints',
    title: 'ItemssyPrints — Digital Wall Art Prints',
    description: 'Browse 600+ digital wall art prints. Instant download or printed and shipped.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'ItemssyPrints Digital Wall Art' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ItemssyPrints — Digital Wall Art Prints',
    description: 'Browse 600+ digital wall art prints. Instant download or printed and shipped.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' }
  }
};

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