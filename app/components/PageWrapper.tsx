// app/components/PageWrapper.tsx

'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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