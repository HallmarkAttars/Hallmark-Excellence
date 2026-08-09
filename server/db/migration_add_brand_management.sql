-- Brand Management — storefront display fields for the "Our Brands" section.
--
-- Adds the columns the admin panel needs to manage a brand's storefront
-- presence (name/description copy, imagery, position, featured/standard
-- placement and active state) WITHOUT touching the existing bulk-pricing
-- columns (bulk_enabled / standard_price / bulk_unit_price / bulk_min_qty)
-- which stay on the brands table and keep working exactly as before.
--
--   collection_label  text      eyebrow shown above the brand name on cards
--                               (fallback: "<Name> Collection")
--   tagline           text      short line under the brand name (title line)
--   description       text      short description shown on cards
--   long_description  text      full description (edit form only)
--   logo_url          text      brand logo image
--   cover_image_url   text      large banner/cover image (featured cards)
--   card_image_url    text      card image (secondary cards)
--   display_order     int       storefront sort order (1 = first)
--   display_type      text      'featured' (large homepage cards) or
--                               'standard' (compact cards) — default standard
--   is_active         boolean   inactive brands are hidden on the storefront
--
-- All columns are additive with safe defaults, so existing rows (Arees /
-- Dahab) remain untouched and default to active + standard until seeded.
--
-- Run once in the Supabase SQL editor (or via scripts/applyBrandManagementMigration.js).

alter table brands add column if not exists collection_label text;
alter table brands add column if not exists tagline text;
alter table brands add column if not exists description text;
alter table brands add column if not exists long_description text;
alter table brands add column if not exists logo_url text;
alter table brands add column if not exists cover_image_url text;
alter table brands add column if not exists card_image_url text;
alter table brands add column if not exists display_order int not null default 0;
alter table brands add column if not exists display_type text not null default 'standard';
alter table brands add column if not exists is_active boolean not null default true;
