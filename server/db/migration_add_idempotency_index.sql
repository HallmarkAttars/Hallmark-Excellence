-- Migration: Idempotent order creation (duplicate-order / duplicate-email protection)
-- Run this in the Supabase SQL editor (SQL Editor > New Query > Paste > Run).
--
-- Every checkout session generates a unique idempotency key that is stored
-- inside the existing orders.notes JSONB column. This unique EXPRESSION index
-- makes the key a database-enforced guarantee: if two requests with the same
-- key race (fast double-click, network retry, retry after a lost response),
-- Postgres rejects the second insert with a unique violation (23505) and the
-- API returns the FIRST order instead of creating a duplicate. A duplicate
-- order can therefore never exist — which also means a second pair of Brevo
-- emails can never be sent for the same checkout.
--
-- No new columns or tables are created — the index reads the existing notes
-- JSONB column, so it is safe to run against the live database. Existing rows
-- without an idempotency key are simply not indexed (WHERE clause).

create unique index if not exists orders_idempotency_key_idx
  on public.orders ((notes->>'idempotency_key'))
  where (notes->>'idempotency_key') is not null;
