// app/components/PageWrapper.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Starts visible so the server-rendered HTML is actually shown on first
  // paint. It used to start at opacity 0 and only fade in after React
  // hydrated, so every page was blank until its JS bundle ran (slow LCP).
  // The fade now only plays on client-side navigations.
  const [visible, setVisible] = useState(true);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(6px)',
      transition: 'opacity 0.25s ease, transform 0.25s ease'
    }}>
      {children}
    </div>
  );
}
