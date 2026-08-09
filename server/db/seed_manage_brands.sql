-- ============================================================================
-- BRAND MANAGEMENT SEED — the storefront's five brands.
-- ----------------------------------------------------------------------------
--   1. Arees            (featured · position 1 · EXISTING)
--   2. Dahab            (featured · position 2 · EXISTING)
--   3. Misk Al Arab     (standard · position 3 · NEW)
--   4. Oud Al Haramain  (standard · position 4 · NEW)
--   5. Amber Oud        (standard · position 5 · NEW)
--
-- IDEMPOTENT: inserts use ON CONFLICT (slug) DO NOTHING, and every brand is
-- then updated with its canonical position/type/content, so the script may be
-- re-run freely. Existing Arees/Dahab products keep their brand_id — the
-- inserts only ever create the three NEW brand rows.
--
-- IMAGES: the three new brands currently use elegant placeholder URLs
-- (marked REPLACE-ME). Swap in the real artwork once available and re-run.
-- ============================================================================

-- ---- 1. AREES (existing — position it + give it storefront copy) ----
update brands set
  collection_label = 'Arees Collection',
  tagline          = 'Timeless Scents, Pure Elegance',
  description      = 'Discover timeless fragrances crafted with refined elegance.',
  long_description = 'Arees leans bold and smoky — oud and amber compositions crafted in small batches.',
  display_order    = 1,
  display_type     = 'featured',
  is_active        = true
where slug = 'arees';

-- ---- 2. DAHAB (existing — position it + give it storefront copy) ----
update brands set
  collection_label = 'Dahab Collection',
  tagline          = 'Rich Heritage, Lasting Impressions',
  description      = 'A rich fragrance collection created to leave a lasting impression.',
  long_description = 'Dahab leans golden and floral — soft musks and warm resins blended to linger.',
  display_order    = 2,
  display_type     = 'featured',
  is_active        = true
where slug = 'dahab';

-- ---- 3. MISK AL ARAB (new) ----
insert into brands (name, slug)
values ('Misk Al Arab', 'misk-al-arab')
on conflict (slug) do nothing;

update brands set
  collection_label = 'Misk Al Arab Collection',
  tagline          = 'The essence of purity and tradition',
  description      = 'The essence of purity and tradition — soft, clean musks crafted with care.',
  long_description = 'Misk Al Arab celebrates the purity of traditional Arabian musk in its most elegant form.',
  card_image_url   = 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=70',
  cover_image_url  = 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&q=70',
  display_order    = 3,
  display_type     = 'standard',
  is_active        = true
where slug = 'misk-al-arab';

-- ---- 4. OUD AL HARAMAIN (new) ----
insert into brands (name, slug)
values ('Oud Al Haramain', 'oud-al-haramain')
on conflict (slug) do nothing;

update brands set
  collection_label = 'Oud Al Haramain Collection',
  tagline          = 'Sacred oud, deeply rooted',
  description      = 'Sacred oud, deeply rooted — rich and smoky scents of timeless heritage.',
  long_description = 'Oud Al Haramain honours the depth of pure oud — dark, resinous and unforgettable.',
  card_image_url   = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=70',
  cover_image_url  = 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1200&q=70',
  display_order    = 4,
  display_type     = 'standard',
  is_active        = true
where slug = 'oud-al-haramain';

-- ---- 5. AMBER OUD (new) ----
insert into brands (name, slug)
values ('Amber Oud', 'amber-oud')
on conflict (slug) do nothing;

update brands set
  collection_label = 'Amber Oud Collection',
  tagline          = 'Warm amber, luminous oud',
  description      = 'Warm amber, luminous oud — golden resinous blends of quiet luxury.',
  long_description = 'Amber Oud pairs golden amber with luminous oud for a warm, sophisticated signature.',
  card_image_url   = 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=800&q=70',
  cover_image_url  = 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1200&q=70',
  display_order    = 5,
  display_type     = 'standard',
  is_active        = true
where slug = 'amber-oud';

-- ----------------------------------------------------------------------------
-- SANITY CHECK — expect exactly 5 rows, ordered 1..5 (two featured + 3 standard)
-- ----------------------------------------------------------------------------
-- select name, slug, display_order, display_type, is_active
-- from brands
-- order by display_order;
