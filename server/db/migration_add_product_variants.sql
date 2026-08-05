-- Migration: Product Variants support
-- Run this in Supabase SQL editor (SQL Editor > New Query > Paste > Run)
--
-- Adds a product_variants table. Each variant belongs to a product and is
-- removed automatically when its product is deleted (ON DELETE CASCADE).

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  quantity_value numeric(10,2) not null default 0,
  quantity_unit text not null default 'ML',
  display_label text not null,
  price numeric(10,2) not null,
  stock int default 0,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security: public (anon) read-only, matching the products table.
alter table product_variants enable row level security;

create policy "Public can read product_variants" on product_variants
  for select using (true);

-- Helpful index for fetching a product's variants.
create index if not exists idx_product_variants_product
  on product_variants (product_id);
