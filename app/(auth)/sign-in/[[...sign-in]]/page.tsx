// app/(auth)/sign-in/[[...sign-in]]/page.tsx

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <div style={{ minHeight: '85vh', background: '#FAF8F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <Link href="/" style={{ marginBottom: 32, textDecoration: 'none' }}>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.6px', color: '#1E1810', fontFamily: 'Georgia, serif' }}>
          Itemssy<span style={{ color: '#8B6F4E', fontWeight: 400, fontStyle: 'italic' }}>Prints</span>
        </span>
      </Link>
      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#2C2420',
            colorBackground: '#FFFFFF',
            borderRadius: '10px',
            fontFamily: 'system-ui, sans-serif',
          },
          elements: {
            card: { boxShadow: 'none', border: '0.5px solid #EAE4DC' },
            headerTitle: { color: '#1E1810', fontWeight: 700 },
            formButtonPrimary: { background: '#2C2420', fontSize: '14px' },
          }
        }}
      />
      <p style={{ marginTop: 24, fontSize: 13, color: '#8B7355' }}>
        <Link href="/" style={{ color: '#8B7355' }}>← Back to shop</Link>
      </p>
    </div>
  );
}