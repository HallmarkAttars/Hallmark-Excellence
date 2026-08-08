// Creates the bulk-purchasing TEST PRODUCT directly in the database:
//
//   Name:       Bulk Test Attar
//   Category:   Attar · Brand: Arees  (so it shows on the Arees brand page)
//   Normal:     ₹100 / piece
//   Bulk:       ₹80 / piece
//   Bulk Qty:   100  (100+ pieces → ₹80)
//   Stock:      500  (must be ≥ bulk qty or the storefront can't unlock)
//   Variant:    1 PC, ₹100, stock 500, DEFAULT (bulk applies to default variant)
//
// Uses the service-role client (bypasses RLS) — same approach as createAdmin.js.
// Idempotent: if a product with this name already exists, it is left untouched.
//
// Run from server/:  node scripts/createBulkTestProduct.js
// Preflight: fails with a clear message if the bulk_enabled migration
// (server/db/migration_add_bulk_enabled.sql) has not been applied yet.

require('dotenv').config()
const supabase = require('../src/config/supabase')

const PRODUCT_NAME = 'Bulk Test Attar'
const PRODUCT_SLUG = 'bulk-test-attar'
const CATEGORY_SLUG = 'attar'
const BRAND_SLUG = 'arees'

const NORMAL_PRICE = 100
const BULK_PRICE = 80
const BULK_MIN_QTY = 100
const STOCK = 500

async function main() {
  // --- Preflight: the bulk_enabled columns must exist ---------------------
  const { error: colError } = await supabase
    .from('products')
    .select('bulk_enabled')
    .limit(1)
  if (colError && /does not exist|could not find/i.test(colError.message)) {
    console.error('✗ The products table has no bulk_enabled column yet.')
    console.error('  Run server/db/migration_add_bulk_enabled.sql in the Supabase SQL editor first:')
    console.error('    alter table products add column if not exists bulk_enabled boolean not null default false;')
    process.exit(1)
  }
  if (colError) {
    console.error('✗ Preflight query failed:', colError.message)
    process.exit(1)
  }

  // Per-variant bulk: the product_variants table must also carry the bulk
  // columns (migration_add_variant_bulk_fields.sql) — this script inserts the
  // variant's OWN bulk config, not the product-level one.
  const { error: varColError } = await supabase
    .from('product_variants')
    .select('bulk_enabled')
    .limit(1)
  if (varColError && /does not exist|could not find/i.test(varColError.message)) {
    console.error('✗ The product_variants table has no bulk_enabled column yet.')
    console.error('  Run server/db/migration_add_variant_bulk_fields.sql in the Supabase SQL editor first:')
    console.error('    alter table product_variants add column if not exists bulk_enabled boolean not null default false;')
    process.exit(1)
  }
  if (varColError) {
    console.error('✗ Preflight query failed:', varColError.message)
    process.exit(1)
  }

  // --- Idempotency: skip if the test product already exists ----------------
  const { data: existing } = await supabase
    .from('products')
    .select('id, name, bulk_enabled, bulk_price, bulk_min_qty, price')
    .eq('slug', PRODUCT_SLUG)
    .maybeSingle()
  if (existing) {
    console.log(`ℹ "${PRODUCT_NAME}" already exists (id ${existing.id}).`)
    console.log(`   price=${existing.price} · bulk_enabled=${existing.bulk_enabled} · bulk_price=${existing.bulk_price} · bulk_min_qty=${existing.bulk_min_qty}`)
    process.exit(0)
  }

  // --- Resolve category + brand ---------------------------------------------
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', CATEGORY_SLUG)
    .maybeSingle()
  if (!category) {
    console.error(`✗ Category "${CATEGORY_SLUG}" not found. Run server/db/seed.sql first (or create the category in the admin panel).`)
    process.exit(1)
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('slug', BRAND_SLUG)
    .maybeSingle()
  if (!brand) {
    console.error(`✗ Brand "${BRAND_SLUG}" not found. Run server/db/seed.sql first (or create the brand in the admin panel).`)
    process.exit(1)
  }

  // --- Insert the product ---------------------------------------------------
  const { data: product, error: productError } = await supabase
    .from('products')
    .insert({
      name: PRODUCT_NAME,
      slug: PRODUCT_SLUG,
      description: 'Test product for the optional Bulk Purchasing feature — Normal ₹100 · Bulk ₹80 at 100+ pieces.',
      price: NORMAL_PRICE,
      compare_at_price: null,
      bulk_enabled: true,
      bulk_price: BULK_PRICE,
      bulk_min_qty: BULK_MIN_QTY,
      rating: null,
      review_count: null,
      stock: STOCK,
      category_id: category.id,
      brand_id: brand.id,
      image: null,
      is_active: true,
      is_featured: false,
    })
    .select('*')
    .single()

  if (productError) {
    console.error('✗ Failed to create the product:', productError.message)
    process.exit(1)
  }

  // --- Insert the default variant (1 PC) — with ITS OWN bulk config --------
  // Per-variant bulk: the variant's own fields drive the storefront (bulk
  // pricing is no longer read from the product row when variants exist).
  const { error: variantError } = await supabase
    .from('product_variants')
    .insert({
      product_id: product.id,
      quantity_value: 1,
      quantity_unit: 'PC',
      display_label: '1 PC',
      price: NORMAL_PRICE,
      stock: STOCK,
      is_default: true,
      bulk_enabled: true,
      bulk_price: BULK_PRICE,
      bulk_min_qty: BULK_MIN_QTY,
    })

  if (variantError) {
    console.error('✗ Product created but the default variant failed:', variantError.message)
    process.exit(1)
  }

  console.log(`✓ Test product created (id ${product.id}).`)
  console.log('   Name:        Bulk Test Attar')
  console.log('   Category:    Attar · Brand: Arees')
  console.log(`   Normal:      ₹${NORMAL_PRICE} / piece`)
  console.log(`   Bulk:        ₹${BULK_PRICE} / piece at ${BULK_MIN_QTY}+ pieces`)
  console.log(`   Stock:       ${STOCK}`)
  console.log('   Variant:     1 PC (default) — bulk pricing applies to this size')
  console.log('\nVerify on the storefront:')
  console.log('  1. /brand/arees → the 🔥 BULK PURCHASE banner + bulk filter appear')
  console.log('  2. Product card shows "🔥 Bulk Price · ₹80 / piece · Buy 100+ pieces"')
  console.log('  3. Detail page: qty 99 → "Add 1 more" · qty 100 → "✓ Bulk Price Unlocked"')
  console.log('  4. Checkout at qty 100 charges 100 × ₹80 = ₹8,000')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
