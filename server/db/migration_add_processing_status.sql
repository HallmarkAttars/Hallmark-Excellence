-- Migration: Allow 'Processing' in orders.order_status
-- Run this in the Supabase SQL editor (SQL Editor > New Query > Paste > Run).
--
-- ROOT CAUSE (verified 2026-08-06): the live orders_order_status_check
-- constraint only allowed
--   ('Pending', 'Shipped', 'Delivered', 'Cancelled', 'Returned')
-- so updating an order to 'Processing' was rejected with a check-constraint
-- violation (PGRST check_violation) and the Admin status change never
-- persisted.
--
-- This re-creates the SAME constraint with the full status set, adding
-- 'Processing' and keeping every previously allowed value. Nothing is
-- removed; existing orders are untouched.
--
-- Mirror of the project's existing migration_fix_orders_v2.sql pattern.

alter table public.orders drop constraint if exists orders_order_status_check;

alter table public.orders add constraint orders_order_status_check
  check (order_status in ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'));
