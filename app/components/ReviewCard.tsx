// app/components/ReviewCard.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cleanProductTitle } from '../lib/text';
import ReviewLightbox from './ReviewLightbox';

export type CustomerReviewRow = {
  id: number;
  source_image: string | null;
  image_path: string | null;
  order_id: string | null;
  reviewer_name: string;
  product_name: string | null;
  quote: string | null;
  rating: number | null;
  review_date: string | null;
  product_id?: string | null;
  // Current live products.title for review.product_id, joined server-side
  // in /api/reviews — see the comment there for why this can't be a
  // PostgREST embed. null when product_id is unset OR the linked product
  // no longer exists.
  product_title?: string | null;
};

function displayFirstName(reviewerName: string): string {
  const cleaned = reviewerName.replace(/[()]/g, '').trim();
  if (!cleaned || cleaned.toLowerCase() === 'anonymous') return 'Verified Buyer';
  return cleaned.split(/\s+/)[0];
}

export default function ReviewCard({ review }: { review: CustomerReviewRow }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const firstName = displayFirstName(review.reviewer_name);
  const hasImage = Boolean(review.image_path);
  // Once a review is confidently linked to one specific product
  // (product_id set), always show THAT product's current live title —
  // never the raw historical product_name, which for multi-item orders can
  // be several items' titles concatenated with " / " (that's the exact bug
  // this fixes: cards showing "Sardine Painting / Vibrant Mountains
  // Landscape Wall Art / Colorful"). Only fall back to product_name when
  // there's no product_id (unmatched review) or the linked product has
  // since been deleted (product_title came back null).
  const rawProductName = review.product_id && review.product_title ? review.product_title : review.product_name;
  // cleanProductTitle is the same shortener ProductCard/HomeContent use for
  // the live product grid, so a review's title reads the same short, clean
  // way everywhere.
  const displayProductName = rawProductName ? cleanProductTitle(rawProductName) : null;
  // Only emit Review structured data when we have a real rating + quote +
  // product name to attach it to — never fabricate any of those.
  const hasQuote = Boolean(review.quote && review.rating && rawProductName);

  return (
    <div style={{
      background: 'var(--bg-card)', border: '0.5px solid var(--border-card)',
      borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column'
    }}>
      {hasQuote && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Review',
              reviewRating: { '@type': 'Rating', ratingValue: String(review.rating) },
              author: { '@type': 'Person', name: firstName },
              reviewBody: review.quote,
              itemReviewed: { '@type': 'Product', name: displayProductName ?? rawProductName },
            }),
          }}
        />
      )}

      {/* Text-only reviews (no photo submitted) skip this block entirely —
          same card style otherwise, just no image area. */}
      {hasImage && (
        <div
          onClick={() => setLightboxOpen(true)}
          style={{ aspectRatio: '4/5', background: 'var(--bg-pill)', overflow: 'hidden', cursor: 'pointer' }}
        >
          <img
            src={review.image_path!}
            alt={displayProductName ? `${displayProductName} — photo from ${firstName}` : `Photo from ${firstName}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        </div>
      )}

      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{firstName}</div>
          {review.rating != null && (
            <div style={{ fontSize: 15, color: '#C9971E', letterSpacing: '1px', flexShrink: 0 }}>
              {'★'.repeat(review.rating)}
              {review.rating < 5 && <span style={{ color: 'var(--border-card)' }}>{'★'.repeat(5 - review.rating)}</span>}
            </div>
          )}
        </div>

        {review.quote && (
          <p style={{
            fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            "{review.quote}"
          </p>
        )}

        {(displayProductName || review.review_date) && (
          <div style={{ fontSize: 12.5, marginTop: 'auto', paddingTop: 10, borderTop: '0.5px solid var(--border-card)' }}>
            {displayProductName && (
              review.product_id ? (
                <Link href={`/product/${review.product_id}`} style={{
                  color: 'var(--accent-soft)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {displayProductName}
                </Link>
              ) : (
                <span style={{
                  color: 'var(--text-secondary)', fontWeight: 600,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {displayProductName}
                </span>
              )
            )}
            {review.review_date && (
              <span style={{ color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>{review.review_date}</span>
            )}
          </div>
        )}
      </div>

      {lightboxOpen && hasImage && (
        <ReviewLightbox
          review={review}
          firstName={firstName}
          displayProductName={displayProductName}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
