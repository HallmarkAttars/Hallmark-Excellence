// Configures the COMBINED BRAND BULK PRICING demo on the AREES and DAHAB
// brands directly in the database:
//
//   AREES   · standard ₹2,500 · bulk ₹2,000/piece · unlocks at 91+ combined pieces
//   DAHAB   · standard ₹2,300 · bulk ₹1,850/piece · unlocks at 91+ combined pieces
//
// "91 pieces" is the COMBINED quantity across ANY mix of that brand's items in
// one cart — NOT per product, and NOT touching the per-product bulk columns on
// the products table. This seeds the separate brand-level feature.
//
// Uses the service-role client (bypasses RLS) — same approach as createAdmin.js
// and createBulkTestProduct.js. Idempotent: re-running just re-applies the same
// values; use the --disable flag to turn the demo off again.
//
// Run from server/:
//   node scripts/seedBrandBulkPricing.js            # apply demo config
//   node scripts/seedBrandBulkPricing.js --disable  # turn it off / clear values
//
// Preflight: fails with a clear message if the brand bulk columns
// (server/db/migration_add_brand_bulk_pricing.sql) have not been applied yet.
//
// All values can be overridden via .env / environment variables.

require('dotenv').config()
const supabase = require('../src/config/supabase')

const BRAND_BULK_MIN_QTY = Number(process.env.BRAND_BULK_MIN_QTY) || 91

const BRANDS = [
  {
    slug: 'arees',
    standardPrice: Number(process.env.AREES_STANDARD_PRICE) || 2500,
    bulkUnitPrice: Number(process.env.AREES_BULK_PRICE) || 2000,
  },
  {
    slug: 'dahab',
    standardPrice: Number(process.env.DAHAB_STANDARD_PRICE) || 2300,
    bulkUnitPrice: Number(process.env.DAHAB_BULK_PRICE) || 1850,
  },
]

async function main() {
  const disable = process.argv.includes('--disable')

  // --- Preflight: the brand bulk columns must exist -------------------------
  const { error: colError } = await supabase
    .from('brands')
    .select('bulk_enabled')
    .limit(1)
  if (colError && /does not exist|could not find/i.test(colError.message)) {
    console.error('✗ The brands table has no bulk_enabled column yet.')
    console.error('  Run server/db/migration_add_brand_bulk_pricing.sql (or seed_brand_bulk_pricing.sql) in the Supabase SQL editor first.')
    process.exit(1)
  }
  if (colError) {
    console.error('✗ Preflight query failed:', colError.message)
    process.exit(1)
  }

  // --- Validate config -------------------------------------------------------
  for (const brand of BRANDS) {
    if (!Number.isFinite(brand.standardPrice) || brand.standardPrice <= 0) {
      console.error(`✗ Invalid standard price for ${brand.slug}: ${brand.standardPrice}`)
      process.exit(1)
    }
    if (!Number.isFinite(brand.bulkUnitPrice) || brand.bulkUnitPrice <= 0 || brand.bulkUnitPrice >= brand.standardPrice) {
      console.error(`✗ Invalid bulk unit price for ${brand.slug}: must be > 0 and below the standard price (${brand.standardPrice}).`)
      process.exit(1)
    }
  }
  if (!Number.isInteger(BRAND_BULK_MIN_QTY) || BRAND_BULK_MIN_QTY < 2) {
    console.error(`✗ Invalid combined quantity threshold: ${BRAND_BULK_MIN_QTY} (must be a whole number > 1).`)
    process.exit(1)
  }

  if (disable) {
    console.log('Disabling combined brand bulk pricing for AREES & DAHAB…\n')
  } else {
    console.log('Seeding combined brand bulk pricing (91+ combined pieces unlocks):\n')
  }

  for (const brand of BRANDS) {
    const { data: existing, error: findError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('slug', brand.slug)
      .maybeSingle()

    if (findError) {
      console.error(`✗ Failed to look up brand "${brand.slug}":`, findError.message)
      process.exit(1)
    }
    if (!existing) {
      console.error(`✗ Brand "${brand.slug}" not found. Run server/db/seed.sql first (or create the brand in the admin panel).`)
      process.exit(1)
    }

    const updates = disable
      ? { bulk_enabled: false, standard_price: null, bulk_unit_price: null, bulk_min_qty: null }
      : {
          bulk_enabled: true,
          standard_price: brand.standardPrice,
          bulk_unit_price: brand.bulkUnitPrice,
          bulk_min_qty: BRAND_BULK_MIN_QTY,
        }

    const { error: updateError } = await supabase
      .from('brands')
      .update(updates)
      .eq('slug', brand.slug)

    if (updateError) {
      console.error(`✗ Failed to update brand "${brand.slug}":`, updateError.message)
      process.exit(1)
    }

    if (disable) {
      console.log(`  ✓ ${existing.name} — bulk pricing OFF (values cleared)`)
    } else {
      console.log(`  ✓ ${existing.name} — standard ₹${brand.standardPrice.toLocaleString('en-IN')} · bulk ₹${brand.bulkUnitPrice.toLocaleString('en-IN')}/piece at ${BRAND_BULK_MIN_QTY}+ pieces`)
    }
  }

  console.log('\nVerify on the storefront:')
  console.log('  1. /brand/arees and /brand/dahab → "{BRAND} · BULK PRICING" pricing-table card appears')
  console.log('  2. Product detail of any brand item → "Buy 91+ pieces of any {BRAND} item for ₹X/piece"')
  console.log('  3. Cart: mix & match 91+ pieces of that brand → brand banner turns active and every line is charged at the bulk unit price')
  console.log('  4. Checkout totals match the cart (server recomputes from the DB)')
  if (!disable) {
    console.log('\nNote: the discount applies per line only when the brand bulk price is below that item\'s own normal price.')
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
