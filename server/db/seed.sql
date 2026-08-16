-- Optional: seed brands + categories matching the storefront's mock data.
-- Safe to run once after schema.sql.

insert into brands (name, slug) values
  ('Arees', 'arees'),
  ('Dahab 6ml', 'dahab')
on conflict (slug) do nothing;

insert into categories (name, slug) values
  ('Attar', 'attar')
on conflict (slug) do nothing;

insert into categories (name, slug, display_order) values
  ('Caps & Pumps', 'caps-and-pumps', 1),
  ('Fragrance Oil', 'fragrance-oil', 2),
  ('Equipments', 'equipments', 3),
  ('Spray Bottle', 'spray-bottle', 4),
  ('Roll on Bottles', 'roll-on-bottles', 5),
  ('Colour Bottles', 'colour-bottles', 6)
on conflict (slug) do nothing;
