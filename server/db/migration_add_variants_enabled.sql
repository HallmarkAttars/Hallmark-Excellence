-- Migration: Optional Product Variants (Enable Variants switch)
-- Run this in Supabase SQL editor (SQL Editor > New Query > Paste > Run)
--
-- Adds `variants_enabled` to the products table. This flag is the SINGLE
-- control for whether a product offers capacity/size variants:
--
--   false (DEFAULT) → the product has NO variant selection. The customer
--                      sees the normal product (price/stock) and may still
--                      pick a PACKAGE (packages are a SEPARATE, independent
--                      concept and are never controlled by this flag).
--   true             → the product shows its variant/capacity options
--                      (e.g. 10 ML / 20 ML / 30 ML) to the customer.
--
-- SAFE: existing rows are untouched, then backfilled — any product that
-- ALREADY has variant rows is set to variants_enabled = true so existing
-- variant products keep behaving exactly as before. Products without
-- variants stay false (Variants OFF). Package configuration (product_packs)
-- is independent and never modified.
--
-- Variant ROWS are deliberately NEVER deleted when the flag is flipped OFF:
-- the storefront simply ignores them. Re-enabling the flag restores the
-- variants, so no product data is ever lost.

alter table products add column if not exists variants_enabled boolean not null default false;

-- Backfill: products that already carry variants are marked as enabled so
-- nothing that currently shows variants regresses after this migration.
update products p
set variants_enabled = true
where p.variants_enabled = false
  and exists (
    select 1 from product_variants pv
    where pv.product_id = p.id
  );
