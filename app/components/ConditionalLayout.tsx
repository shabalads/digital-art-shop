// app/components/ConditionalLayout.tsx

'use client';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import PageWrapper from './PageWrapper';
import MessageWidget from './MessageWidget';

function ConditionalLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  if (isDashboard) {
    return <>{children}</>;
  }
  return (
    <>
      <Navbar />
      <main>
        <Suspense>
          <PageWrapper>{children}</PageWrapper>
        </Suspense>
      </main>
      <Footer />
      <MessageWidget />
    </>
  );
}

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <ConditionalLayoutInner>{children}</ConditionalLayoutInner>
    </Suspense>
  );
}