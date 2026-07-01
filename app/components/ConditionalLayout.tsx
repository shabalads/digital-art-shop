// app/components/ConditionalLayout.tsx

'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import PageWrapper from './PageWrapper';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  if (isDashboard) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main><PageWrapper>{children}</PageWrapper></main>
      <Footer />
    </>
  );
}