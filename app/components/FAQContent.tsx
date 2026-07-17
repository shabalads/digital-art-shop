// app/components/FAQContent.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';

const faqs = [
  { q: 'What is a digital download?', a: 'A digital download is a printable file you receive instantly after purchase. No physical item is shipped — you download the files and print them yourself at home or at a local print shop.' },
  { q: 'What file formats and sizes are included?', a: 'Every purchase includes high-resolution JPG and PDF files in 5 sizes: A3 (297×420mm), A4 (210×297mm), A5 (148×210mm), 8×10" (20×25cm), and 5×7" (13×18cm).' },
  { q: 'How do I receive my files after purchase?', a: 'You will receive an email with a download link immediately after your payment is confirmed. Files are also available in your order confirmation page.' },
  { q: 'Can I print the files myself at home?', a: 'Yes. Any home inkjet or laser printer works. For best results we recommend printing on matte photo paper or cardstock at the highest quality setting your printer allows.' },
  { q: 'What if I want a physical print instead?', a: 'We offer printed and shipped versions of every design. Select "Printed & shipped" on any product page. Prints are on premium 200gsm matte paper and ship within 3–5 business days.' },
  { q: 'Which countries do you ship physical prints to?', a: 'We ship worldwide including US, UK, EU, Canada, Australia and most other countries. Shipping cost is calculated at checkout based on your location.' },
  { q: 'Can I use the prints commercially?', a: 'All prints are licensed for personal use only. Commercial use, reselling, or redistribution is not permitted.' },
  { q: 'What size frame should I use?', a: 'Our files fit standard frame sizes. A4 fits a standard A4 frame, 8×10" fits a standard 8×10" frame. We recommend IKEA RIBBA frames as affordable options that work perfectly.' },
  { q: 'I did not receive my download email. What should I do?', a: 'Check your spam or junk folder first. If it is not there, contact us at itemssy@email.cz with your order number and we will resend the files immediately.' },
];

export default function FAQContent() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '64px clamp(20px, 4vw, 40px) 100px' }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 12, fontWeight: 500 }}>Support</div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 12 }}>Frequently asked questions</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>Everything you need to know about our prints.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {faqs.map((faq, i) => (
          <div key={i} style={{ borderTop: '0.5px solid var(--border)' }}>
            <button onClick={() => setOpen(open === i ? null : i)} style={{
              width: '100%', textAlign: 'left', background: 'none', border: 'none',
              padding: '20px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16
            }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{faq.q}</span>
              <span style={{ fontSize: 20, color: 'var(--text-muted)', flexShrink: 0, transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>+</span>
            </button>
            {open === i && (
              <div style={{ paddingBottom: 20, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{faq.a}</div>
            )}
          </div>
        ))}
        <div style={{ borderTop: '0.5px solid var(--border)' }} />
      </div>

      <div style={{ marginTop: 56, background: 'white', border: '0.5px solid var(--border)', borderRadius: 14, padding: '28px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Still have questions?</div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>We're happy to help with anything not covered above.</p>
        <Link href="/contact" style={{ display: 'inline-block', background: 'var(--accent)', color: 'white', borderRadius: 24, padding: '10px 24px', fontSize: 14, fontWeight: 500 }}>Contact us →</Link>
      </div>
    </div>
  );
}