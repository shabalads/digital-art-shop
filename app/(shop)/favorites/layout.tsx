// app/(shop)/favorites/layout.tsx
//
// Utility page — no search value, and it shows the same generic title and
// description as the homepage, so keep it out of Google's index.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Favorites',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
