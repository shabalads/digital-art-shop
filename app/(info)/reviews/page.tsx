// app/(info)/reviews/page.tsx

import type { Metadata } from 'next';
import CustomerReviewsGallery from '../../components/CustomerReviewsGallery';

export const metadata: Metadata = {
  title: 'Customer Reviews',
  description: 'Real customer photos and reviews of ItemssyPrints digital wall art and physical prints.',
};

export default function ReviewsPage() {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px clamp(20px, 4vw, 40px) 100px' }}>
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-soft)', marginBottom: 12, fontWeight: 500 }}>What customers say</div>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 12 }}>Customer reviews</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Real photos from real orders — not stock mockups.</p>
      </div>

      <CustomerReviewsGallery sectioned />
    </div>
  );
}
