// app/components/ProductReviews.tsx
//
// Self-contained reviews section for the product page. Fetches only
// reviews linked to this product (customer_reviews.product_id) as two
// groups — photo reviews and text-only reviews — and shows photos first
// (stronger trust signal), text after. Sub-headers only appear when a
// product has both types; if it only has one, that group just renders on
// its own, no redundant label. Renders nothing at all — not even the outer
// heading/border — if there are no reviews of either type, so products
// with no linked reviews show no empty section.

'use client';

import { useEffect, useState } from 'react';
import ReviewCard, { CustomerReviewRow } from './ReviewCard';

async function fetchReviews(productId: string, type: 'photo' | 'text', signal: AbortSignal): Promise<CustomerReviewRow[]> {
  const res = await fetch(`/api/reviews?product_id=${encodeURIComponent(productId)}&type=${type}`, { signal });
  const data = await res.json();
  return data.reviews || [];
}

export default function ProductReviews({ productId }: { productId: string }) {
  const [photos, setPhotos] = useState<CustomerReviewRow[]>([]);
  const [textReviews, setTextReviews] = useState<CustomerReviewRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoaded(false);
    async function load() {
      try {
        const [p, t] = await Promise.all([
          fetchReviews(productId, 'photo', controller.signal),
          fetchReviews(productId, 'text', controller.signal),
        ]);
        setPhotos(p);
        setTextReviews(t);
      } catch {
        if (!controller.signal.aborted) {
          setPhotos([]);
          setTextReviews([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoaded(true);
      }
    }
    load();
    return () => controller.abort();
  }, [productId]);

  const hasPhotos = photos.length > 0;
  const hasText = textReviews.length > 0;

  if (!loaded || (!hasPhotos && !hasText)) return null;

  return (
    <div style={{ borderTop: '0.5px solid var(--border)', padding: '56px clamp(20px, 4vw, 40px) 80px', background: 'white' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>
          Customer reviews
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 28 }}>
          What customers are saying
        </h2>

        {hasPhotos && (
          <div style={{ marginBottom: hasText ? 40 : 0 }}>
            {hasText && <SubLabel>Customer photos</SubLabel>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, alignItems: 'start' }}>
              {photos.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        )}

        {hasText && (
          <div>
            {hasPhotos && <SubLabel>More reviews</SubLabel>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, alignItems: 'start' }}>
              {textReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14 }}>
      {children}
    </div>
  );
}
