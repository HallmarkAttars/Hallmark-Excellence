-- Admin-editable ratings for products.
--
-- Adds the two columns the storefront product cards read to render the
-- rating row (★ 4.8 | (81)):
--   rating       numeric(3,2)  — average rating on a 0–5 scale (e.g. 4.8)
--   review_count int           — number of reviews behind that rating
--
-- Run once in the Supabase SQL editor (SQL Editor > New Query > Paste > Run).
-- Existing products keep NULL values — NULL rating/review_count simply hide
-- the rating row on the storefront, so nothing changes until values are set
-- per product in the Admin panel (Edit Product).

alter table products add column if not exists rating numeric(3,2);
alter table products add column if not exists review_count int;
