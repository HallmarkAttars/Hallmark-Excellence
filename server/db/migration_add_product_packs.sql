-- Migration: Product Pack Options (flexible pack sizes)
-- Run this in Supabase SQL editor (SQL Editor > New Query > Paste > Run)
--
-- A "pack" is a purchasable bundle of a product (e.g. "Pack of 10" = 10
-- pieces sold together at a pack price). Packs are a CHILD of the product's
-- bulk pricing feature: the admin only configures them when the product
-- participates in bulk pricing. Buying N packs means N × pack_quantity
-- ACTUAL PIECES, and the existing bulk engine evaluates the piece quantity.
--
-- Columns:
--   pack_quantity  int > 0        — pieces per pack (e.g. 10, 20, 50)
--   price          numeric >= 0   — price of ONE pack (the total, not per piece)
--   name           text           — optional; when blank the UI auto-generates
--                                   "Pack of <pack_quantity>"
--   usage_label    text           — optional human label ("Family Pack", ...)
--   is_active      boolean        — inactive packs never appear to customers
--   display_order  int            — admin-controlled ordering
--
-- SAFE: a brand-new table — no existing data is touched. Deleting a product
-- removes its packs automatically (ON DELETE CASCADE). A unique constraint
-- on (product_id, pack_quantity) prevents duplicate pack sizes per product.

create table if not exists product_packs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text,
  usage_label text,
  pack_quantity int not null check (pack_quantity > 0),
  price numeric(10,2) not null check (price >= 0),
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, pack_quantity)
);

-- Row Level Security: public (anon) read-only, matching the products and
-- product_variants tables. Writes go through the server (service role).
alter table product_packs enable row level security;

create policy "Public can read product_packs" on product_packs
  for select using (true);

-- Helpful index for fetching a product's packs.
create index if not exists idx_product_packs_product
  on product_packs (product_id);

-- Auto-maintain updated_at on pack edits.
create or replace function set_product_packs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_product_packs_updated_at on product_packs;
create trigger trg_product_packs_updated_at
  before update on product_packs
  for each row execute function set_product_packs_updated_at();
