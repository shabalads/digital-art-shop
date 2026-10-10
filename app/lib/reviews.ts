// app/lib/reviews.ts
//
// Builds the Product JSON-LD review fields from a product's REAL linked
// customer_reviews rows — nothing is invented. A product with no rated
// reviews gets no aggregateRating/review fields at all (Google treats those
// as optional), rather than a made-up rating.
//
// The reviews listed here are the same rows ProductReviews renders on the
// page, with the same first-name display rule, so the markup always matches
// what a visitor can actually see (a Google requirement for review markup).

import { displayFirstName } from './text';
import type { CustomerReviewRow } from '../components/ReviewCard';

// Google doesn't need every review; keep the HTML payload small.
const MAX_REVIEWS_IN_MARKUP = 10;

export function reviewJsonLd(reviews: CustomerReviewRow[]) {
  // Rows with no rating (e.g. the original photo-only reviews, ids 1-51)
  // can't contribute to a rating — they're shown on the page but not counted.
  const rated = reviews.filter((r) => Number.isInteger(r.rating) && (r.rating as number) >= 1 && (r.rating as number) <= 5);
  if (rated.length === 0) return {};

  const average = rated.reduce((sum, r) => sum + (r.rating as number), 0) / rated.length;

  return {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: Number(average.toFixed(1)),
      reviewCount: rated.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: rated.slice(0, MAX_REVIEWS_IN_MARKUP).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: displayFirstName(r.reviewer_name) },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating as number, bestRating: 5, worstRating: 1 },
      ...(r.quote ? { reviewBody: r.quote } : {}),
      ...(r.review_date_parsed ? { datePublished: r.review_date_parsed } : {}),
    })),
  };
}
