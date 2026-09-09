-- Migration: Add slug, is_featured, and image columns to products table
-- Run this in the Supabase SQL editor (SQL Editor > New Query > Paste > Run)
--
-- The backend code references these columns but they were never added via
-- migration. This fixes product creation which currently fails because
-- the INSERT includes columns that don't exist.
--
-- SAFE — additive only, no data is modified.

-- slug: URL-friendly version of the product name (for future use)
alter table products add column if not exists slug text;

-- is_featured: flag for homepage featured products
alter table products add column if not exists is_featured boolean not null default false;

-- image: singular product image URL (text). The original schema had
-- `images` (JSONB) for multi-image support, but the app now uses a
-- single `image` text column. We add the column if it doesn't exist.
-- If the legacy `images` column still exists, it's left untouched for
-- backward compatibility.
alter table products add column if not exists image text;

-- Backfill slug for existing products that don't have one yet
update products
set slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        trim(name),
        '\s+', '-', 'g'
      ),
      '[^\w-]+', '', 'g'
    ),
    '--+', '-', 'g'
  )
)
where slug is null and name is not null;

-- Ensure slugs are unique (append a suffix if there are duplicates)
DO $$
DECLARE
  dup RECORD;
  row_rec RECORD;
  counter INT;
BEGIN
  FOR dup IN
    SELECT slug
    FROM products
    WHERE slug IS NOT NULL
    GROUP BY slug
    HAVING count(*) > 1
  LOOP
    counter := 2;
    FOR row_rec IN
      SELECT id
      FROM products
      WHERE slug = dup.slug
      ORDER BY created_at
      OFFSET 1
    LOOP
      UPDATE products
      SET slug = dup.slug || '-' || counter
      WHERE id = row_rec.id;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Add a unique index on slug (non-null only) so future inserts are validated
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug
  ON products (slug)
  WHERE slug IS NOT NULL;

-- Helpful index for slug-based lookups
CREATE INDEX IF NOT EXISTS idx_products_slug_lookup
  ON products (slug);
