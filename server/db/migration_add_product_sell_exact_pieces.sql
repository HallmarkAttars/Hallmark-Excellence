-- Product-level piece quantity mode.
--
-- sell_exact_pieces = false (default)
--   The + button multiplies the selected pack/roll:
--   60 Pieces x 1 -> 60, x 2 -> 120. Used for sealed rolls/packs.
--
-- sell_exact_pieces = true
--   The + button adds individual pieces above the selected band:
--   60 -> 61 -> ... -> 75. Used for loose packet attar.
--
-- Gram / ML products are always pack-based and ignore this flag.
-- Existing products default to the current whole-pack behavior, so nothing
-- changes until an admin enables exact pieces for a loose product.

ALTER TABLE products
ADD COLUMN IF NOT EXISTS sell_exact_pieces BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_sell_exact_pieces
  ON products(sell_exact_pieces);
