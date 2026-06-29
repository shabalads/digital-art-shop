// app/(info)/refunds/page.tsx

import Link from 'next/link';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'ItemssyCrafts refund policy for digital downloads and physical prints.',
};

export default function RefundsPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px clamp(20px, 4vw, 40px) 100px' }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 12, fontWeight: 500 }}>Legal</div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 12 }}>Refund policy</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Last updated June 2026</p>
      </div>

      {[
        { title: 'Digital downloads', body: 'Due to the nature of digital products, we do not offer refunds on digital downloads once the files have been delivered. Please review product previews carefully before purchasing. If you experience a technical issue with your files, contact us and we will resolve it immediately.' },
        { title: 'Physical prints', body: 'If your physical print arrives damaged, defective, or incorrect, we will replace it or issue a full refund at no cost to you. Please contact us within 14 days of delivery with a photo of the issue. We do not accept returns for change of mind once production has started.' },
        { title: 'Order errors', body: 'If you made an error on your order, please contact us within 1 hour of placing the order. We can make changes or cancel before production begins.' },
        { title: 'How to request a refund', body: 'Email us at itemssycrafts@gmail.com with your order number, a description of the issue, and any relevant photos. We aim to respond within 24 hours.' },
        { title: 'Processing time', body: 'Approved refunds are processed within 5–10 business days. Stripe refunds typically appear within 5–7 business days.' },
      ].map(s => (
        <div key={s.title} style={{ marginBottom: 40, paddingBottom: 40, borderBottom: '0.5px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{s.title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{s.body}</p>
        </div>
      ))}

      <div style={{ background: '#F2EDE6', borderRadius: 14, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Have an issue with your order?</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>We'll make it right, always.</div>
        </div>
        <Link href="/contact" style={{ background: 'var(--accent)', color: 'white', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>Contact us</Link>
      </div>
    </div>
  );
}