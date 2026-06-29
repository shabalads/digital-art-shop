// app/page.tsx

import type { Metadata } from 'next';
import HomeContent from './components/HomeContent';

export const metadata: Metadata = {
  title: 'Digital Wall Art Prints — Instant Download',
  description: 'Shop 600+ digital wall art prints. Instant download or get it printed and shipped. Abstract, botanical, typography, vintage and more.',
};

export default function Home() {
  return <HomeContent />;
}