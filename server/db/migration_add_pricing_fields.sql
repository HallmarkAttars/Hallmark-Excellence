-- Admin-editable pricing fields for products.
--
-- MRP / Original Price reuses the EXISTING compare_at_price column
-- (already in schema.sql) — no new column needed for it. The `add column
-- if not exists` below is just insurance for databases created before it.
--
-- Bulk pricing has no equivalent column today, so two new fields are added:
--   bulk_price   numeric(10,2)  — unit price when buying in bulk
--   bulk_min_qty int            — minimum quantity that unlocks the bulk price
--
-- Run once in the Supabase SQL editor (same process as the other migrations).
-- Existing products are untouched — NULL bulk fields simply hide the bulk
-- row on the storefront.
--
-- NOTE (checked 2026-08-06): every current product has offer_price = NULL,
-- so there is no legacy MRP data to backfill. After running this migration,
-- enter MRP and/or bulk values per product in the Admin panel (Edit Product)
-- and the storefront cards will display them.

alter table products add column if not exists compare_at_price numeric(10,2);
alter table products add column if not exists bulk_price numeric(10,2);
alter table products add column if not exists bulk_min_qty int;
