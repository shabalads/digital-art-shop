-- Migration: support text-only (no photo) customer reviews in the same
-- customer_reviews table used for the original 100 photo reviews.
--
-- Context: importing ~1,217 additional reviews from the full Etsy review
-- export (reviews.json + EtsySoldOrderItems2023/2024/2025.csv), joined to
-- each review's order to recover the historical Etsy listing title, then
-- fuzzy-matched against live products the same way the original 100 were
-- (see app/lib/reviewMatch.ts, scripts/import-text-reviews.ts). These
-- reviews have no photo, so image_path / source_image must become
-- nullable. image_path IS NULL is the sole discriminator between a photo
-- review and a text-only review — no separate "type" column, so display
-- code (ReviewCard.tsx) stays a single unified code path.
--
-- product_name also becomes nullable: 26 of the imported reviews' orders
-- weren't found in the 2023-2025 CSV exports (order predates the export
-- range, or a data gap) so there's no historical title to show or match
-- against at all — those go straight to the manual-match queue with no
-- fuzzy candidates, search-only.
--
-- review_date_parsed is a new real `date` column, populated only for this
-- new batch (Etsy's review export gives a reliable MM/DD/YYYY date for
-- every row, unlike the original 100 photo reviews where dates were
-- inconsistently captured/unknown for ids 1-51, and free-text strings like
-- "Apr 23, 2025" for ids 52-100). Used to sort the combined reviews feed
-- newest-first without touching any of the existing 100 rows' data.
--
-- Safe to re-run (drop not null / add column if not exists are idempotent).

alter table customer_reviews alter column image_path drop not null;
alter table customer_reviews alter column source_image drop not null;
alter table customer_reviews alter column product_name drop not null;
alter table customer_reviews add column if not exists review_date_parsed date;

create index if not exists idx_customer_reviews_review_date_parsed
  on customer_reviews(review_date_parsed desc);

comment on column customer_reviews.image_path is
  'Public path to the review photo. NULL for text-only reviews (no photo was submitted) — ReviewCard.tsx renders those without the image block.';
comment on column customer_reviews.product_name is
  'Historical Etsy listing title captured at time of sale/review. NULL when the review''s order couldn''t be found in the Etsy order-item export (no historical title available) — those reviews have no fuzzy-match candidates and rely on manual search in /admin/match-reviews.';
comment on column customer_reviews.review_date_parsed is
  'Real date, populated for the ~1,217-review text-only import batch (scripts/import-text-reviews.ts) where Etsy''s export gives a reliable date for every row. NULL for the original 100 photo reviews — used to sort the combined feed newest-first, falling back to display_order/id for rows where it is null.';
