// app/(legal)/privacy/page.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'ItemssyCrafts privacy policy — how we collect and use your data.',
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px clamp(20px, 4vw, 40px) 100px' }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 12, fontWeight: 500 }}>Legal</div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 12 }}>Privacy policy</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Last updated June 2026</p>
      </div>

      {[
        { title: 'Information we collect', body: 'When you make a purchase, we collect your name, email address, and payment information (processed securely by Stripe — we never store your card details). For physical orders, we also collect your shipping address which is passed to Printful for fulfillment.' },
        { title: 'How we use your information', body: 'We use your email to send order confirmations and digital download links. We use your shipping address solely to fulfill physical print orders. We do not sell, rent, or share your personal information with third parties for marketing purposes.' },
        { title: 'Third-party services', body: 'We use Stripe for payment processing, Printful for print fulfillment, and Supabase for order data storage. Each of these services has their own privacy policy governing your data. Links: stripe.com/privacy, printful.com/policies/privacy, supabase.com/privacy.' },
        { title: 'Cookies', body: 'We use minimal cookies — only what is necessary for the shop to function (cart session, authentication). We do not use tracking cookies or advertising cookies.' },
        { title: 'Data retention', body: 'Order data is retained for 3 years for accounting purposes. You may request deletion of your personal data at any time by contacting us at itemssycrafts@gmail.com.' },
        { title: 'Your rights', body: 'You have the right to access, correct, or delete your personal data. You may also request a copy of all data we hold about you. Contact us at itemssycrafts@gmail.com to exercise these rights.' },
        { title: 'Contact', body: 'For any privacy-related questions, email us at itemssycrafts@gmail.com. We aim to respond within 72 hours.' },
      ].map(s => (
        <div key={s.title} style={{ marginBottom: 36, paddingBottom: 36, borderBottom: '0.5px solid var(--border)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>{s.title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{s.body}</p>
        </div>
      ))}
    </div>
  );
}