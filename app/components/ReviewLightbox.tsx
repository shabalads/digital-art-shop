// app/components/ReviewLightbox.tsx
//
// Full-size review photo viewer — same idea as Etsy's "click a review photo
// to see it big, with the review next to it" experience. Photo on the
// left, review details on the right (reviewer, stars, quote, product,
// date); stacks to photo-on-top on mobile. Follows the same
// portal/backdrop/Escape-to-close pattern as ImageZoom.tsx so it behaves
// consistently with the product page's image zoom.
//
// Deliberately takes the already-resolved `firstName` / `displayProductName`
// as props instead of recomputing them from `review` — ReviewCard already
// does that work (Verified Buyer fallback, cleanProductTitle, the
// product_title-over-product_name fix) and this should never drift from
// what the card itself is showing.

'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useIsMobile } from './useIsMobile';
import { CustomerReviewRow } from './ReviewCard';

export default function ReviewLightbox({
  review,
  firstName,
  displayProductName,
  onClose,
}: {
  review: CustomerReviewRow;
  firstName: string;
  displayProductName: string | null;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!review.image_path) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(30,24,16,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? 16 : 32, overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          background: 'var(--bg-card)',
          borderRadius: 16,
          overflow: 'hidden',
          maxWidth: isMobile ? '100%' : 920,
          width: '100%',
          maxHeight: isMobile ? 'none' : '86vh',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 1,
            width: 32, height: 32, borderRadius: '50%',
            background: 'white', border: 'none', cursor: 'pointer',
            fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1E1810', boxShadow: '0 2px 12px rgba(0,0,0,0.25)', lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Photo */}
        <div
          style={{
            flex: isMobile ? 'none' : '1.3 1 0',
            background: 'var(--bg-pill)',
            aspectRatio: isMobile ? '4/5' : undefined,
            maxHeight: isMobile ? undefined : '86vh',
            overflow: 'hidden',
          }}
        >
          <img
            src={review.image_path}
            alt={displayProductName ? `${displayProductName} — photo from ${firstName}` : `Photo from ${firstName}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* Details */}
        <div
          style={{
            flex: '1 1 0',
            padding: isMobile ? '20px 20px 24px' : '32px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{firstName}</div>

          {review.rating != null && (
            <div style={{ fontSize: 17, color: '#C9971E', letterSpacing: '1.5px' }}>
              {'★'.repeat(review.rating)}
              {review.rating < 5 && <span style={{ color: 'var(--border-card)' }}>{'★'.repeat(5 - review.rating)}</span>}
            </div>
          )}

          {review.quote && (
            <p style={{ fontSize: 14.5, color: 'var(--text-primary)', lineHeight: 1.7, margin: '4px 0 0' }}>
              &ldquo;{review.quote}&rdquo;
            </p>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '0.5px solid var(--border-card)' }}>
            {displayProductName && (
              review.product_id ? (
                <Link
                  href={`/product/${review.product_id}`}
                  style={{ fontSize: 13.5, color: 'var(--accent-soft)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}
                >
                  {displayProductName}
                </Link>
              ) : (
                <span style={{ fontSize: 13.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {displayProductName}
                </span>
              )
            )}
            {review.review_date && (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>{review.review_date}</div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
