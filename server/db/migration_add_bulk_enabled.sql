-- Optional Bulk Purchasing — enable flag for products.
--
-- Reuses the EXISTING bulk_price / bulk_min_qty columns added by
-- migration_add_pricing_fields.sql — no new pricing columns are needed.
--
-- This migration adds the single missing piece:
--   bulk_enabled boolean NOT NULL DEFAULT false
--
--   false (DEFAULT) → the product behaves exactly as before: no bulk price,
--                      no bulk quantity, no bulk badge, no bulk UI anywhere.
--   true             → the admin must configure bulk_price + bulk_min_qty
--                      (validated on save) and the storefront shows bulk
--                      pricing + live unlock progress.
--
-- Run once in the Supabase SQL editor (same process as the other migrations).
-- Existing products are untouched — they default to bulk_enabled = false,
-- their prices are unchanged, and no historical order is recalculated.

alter table products add column if not exists bulk_enabled boolean not null default false;
