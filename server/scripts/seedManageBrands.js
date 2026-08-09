// Seeds the storefront's five brands (mirrors server/db/seed_manage_brands.sql
// using the service-role client so it runs through PostgREST without the
// exec_sql RPC). Idempotent — safe to re-run.
//
//   node scripts/seedManageBrands.js
//
// Inserts the three NEW brands (Misk Al Arab, Oud Al Haramain, Amber Oud)
// when they don't exist, then updates ALL five with their canonical position,
// display type, active state and storefront copy. Existing Arees/Dahab
// products keep their brand_id — nothing is migrated or recreated.

require('dotenv').config()
const supabase = require('../src/config/supabase')

// The storefront-management columns added by migration_add_brand_management.sql.
// The seed cannot write these until the DDL has been applied, so probe first
// and fail with clear instructions instead of a confusing PostgREST column error.
const REQUIRED_COLUMNS = [
  'collection_label',
  'tagline',
  'description',
  'long_description',
  'logo_url',
  'cover_image_url',
  'card_image_url',
  'display_order',
  'display_type',
  'is_active',
]

const BRANDS = [
  {
    slug: 'arees',
    name: 'Arees',
    collection_label: 'Arees Collection',
    tagline: 'Timeless Scents, Pure Elegance',
    description: 'Discover timeless fragrances crafted with refined elegance.',
    long_description: 'Arees leans bold and smoky — oud and amber compositions crafted in small batches.',
    display_order: 1,
    display_type: 'featured',
    is_active: true,
  },
  {
    slug: 'dahab',
    name: 'Dahab',
    collection_label: 'Dahab Collection',
    tagline: 'Rich Heritage, Lasting Impressions',
    description: 'A rich fragrance collection created to leave a lasting impression.',
    long_description: 'Dahab leans golden and floral — soft musks and warm resins blended to linger.',
    display_order: 2,
    display_type: 'featured',
    is_active: true,
  },
  {
    slug: 'misk-al-arab',
    name: 'Misk Al Arab',
    collection_label: 'Misk Al Arab Collection',
    tagline: 'The essence of purity and tradition',
    description: 'The essence of purity and tradition — soft, clean musks crafted with care.',
    long_description: 'Misk Al Arab celebrates the purity of traditional Arabian musk in its most elegant form.',
    // REPLACE-ME: placeholder artwork — swap for the real image URLs.
    card_image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=70',
    cover_image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&q=70',
    display_order: 3,
    display_type: 'standard',
    is_active: true,
  },
  {
    slug: 'oud-al-haramain',
    name: 'Oud Al Haramain',
    collection_label: 'Oud Al Haramain Collection',
    tagline: 'Sacred oud, deeply rooted',
    description: 'Sacred oud, deeply rooted — rich and smoky scents of timeless heritage.',
    long_description: 'Oud Al Haramain honours the depth of pure oud — dark, resinous and unforgettable.',
    // REPLACE-ME: placeholder artwork — swap for the real image URLs.
    card_image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=70',
    cover_image_url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1200&q=70',
    display_order: 4,
    display_type: 'standard',
    is_active: true,
  },
  {
    slug: 'amber-oud',
    name: 'Amber Oud',
    collection_label: 'Amber Oud Collection',
    tagline: 'Warm amber, luminous oud',
    description: 'Warm amber, luminous oud — golden resinous blends of quiet luxury.',
    long_description: 'Amber Oud pairs golden amber with luminous oud for a warm, sophisticated signature.',
    // REPLACE-ME: placeholder artwork — swap for the real image URLs.
    card_image_url: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=800&q=70',
    cover_image_url: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1200&q=70',
    display_order: 5,
    display_type: 'standard',
    is_active: true,
  },
]

async function upsertBrand(brand) {
  const { name, slug, ...fields } = brand

  // Does this brand already exist?
  const { data: existing, error: findError } = await supabase
    .from('brands')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (findError) throw findError

  if (existing) {
    const { error } = await supabase
      .from('brands')
      .update({ ...fields, name })
      .eq('id', existing.id)
    if (error) throw error
    return { action: 'updated', slug }
  }

  const { error } = await supabase.from('brands').insert({ name, slug, ...fields })
  if (error) throw error
  return { action: 'inserted', slug }
}

async function main() {
  // Pre-flight: verify the management columns exist before touching any row.
  const missing = []
  for (const col of REQUIRED_COLUMNS) {
    const { error } = await supabase.from('brands').select(col).limit(1)
    if (error) missing.push(col)
  }
  if (missing.length > 0) {
    console.error('✗ The brand management columns are not in the database yet:')
    console.error('  ' + missing.join(', '))
    console.error('\nRun the DDL migration first — node scripts/applyBrandManagementMigration.js')
    console.error('(it prints the SQL to paste into the Supabase SQL editor), then re-run this seed.')
    process.exit(1)
  }

  const results = []
  for (const brand of BRANDS) {
    const r = await upsertBrand(brand)
    results.push(r)
    console.log(`${r.action === 'inserted' ? '✓ inserted' : '  updated'}  ${brand.name}`)
  }

  // Verify — expect exactly the five brands, ordered by display_order.
  const { data, error } = await supabase
    .from('brands')
    .select('name, slug, display_order, display_type, is_active, bulk_enabled')
    .order('display_order', { ascending: true })

  if (error) throw error
  console.log('\nBrands in storefront order:')
  data.forEach((b) =>
    console.log(
      `  ${b.display_order}. ${b.name} (${b.slug}) · ${b.display_type} · ${b.is_active ? 'active' : 'inactive'} · bulk=${b.bulk_enabled ? 'on' : 'off'}`,
    ),
  )
  console.log(`\nTotal brands: ${data.length} (expected 5)`)
}

main().catch((err) => {
  console.error('Unexpected error:', err.message)
  process.exit(1)
})
