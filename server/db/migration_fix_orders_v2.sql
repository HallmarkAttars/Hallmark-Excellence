-- Migration: Fix orders table for guest checkout
-- Run this in Supabase SQL editor (SQL Editor > New Query > Paste > Run)

-- 1. Make address_id nullable (guest checkout doesn't have an address_id)
ALTER TABLE public.orders ALTER COLUMN address_id DROP NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_address_id_fkey;

-- 2. Fix payment_status check constraint to allow 'Pending', 'Paid', 'Cash On Delivery'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IN ('Pending', 'Paid', 'Cash On Delivery', 'pending', 'paid', 'unpaid'));

-- 3. Make user_id nullable (for guest checkouts)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

