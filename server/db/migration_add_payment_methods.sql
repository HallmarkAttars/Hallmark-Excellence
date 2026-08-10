-- ============================================================================
-- migration_add_payment_methods.sql
-- ----------------------------------------------------------------------------
-- Allow the two customer-selectable payment methods (NO payment gateway):
--   'Cash on Delivery'  (canonical label stored by createOrder)
--   'UPI / Online Payment'
--
-- The live orders table has an orders_payment_method_check constraint that
-- only ever accepted the legacy exact string 'Cash On Delivery' — inserting a
-- UPI order (or the canonical 'Cash on Delivery' label) failed with
-- "violates check constraint orders_payment_method_check".
--
-- This migration is SAFE:
--   * Drops ONLY the old payment_method check constraint.
--   * Re-adds it accepting the legacy 'Cash On Delivery' string PLUS the two
--     canonical labels, so historical rows remain valid and new orders work.
--   * No columns are dropped, no data is deleted, no other constraint or
--     index is touched.
--   * Idempotent (DROP IF EXISTS / ADD CONSTRAINT can be re-run safely).
-- ============================================================================

alter table public.orders drop constraint if exists orders_payment_method_check;

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in (
    'Cash On Delivery',
    'Cash on Delivery',
    'UPI / Online Payment',
    'cod',
    'upi'
  ));
