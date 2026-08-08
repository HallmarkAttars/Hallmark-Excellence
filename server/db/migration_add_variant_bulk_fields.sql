-- Migration: Per-variant bulk purchasing fields
-- Run this in Supabase SQL editor (SQL Editor > New Query > Paste > Run)
--
-- Moves bulk pricing from product-level to VARIANT-level. Each product_variants
-- row gets its own:
--   bulk_enabled boolean NOT NULL DEFAULT false  — optional per variant
--   bulk_price   numeric(10,2)                    — unit price once unlocked
--   bulk_min_qty int                              — pieces required to unlock
--
-- SAFE — no deletions, no recreations, no ID changes:
--   * Existing variants keep their price/stock/display values untouched.
--   * Existing variants default to bulk_enabled = false (no bulk UI shown).
--   * Existing products WITHOUT variants keep using the product-level bulk
--     columns exactly as before (fully backward compatible).
--   * The backfill below copies product-level bulk config onto the DEFAULT
--     variant of variant products that were configured BEFORE this migration,
--     so nothing that was showing bulk pricing regresses.

alter table product_variants add column if not exists bulk_enabled boolean not null default false;
alter table product_variants add column if not exists bulk_price numeric(10,2);
alter table product_variants add column if not exists bulk_min_qty int;

-- Backfill: products configured with product-level bulk (before per-variant
-- bulk existed) get their config copied onto the DEFAULT variant so existing
-- bulk products keep working. Variants that already carry their own bulk
-- config (bulk_price not null) are left untouched.
update product_variants pv
set bulk_enabled = p.bulk_enabled,
    bulk_price   = p.bulk_price,
    bulk_min_qty = p.bulk_min_qty
from products p
where pv.product_id = p.id
  and p.bulk_enabled = true
  and pv.is_default = true
  and pv.bulk_price is null
  and pv.bulk_min_qty is null;
