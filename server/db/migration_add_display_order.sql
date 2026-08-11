-- Manual display ordering — products + categories
-- ---------------------------------------------------------------------------
-- Adds a `display_order` column to products AND categories so the Admin can
-- control the exact storefront order from the Admin Panel. The storefront
-- NEVER sorts alphabetically — it reads this column and shows categories and
-- products in exactly the admin-defined order.
--
-- Existing rows are backfilled by INSERTION order (created_at, then id) —
-- never by name — so the first load looks deliberate and the admin can then
-- reorder freely from the Admin Panel. New rows get max+1 from the create
-- endpoints, so new items land at the END by default.
--
-- Additive and idempotent — safe to re-run in the Supabase SQL editor.
-- (Run the whole file once; re-running only affects rows still at the
-- default position.)

-- ---------------------------------------------------------------- products
alter table products add column if not exists display_order int not null default 0;

create index if not exists idx_products_display_order on products (display_order);

-- Backfill rows that still carry the default 0 (insertion order).
update products
set display_order = ord.rn
from (
  select id, row_number() over (order by created_at, id) as rn
  from products
) ord
where products.id = ord.id
  and products.display_order = 0;

-- --------------------------------------------------------------- categories
alter table categories add column if not exists display_order int not null default 0;

create index if not exists idx_categories_display_order on categories (display_order);

-- Backfill rows that still carry the default 0 (insertion order).
update categories
set display_order = ord.rn
from (
  select id, row_number() over (order by created_at, id) as rn
  from categories
) ord
where categories.id = ord.id
  and categories.display_order = 0;
