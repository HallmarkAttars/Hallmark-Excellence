-- Combined Brand Bulk Pricing — brand-wide quantity discount for AREES / DAHAB.
--
-- A SEPARATE feature from the per-product bulk columns (bulk_price /
-- bulk_min_qty / bulk_enabled) already on the products table. Those stay as-is
-- and continue to work independently.
--
-- This migration adds the missing columns to the brands table:
--   bulk_enabled   boolean NOT NULL DEFAULT false
--                  admin on/off switch. false (DEFAULT) → the brand behaves
--                  exactly as before: no brand-wide bulk anywhere.
--   standard_price numeric(10,2)
--                  the brand's reference / standard per-piece price used to
--                  display the banner table ("Standard rate" column) and to
--                  validate that bulk_unit_price is a genuine discount.
--                  Stored manually per brand — AREES/DAHAB product prices are
--                  NOT assumed to be uniform, so the admin sets the reference.
--   bulk_unit_price numeric(10,2)
--                  discounted per-piece price charged for EVERY line of this
--                  brand once the combined quantity threshold is reached.
--   bulk_min_qty   int
--                  combined quantity threshold across ALL of this brand's
--                  products in a single order (mix & match any items).
--
-- A brand's combined bulk pricing is active ONLY when bulk_enabled = true AND
-- all three values are set and valid (standard_price > bulk_unit_price > 0,
-- bulk_min_qty >= 2). NULL values simply hide the feature — the storefront
-- never shows a partially-configured brand bulk offer.
--
-- Run once in the Supabase SQL editor (same process as the other migrations).
-- Existing brands are untouched — they default to bulk_enabled = false and
-- their prices/orders are unchanged.

alter table brands add column if not exists bulk_enabled boolean not null default false;
alter table brands add column if not exists standard_price numeric(10,2);
alter table brands add column if not exists bulk_unit_price numeric(10,2);
alter table brands add column if not exists bulk_min_qty int;
