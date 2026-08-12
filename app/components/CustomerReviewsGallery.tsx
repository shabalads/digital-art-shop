// app/components/CustomerReviewsGallery.tsx
//
// Photo reviews are shown before text-only reviews everywhere this renders
// — they're the stronger trust signal (real photo evidence) — rather than
// a fully interleaved chronological mix. Two modes:
//   - sectioned=false (default; homepage strip): a single flat grid, own
//     `limit` budget, photos filling it first and text-only reviews only
//     filling any remaining slots. No headers — it's a compact teaser.
//   - sectioned=true (the standalone /reviews page): two independently-
//     budgeted, clearly headed sections ("Customer Photos" then "More
//     Reviews"), each hidden entirely if that group is empty.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReviewCard, { CustomerReviewRow } from './ReviewCard';

const DEFAULT_STRIP_LIMIT = 8;
const DEFAULT_SECTION_LIMIT = 100;

// Same real, site-wide stat used on the homepage stats bar and reviews
// teaser (see HomeContent.tsx) — 4.8 average across 527 verified Etsy
// reviews. Repeated here rather than computed from whatever subset of rows
// happens to be loaded, so the number is consistent everywhere it appears.
const OVERALL_RATING = 4.8;
const OVERALL_REVIEW_COUNT = 527;

async function fetchReviews(type: 'photo' | 'text', limit: number, signal: AbortSignal): Promise<CustomerReviewRow[]> {
  const res = await fetch(`/api/reviews?type=${type}&limit=${limit}`, { signal });
  const data = await res.json();
  return data.reviews || [];
}

// The text-only feed is sorted newest-first, and non-5-star reviews are
// real but rare (~4% of the imported set) — so on a plain date sort they
// can land many rows down instead of anywhere near the top. A wall of
// nothing-but-5-stars reads as curated/fake even though it isn't, so this
// pulls the first one or two genuine non-5-star reviews it finds up into
// the front of the list, without touching the underlying data or the
// aggregate rating shown next to the heading.
function withRatingVarietyUpfront(reviews: CustomerReviewRow[]): CustomerReviewRow[] {
  const promoteCount = 2;
  const alreadyUpfront = reviews.slice(0, 6).filter(r => r.rating != null && r.rating < 5).length;
  if (alreadyUpfront >= 1 || reviews.length <= 6) return reviews;

  const rest = reviews.slice(6);
  const pulled: CustomerReviewRow[] = [];
  const remaining: CustomerReviewRow[] = [];
  for (const r of rest) {
    if (pulled.length < promoteCount && r.rating != null && r.rating < 5) {
      pulled.push(r);
    } else {
      remaining.push(r);
    }
  }
  if (pulled.length === 0) return reviews;

  const front = reviews.slice(0, 6);
  // Slot the promoted review(s) in as the 3rd/4th card rather than the
  // very first — still well within the first row, but reads as a natural
  // mix rather than "the bad one leads."
  const merged = [...front];
  merged.splice(2, 0, ...pulled);
  return [...merged, ...remaining];
}

export default function CustomerReviewsGallery({
  limit,
  showViewAllLink = false,
  sectioned = false,
}: {
  limit?: number;
  showViewAllLink?: boolean;
  sectioned?: boolean;
}) {
  const [photos, setPhotos] = useState<CustomerReviewRow[]>([]);
  const [textReviews, setTextReviews] = useState<CustomerReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        if (sectioned) {
          const sectionLimit = limit ?? DEFAULT_SECTION_LIMIT;
          const [p, t] = await Promise.all([
            fetchReviews('photo', sectionLimit, controller.signal),
            fetchReviews('text', sectionLimit, controller.signal),
          ]);
          setPhotos(p);
          setTextReviews(withRatingVarietyUpfront(t));
        } else {
          const stripLimit = limit ?? DEFAULT_STRIP_LIMIT;
          const p = await fetchReviews('photo', stripLimit, controller.signal);
          const remaining = Math.max(0, stripLimit - p.length);
          const t = remaining > 0 ? await fetchReviews('text', remaining, controller.signal) : [];
          setPhotos(p);
          setTextReviews(t);
        }
      } catch {
        if (!controller.signal.aborted) {
          setPhotos([]);
          setTextReviews([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [limit, sectioned]);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
        {Array.from({ length: limit || DEFAULT_STRIP_LIMIT }).map((_, i) => (
          <div key={i} style={{ aspectRatio: '4/6', background: 'var(--bg-pill)', borderRadius: 12 }} />
        ))}
      </div>
    );
  }

  if (photos.length === 0 && textReviews.length === 0) return null;

  return (
    <div>
      {sectioned ? (
        <>
          {photos.length > 0 && (
            <div style={{ marginBottom: textReviews.length > 0 ? 48 : 0 }}>
              <SectionHeading eyebrow="Real photos from real orders" title="Customer photos" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, alignItems: 'start' }}>
                {photos.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </div>
          )}
          {textReviews.length > 0 && (
            <div>
              <SectionHeading eyebrow="From verified orders" title="More reviews" showRating />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, alignItems: 'start' }}>
                {textReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, alignItems: 'start' }}>
          {[...photos, ...textReviews].map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {showViewAllLink && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link href="/reviews" style={{
            display: 'inline-block', background: 'var(--accent)', color: 'white',
            borderRadius: 24, padding: '12px 28px', fontSize: 14, fontWeight: 500,
            textDecoration: 'none'
          }}>
            View all reviews →
          </Link>
        </div>
      )}
    </div>
  );
}

function SectionHeading({ eyebrow, title, showRating = false }: { eyebrow: string; title: string; showRating?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      flexWrap: 'wrap', gap: 12, marginBottom: 20
    }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
          {eyebrow}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.5px' }}>{title}</h2>
      </div>

      {showRating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#C9971E', fontSize: 18, letterSpacing: '2px' }}>★★★★★</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{OVERALL_RATING}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>out of 5 · {OVERALL_REVIEW_COUNT} reviews</span>
        </div>
      )}
    </div>
  );
}
