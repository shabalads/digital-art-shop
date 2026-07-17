-- Migration: add fulfillment_provider + printify_order_id + gelato_order_id to orders
-- Purpose: track which provider(s) actually fulfilled a physical order, and
--   that provider's own order id, now that orders can route to either
--   Printify or Gelato (see app/api/webhook/route.ts routing logic).
--
-- fulfillment_provider values: 'printify' | 'gelato' | 'printify+gelato'
--   ('printify+gelato' covers the rare mixed-cart case where one order has
--   physical items split across both providers — e.g. a US customer orders
--   an 11x14" [Printify] and an A4 [always Gelato, since Printify doesn't
--   offer ISO sizes] in the same checkout.)
-- printful_order_id already exists (untouched, kept as reference/fallback).
--
-- Safe to run multiple times: ADD COLUMN IF NOT EXISTS is idempotent.

alter table public.orders
  add column if not exists fulfillment_provider text;

alter table public.orders
  add column if not exists printify_order_id text;

alter table public.orders
  add column if not exists gelato_order_id text;

comment on column public.orders.fulfillment_provider is
  'Which provider(s) fulfilled this order''s physical items: printify, gelato, or printify+gelato for mixed-provider orders. Null for digital-only orders.';
