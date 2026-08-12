-- Migration: customer_reviews table
-- Purpose: real customer photo reviews (100 rows), sourced from Etsy order/review
-- history, seeded via scripts/seed-reviews.ts from app/data/customer-reviews.ts.
-- Rows 1-51 only have image/reviewer/product (no quote/rating/date was captured
-- for those in the original source) — quote/rating/review_date are nullable by
-- design, not a data-quality bug. Only rows with a non-null rating+quote should
-- ever get Review JSON-LD structured data emitted (see ReviewCard.tsx).
--
-- Safe to run multiple times: CREATE TABLE IF NOT EXISTS is idempotent.

create table if not exists customer_reviews (
  id              integer primary key,
  source_image    text not null,       -- original filename before rename pass, e.g. "1.jpg"
  image_path      text not null,       -- final public path after slugify/rename, e.g. /images/reviews/vintage-halloween-cat-jeanmarie.jpg
  order_id        text,                -- Etsy order id, or a slug if no order id was visible
  reviewer_name    text not null,
  product_name    text not null,
  quote           text,                -- null = no quote captured (true for all of ids 1-51)
  rating          integer,             -- null = unknown (true for all of ids 1-51)
  review_date     text,                -- as captured, e.g. "Apr 23, 2025"; null = unknown
  display_order   integer default 0,   -- manual curation ordering, independent of id
  is_featured     boolean default false,
  created_at      timestamptz not null default now()
);

create index if not exists idx_customer_reviews_display_order on customer_reviews(display_order);

comment on table customer_reviews is
  'Real customer photo reviews seeded from app/data/customer-reviews.ts via scripts/seed-reviews.ts. Rendered by app/components/CustomerReviewsGallery.tsx.';
