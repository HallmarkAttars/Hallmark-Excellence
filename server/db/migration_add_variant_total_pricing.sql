-- Migration: Variant Total Price + Price Per Unit
-- Run this in the Supabase SQL editor (SQL Editor > New Query > Paste > Run)
--
-- Introduces the 4-field variant pricing model:
--   quantity_value  numeric(10,2)  — quantity of the variant (e.g. 100)
--   quantity_unit   text           — ML | Gram | Pieces
--   total_price     numeric(10,2)  — the ACTUAL amount the customer pays for
--                                    ONE selected variant (authoritative)
--   price_per_unit  numeric(10,2)  — informational display price only
--
-- SAFE — no deletions, no recreations, no ID changes:
--   * Existing variants keep their current values untouched.
--   * The old `price` column is deliberately KEPT (never dropped) so legacy
--     records, scripts and any pre-update clients keep working.
--   * Backfill below copies `price` into BOTH new columns for existing
--     variants so existing cart math is preserved exactly: the old flow
--     charged price × quantity, the new flow charges total_price × quantity
--     (and total_price = price), so nothing changes for existing data.
--
--   New/edited variants written by the updated admin set total_price and
--   price_per_unit explicitly.

alter table product_variants add column if not exists total_price numeric(10,2);
alter table product_variants add column if not exists price_per_unit numeric(10,2);

-- Backfill: legacy variants without the new columns keep behaving identically.
update product_variants
set total_price = price
where total_price is null and price is not null;

update product_variants
set price_per_unit = price
where price_per_unit is null and price is not null;
