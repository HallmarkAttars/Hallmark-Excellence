-- Migration: allow guest checkout addresses and orders without a users row.
--
-- The storefront has NO auth, so every checkout is a guest checkout. The
-- live `public.users` table is EMPTY, yet both FKs below point at it:
--   - addresses_user_id_fkey (addresses.user_id  -> users.id, NOT NULL)
--   - orders_user_id_fkey   (orders.user_id     -> users.id, NOT NULL)
-- The old code inserted a hardcoded user UUID that exists nowhere, so the
-- address insert failed with "violates foreign key constraint
-- 'addresses_user_id_fkey'" and checkout returned 500.
--
-- Fix: store guest addresses / orders with user_id = NULL (the same
-- guest-checkout pattern migration_fix_orders_v2.sql already intended for
-- orders, which was never applied to this database). A NULL user_id satisfies
-- a foreign key, so the constraints themselves stay intact — nothing is
-- dropped, no RLS policy is touched.
--
-- Run in the Supabase SQL editor (Dashboard → SQL Editor → New query),
-- or:  cd server && node scripts/applyGuestAddressMigration.js
--
-- Idempotent — safe to re-run.

alter table public.addresses
  alter column user_id drop not null;

alter table public.orders
  alter column user_id drop not null;
