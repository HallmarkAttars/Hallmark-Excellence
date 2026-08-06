-- Migration: Order item variant snapshots
-- Run this in Supabase SQL editor (SQL Editor > New Query > Paste > Run)
--
-- Order line items are stored as a JSONB array inside orders.items. Each
-- element is a complete snapshot of the purchased item so orders stay
-- historically accurate even if the product/variant is edited or deleted:
--
-- {
--   product_id,
--   product_name,
--   image,
--   quantity,
--   unit_price,
--   subtotal,
--   variant_id,          (optional)
--   variant_label,       (optional)
--   quantity_value,      (optional)
--   quantity_unit        (optional)
-- }
--
-- This migration only guarantees the `items` column exists on orders for
-- older setups; the application already writes the snapshot there.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'items'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN items jsonb DEFAULT '[]';
  END IF;
END $$;
