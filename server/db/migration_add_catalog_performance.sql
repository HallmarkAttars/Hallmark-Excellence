-- Catalog performance: composite indexes + category product-count aggregate.
-- Additive and idempotent. Safe to re-run in the Supabase SQL editor.

-- Product listing order: active rows by manual position, then newest.
create index if not exists idx_products_active_display_order
  on products (is_active, display_order, created_at desc);

-- Category pages: one category's active rows in display order.
create index if not exists idx_products_active_category_order
  on products (category_id, is_active, display_order, created_at desc);

-- Brand pages: one brand's active rows in display order.
create index if not exists idx_products_active_brand_order
  on products (brand_id, is_active, display_order, created_at desc);

-- Variant batches fetched with .in('product_id', [...]) for catalog listings.
create index if not exists idx_product_variants_product
  on product_variants (product_id);

-- Category product counts without downloading every product row.
create or replace function public.get_category_product_counts(active_only boolean default true)
returns table(category_id uuid, product_count bigint)
language sql
stable
as $$
  select p.category_id, count(*)::bigint as product_count
  from public.products p
  where p.category_id is not null
    and (not active_only or p.is_active = true)
  group by p.category_id;
$$;

grant execute on function public.get_category_product_counts(boolean) to anon, authenticated;
