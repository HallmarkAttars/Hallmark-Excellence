-- ============================================================================
-- DEMO SEED — Combined Brand Bulk Pricing for AREES & DAHAB
-- ----------------------------------------------------------------------------
-- Configures the brand-wide "mix & match" quantity discount so the feature can
-- be demoed end-to-end on the storefront:
--
--   AREES   · standard ₹2,500 · bulk ₹2,000/piece · unlocks at 91+ pieces total
--   DAHAB   · standard ₹2,300 · bulk ₹1,850/piece · unlocks at 91+ pieces total
--
-- "91 pieces" is the COMBINED quantity across ANY mix of that brand's items in
-- one cart (e.g. 3× one product + 88× another). Per-product bulk pricing on
-- the products table is NOT touched — this is the separate brand-level feature.
--
-- SELF-CONTAINED + IDEMPOTENT: the ALTER statements are `if not exists`, and
-- the UPDATEs may be re-run freely. Run this once in the Supabase SQL editor
-- (it also works before/after migration_add_brand_bulk_pricing.sql).
-- ============================================================================

-- 1. Ensure the brand bulk columns exist (same as the migration file)
alter table brands add column if not exists bulk_enabled boolean not null default false;
alter table brands add column if not exists standard_price numeric(10,2);
alter table brands add column if not exists bulk_unit_price numeric(10,2);
alter table brands add column if not exists bulk_min_qty int;

-- 2. Seed AREES
update brands set
  bulk_enabled   = true,
  standard_price = 2500,
  bulk_unit_price = 2000,
  bulk_min_qty   = 91
where slug = 'arees';

-- 3. Seed DAHAB
update brands set
  bulk_enabled   = true,
  standard_price = 2300,
  bulk_unit_price = 1850,
  bulk_min_qty   = 91
where slug = 'dahab';

-- ----------------------------------------------------------------------------
-- SANITY CHECK (should return 2 rows with bulk_enabled = true)
-- ----------------------------------------------------------------------------
-- select name, standard_price, bulk_unit_price, bulk_min_qty, bulk_enabled
-- from brands
-- where slug in ('arees', 'dahab');

-- ----------------------------------------------------------------------------
-- TURN OFF / RESET (run this to disable the demo and clear the values)
-- ----------------------------------------------------------------------------
-- update brands set
--   bulk_enabled    = false,
--   standard_price  = null,
--   bulk_unit_price = null,
--   bulk_min_qty    = null
-- where slug in ('arees', 'dahab');
