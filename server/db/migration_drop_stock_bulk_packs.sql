-- Migration: Drop unused stock / bulk / pack columns
-- Run this in Supabase SQL editor (SQL Editor > New Query > Paste > Run)
-- or via:  node scripts/applyDropStockBulkPacksMigration.js
--
-- The retail app no longer uses any of these (removed from the admin form,
-- storefront, cart and order flow):
--   * stock                    — products.stock, product_variants.stock
--   * product-level bulk       — products.bulk_enabled / bulk_price / bulk_min_qty
--                                and product_variants.bulk_enabled / bulk_price / bulk_min_qty
--   * pack options             — the product_packs table
--
-- SAFE:
--   * Every drop uses IF EXISTS → idempotent, safe to re-run.
--   * Brand-level bulk pricing (brands.bulk_enabled / standard_price /
--     bulk_unit_price / bulk_min_qty) is a SEPARATE feature and is NOT touched.
--   * products.variants_enabled is intentionally KEPT — it is not part of the
--     stock/bulk/pack removal.
--   * Existing products, variants and historical orders are unaffected —
--     only unused columns/table are removed.
--
-- NOTE: deploy the server code first (or together) — the product/category/
-- brand controllers were updated to stop selecting these columns so the API
-- keeps working before AND after this migration runs.

-- products — stock + product-level bulk
alter table products drop column if exists stock;
alter table products drop column if exists bulk_enabled;
alter table products drop column if exists bulk_price;
alter table products drop column if exists bulk_min_qty;

-- product_variants — stock + per-variant bulk
alter table product_variants drop column if exists stock;
alter table product_variants drop column if exists bulk_enabled;
alter table product_variants drop column if exists bulk_price;
alter table product_variants drop column if exists bulk_min_qty;

-- Pack options lived in their own table (FK to products, ON DELETE CASCADE).
drop table if exists product_packs;

-- Helper function created by the packs migration — no longer needed.
drop function if exists set_product_packs_updated_at();
