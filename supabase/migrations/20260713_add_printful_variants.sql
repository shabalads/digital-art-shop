-- Migration: add printful_variants to products
-- Purpose: store a mapping of our size label -> Printful sync_variant_id
--   e.g. {"8x10": "12345", "11x14": "12346", ...}
-- These are STORE-SPECIFIC sync_variant_ids (created per-product in Step 4),
-- not Printful's generic catalog variant_ids discovered in Step 1/2.
--
-- Safe to run multiple times: ADD COLUMN IF NOT EXISTS is idempotent.

alter table public.products
  add column if not exists printful_variants jsonb not null default '{}'::jsonb;

comment on column public.products.printful_variants is
  'Map of our size label (e.g. "8x10", "a4") to Printful sync_variant_id (string). Populated by scripts/printful-bulk-create.js. Empty object until that script runs for a given product.';

-- Optional but recommended: lets us quickly find products that still need
-- Printful sync products created (i.e. printful_variants = '{}').
create index if not exists idx_products_printful_variants_empty
  on public.products ((printful_variants = '{}'::jsonb))
  where printful_variants = '{}'::jsonb;
