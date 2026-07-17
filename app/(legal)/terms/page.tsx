// app/(legal)/terms/page.tsx

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'ItemssyPrints terms of use for digital downloads and physical prints.',
};

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px clamp(20px, 4vw, 40px) 100px' }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 12, fontWeight: 500 }}>Legal</div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 12 }}>Terms of use</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Last updated June 2026</p>
      </div>

      {[
        { title: 'Acceptance of terms', body: 'By using ItemssyPrints and purchasing our products, you agree to these terms. If you do not agree, please do not use the site.' },
        { title: 'Products and licensing', body: 'All digital downloads are licensed for personal, non-commercial use only. You may print files for your own home or as a personal gift. You may not resell, redistribute, sublicense, or use the designs commercially without written permission.' },
        { title: 'Digital downloads', body: 'Upon successful payment, you receive a non-exclusive, non-transferable license to download and print the purchased files for personal use. Files are delivered digitally — no physical item is shipped for digital orders.' },
        { title: 'Physical prints', body: 'Physical print orders are fulfilled by our print-on-demand partners. Production begins shortly after payment. Once in production, orders cannot be cancelled or modified. Damaged or incorrect items will be replaced at no cost.' },
        { title: 'Payment', body: 'All payments are processed securely by Stripe. Prices are in USD. We reserve the right to change prices at any time. Your purchase price is fixed at the time of order.' },
        { title: 'Intellectual property', body: 'All designs, images, and content on ItemssyPrints are the intellectual property of ItemssyPrints. Unauthorized reproduction, distribution, or modification of any content is strictly prohibited.' },
        { title: 'Limitation of liability', body: 'ItemssyPrints is not liable for any indirect, incidental, or consequential damages arising from the use of our products. Our maximum liability is limited to the amount paid for the relevant order.' },
        { title: 'Changes to terms', body: 'We reserve the right to update these terms at any time. Continued use of the site after changes constitutes acceptance of the updated terms.' },
        { title: 'Contact', body: 'For any questions about these terms, contact us at itemssy@email.cz.' },
      ].map(s => (
        <div key={s.title} style={{ marginBottom: 36, paddingBottom: 36, borderBottom: '0.5px solid var(--border)' }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>{s.title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{s.body}</p>
        </div>
      ))}
    </div>
  );
}