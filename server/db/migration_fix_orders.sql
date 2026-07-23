-- Migration: Fix orders table for guest checkout
-- The orders table has user_id and address_id as NOT NULL,
-- but storefront uses guest checkout (no authenticated user).
-- This makes them optional and also ensures the insert matches

-- 1. Make user_id nullable (guest checkout support)
ALTER TABLE public.orders 
ALTER COLUMN user_id DROP NOT NULL;

-- 2. Make address_id nullable (guest checkout support)
ALTER TABLE public.orders 
ALTER COLUMN address_id DROP NOT NULL;

-- 3. Add customer_name, phone, address, pincode columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN customer_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'pincode'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN pincode text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'items'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN items jsonb DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN total_amount numeric(10,2);
  END IF;
END $$;

