-- Migration: Add product-level boolean availability (is_in_stock)
-- Business model: Unlimited stock until product is marked finished (Out of Stock).
--
-- Single source of truth for product availability:
--   is_in_stock = true  --> 🟢 In Stock (all variants available)
--   is_in_stock = false --> 🔴 Out of Stock (all variants unavailable)
--
-- Safe, non-destructive migration:
-- 1. Adds column if not existing, defaulting to true.
-- 2. Initializes existing products based on existing stock column if present:
--    true when stock is null or > 0, false when stock = 0.
-- 3. Retains existing stock column for backward compatibility with legacy readers.

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_in_stock BOOLEAN DEFAULT true NOT NULL;

-- Initialize existing products:
UPDATE products
SET is_in_stock = (COALESCE(stock, 1) > 0)
WHERE is_in_stock IS NULL;

-- Index for fast storefront queries filtering by availability
CREATE INDEX IF NOT EXISTS idx_products_is_in_stock ON products(is_in_stock);
