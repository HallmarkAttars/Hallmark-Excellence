-- Run this in the Supabase SQL editor once, on a fresh project.
-- Requires pgcrypto for gen_random_uuid() — Supabase enables this by default.

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  banner_image_url text,
  created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  image_url text,
  display_order int default 0,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  category_id uuid references categories(id) on delete set null,
  brand_id uuid references brands(id) on delete set null,
  images jsonb default '[]',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Note: stock, product-level bulk (bulk_price / bulk_min_qty / bulk_enabled)
-- and pack options (product_packs) were removed from the application.
-- Existing databases should run migration_drop_stock_bulk_packs.sql.
-- Brand-level bulk pricing lives on the brands table and is unaffected.

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_name text not null,
  phone text not null,
  address text not null,
  pincode text not null,
  message text,
  items jsonb not null,
  total_amount numeric(10,2) not null,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text,
  created_at timestamptz default now()
);

-- Row Level Security ----------------------------------------------------

alter table brands enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table admin_users enable row level security;

-- Public (anon) read-only access to catalog tables.
-- No insert/update/delete policies are created for anon, so those
-- operations are blocked by default once RLS is enabled — only a
-- request using the service role key (this backend) can bypass RLS.
create policy "Public can read brands" on brands
  for select using (true);

create policy "Public can read categories" on categories
  for select using (true);

create policy "Public can read products" on products
  for select using (true);

-- orders and admin_users get NO policies at all — with RLS enabled and
-- zero policies, every operation from the anon/authenticated roles is
-- denied. Only the service role key (used exclusively by this server)
-- can read or write these tables.

-- Helpful index for order search/filter in the admin panel.
create index if not exists idx_orders_created_at on orders (created_at desc);
create index if not exists idx_products_category on products (category_id);
create index if not exists idx_products_brand on products (brand_id);
