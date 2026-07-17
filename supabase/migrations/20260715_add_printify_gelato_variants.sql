-- Migration: add printify_variants and gelato_variants to products
-- Purpose: store per-provider size -> variant/product ID maps, same shape as
--   the existing printful_variants column, for the new dual-provider physical
--   fulfillment routing:
--     - printify_variants: {"8x12": "75289", "11x14": "100934", ...}
--       STORE-SPECIFIC Printify variant_ids (created per-product in Step 4),
--       not the generic catalog variant_ids discovered in Step 1/2.
--     - gelato_variants: {"5x7": "flat_5r-130x180-mm_250-gsm-100lb-uncoated-offwhite-archival_4-0_ver", ...}
--       Gelato productUids (Gelato has no separate "create sync product" step —
--       these are the same real productUids discovered in Step 1/2, used
--       directly at order time).
--
-- printful_variants is left in place, unused, as reference/fallback per the
-- task's explicit instruction not to touch the existing Printful integration.
--
-- Safe to run multiple times: ADD COLUMN IF NOT EXISTS is idempotent.

alter table public.products
  add column if not exists printify_variants jsonb not null default '{}'::jsonb;

alter table public.products
  add column if not exists gelato_variants jsonb not null default '{}'::jsonb;

comment on column public.products.printify_variants is
  'Map of our size label (e.g. "8x12", "11x14") to Printify store-specific variant_id (string). Only covers the 5 sizes Printify''s "Fine Art Posters" / Print Clever blueprint actually offers (8x12, 11x14, 16x20, 18x24, 24x36). Populated by scripts/printify-bulk-create.js. Empty object until that script runs for a given product.';

comment on column public.products.gelato_variants is
  'Map of our size label (e.g. "5x7", "a4") to Gelato productUid (string), using the _ver (portrait) variant of the 250gsm archival matte UnifiedPaperType. Covers all 10 site sizes. Populated by scripts/gelato-bulk-create.js. Empty object until that script runs for a given product.';

-- Optional but recommended: lets us quickly find products that still need
-- Printify or Gelato sync products/mappings created.
create index if not exists idx_products_printify_variants_empty
  on public.products ((printify_variants = '{}'::jsonb))
  where printify_variants = '{}'::jsonb;

create index if not exists idx_products_gelato_variants_empty
  on public.products ((gelato_variants = '{}'::jsonb))
  where gelato_variants = '{}'::jsonb;
