-- Migration: link customer_reviews to real live products where confidently matched.
--
-- Context: the 100 seeded reviews were captured from historical Etsy order data,
-- where productName is often an old/shortened Etsy listing title. Product listings
-- get renamed/retitled over time (confirmed 2026-07-27 with the "Sardine Painting"
-- bestseller, which now lives under a completely different title/description with
-- zero literal text overlap). So productName cannot always be resolved to a live
-- product by string matching alone — product_id is nullable and only populated
-- where a match was either high-confidence (fuzzy word-overlap match) or manually
-- confirmed by the shop owner.
--
-- Not a foreign key constraint on purpose: a handful of reviewed products may have
-- since been deleted entirely (see the sardine investigation), and we don't want
-- inserts/backfills to fail if that happens again for another row.

alter table customer_reviews add column if not exists product_id uuid;

comment on column customer_reviews.product_id is
  'Best-effort link to products.id. NULL means no confident match was found (old Etsy listing renamed/retitled/removed) — review still displays fine without a link. See needs_review.csv (shared alongside this migration) for the ~63 unresolved candidates the shop owner can confirm manually.';

-- Backfill: 37 confident matches (34 high-confidence fuzzy word-overlap matches +
-- 3 manually confirmed "Sardine Painting" reviews, ids 15/58/89, pointed at
-- 04f14438-422d-4792-b9fa-de02527e4704 "Sardines Fish Wall Art Print" per the
-- shop owner's visual confirmation on 2026-07-27). Safe to re-run.
update customer_reviews set product_id = 'a3b55795-cc64-4759-ade4-dc745c1a79d9' where id = 1;
update customer_reviews set product_id = '48ed0cd3-f1d2-4cbe-bb9c-2e67184ed858' where id = 2;
update customer_reviews set product_id = 'cbcbe74c-0c6f-4e05-b675-f4c38ef216f7' where id = 3;
update customer_reviews set product_id = '87eed43e-7819-4433-b4a9-46f44211ce5d' where id = 4;
update customer_reviews set product_id = 'a3b55795-cc64-4759-ade4-dc745c1a79d9' where id = 5;
update customer_reviews set product_id = '07b8111c-8549-457a-9634-d7a4026e8771' where id = 6;
update customer_reviews set product_id = '48ed0cd3-f1d2-4cbe-bb9c-2e67184ed858' where id = 8;
update customer_reviews set product_id = '10db8d17-55bc-46b6-a8b8-e2a669986b2b' where id = 10;
update customer_reviews set product_id = '04f14438-422d-4792-b9fa-de02527e4704' where id = 15;
update customer_reviews set product_id = 'b55550b8-f413-4858-891b-6792ed9aaafd' where id = 17;
update customer_reviews set product_id = 'b6eaa910-e3c4-457f-8359-8fd3f10225c6' where id = 22;
update customer_reviews set product_id = 'bb771553-7537-4d21-b1f6-b21cd892d84d' where id = 24;
update customer_reviews set product_id = '795502e6-c2a1-45a2-ac63-8f98f2ecf9af' where id = 27;
update customer_reviews set product_id = '8332d346-25bb-4e8c-aed0-605b118277ad' where id = 29;
update customer_reviews set product_id = '8332d346-25bb-4e8c-aed0-605b118277ad' where id = 32;
update customer_reviews set product_id = '864a06e9-a884-4a98-8953-6ecb413cf28a' where id = 36;
update customer_reviews set product_id = '48ed0cd3-f1d2-4cbe-bb9c-2e67184ed858' where id = 43;
update customer_reviews set product_id = '07b8111c-8549-457a-9634-d7a4026e8771' where id = 44;
update customer_reviews set product_id = '48ed0cd3-f1d2-4cbe-bb9c-2e67184ed858' where id = 45;
update customer_reviews set product_id = 'a3b55795-cc64-4759-ade4-dc745c1a79d9' where id = 47;
update customer_reviews set product_id = '444e4e2c-57c4-4bb0-869e-4f9ba60b1507' where id = 49;
update customer_reviews set product_id = '25f12707-ebbb-47fa-8c93-8f839db959f6' where id = 50;
update customer_reviews set product_id = '16e62929-0a67-4148-a698-cec4dbf4eb40' where id = 51;
update customer_reviews set product_id = '48ed0cd3-f1d2-4cbe-bb9c-2e67184ed858' where id = 57;
update customer_reviews set product_id = '04f14438-422d-4792-b9fa-de02527e4704' where id = 58;
update customer_reviews set product_id = '8ece3c73-e617-4a1f-82d0-145540849a4d' where id = 62;
update customer_reviews set product_id = '84cd8335-6e53-4470-919b-6aebbfb546c2' where id = 65;
update customer_reviews set product_id = 'b6eaa910-e3c4-457f-8359-8fd3f10225c6' where id = 69;
update customer_reviews set product_id = 'b6eaa910-e3c4-457f-8359-8fd3f10225c6' where id = 72;
update customer_reviews set product_id = '48636eb3-9413-466d-8fde-b3c745be5aea' where id = 74;
update customer_reviews set product_id = 'b6eaa910-e3c4-457f-8359-8fd3f10225c6' where id = 75;
update customer_reviews set product_id = '84cd8335-6e53-4470-919b-6aebbfb546c2' where id = 76;
update customer_reviews set product_id = '48636eb3-9413-466d-8fde-b3c745be5aea' where id = 77;
update customer_reviews set product_id = '48636eb3-9413-466d-8fde-b3c745be5aea' where id = 81;
update customer_reviews set product_id = 'b6eaa910-e3c4-457f-8359-8fd3f10225c6' where id = 86;
update customer_reviews set product_id = '04f14438-422d-4792-b9fa-de02527e4704' where id = 89;
update customer_reviews set product_id = '48636eb3-9413-466d-8fde-b3c745be5aea' where id = 100;
