-- Customer order reviews (on-site collection with admin moderation).
--
-- One review per order (unique order_number). Customers submit from the
-- Track Order page AFTER the order shows Delivered — the endpoint verifies
-- the order + customer phone BEFORE inserting, so this table can never hold
-- a submission that is not tied to a real, delivered order.
--
-- consent_show = explicit customer permission to display their review
-- (first name + text) on the storefront website. Status flow:
--   pending  → awaiting moderation (default)
--   approved → eligible for public display (consent respecting)
--   rejected → never displayed
--
-- Run once in the Supabase SQL editor (SQL Editor > New Query > Paste > Run).
-- Idempotent (create if not exists) so it is safe to repeat.

create table if not exists order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  rating int not null check (rating between 1 and 5),
  review_text text,
  customer_name text,
  consent_show boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by text,
  admin_note text
);

-- Moderation queue reads by status, newest first.
create index if not exists order_reviews_status_idx
  on order_reviews (status, created_at desc);
