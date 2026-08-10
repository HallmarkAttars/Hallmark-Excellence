// Applies server/db/migration_add_variant_total_pricing.sql to the LIVE
// Supabase database using the service-role client, then verifies the columns
// exist.
//
//   node scripts/applyVariantTotalPricingMigration.js
//
// Idempotent — safe to re-run. Steps:
//   1. Probe the product_variants table for total_price / price_per_unit.
//   2. If both exist → done (nothing changes).
//   3. Otherwise try the exec_sql RPC (same mechanism as runMigration.js). If
//      that RPC does not exist on this project, it prints the exact SQL to
//      paste into the Supabase SQL editor instead.
//   4. Re-verify and print the final column list.
//
// The migration is SAFE: it only ADDS two nullable numeric columns and
// backfills them from the existing `price` column (which is never dropped).
// No deletions, no data loss, no ID changes.

require('dotenv').config()
const supabase = require('../src/config/supabase')

const VARIANT_COLUMNS = ['total_price', 'price_per_unit']

const MIGRATION_SQL = `\
alter table product_variants add column if not exists total_price numeric(10,2);
alter table product_variants add column if not exists price_per_unit numeric(10,2);

update product_variants
set total_price = price
where total_price is null and price is not null;

update product_variants
set price_per_unit = price
where price_per_unit is null and price is not null;`

// Which of the columns currently exist on the live product_variants table?
// (Probes each column individually so an empty table still reports correctly.)
async function existingColumns() {
  const present = []
  for (const col of VARIANT_COLUMNS) {
    const { error } = await supabase.from('product_variants').select(col).limit(1)
    if (!error) present.push(col)
  }
  return present
}

async function main() {
  const present = await existingColumns()
  const missing = VARIANT_COLUMNS.filter((c) => !present.includes(c))

  console.log(`product_variants columns found: ${present.length ? present.join(', ') : '(none of the total-pricing fields)'}`)

  if (missing.length === 0) {
    console.log('✓ The variant total-pricing migration is ALREADY applied — nothing to do.')
    return
  }

  console.log(`Missing: ${missing.join(', ')}`)
  console.log('\nApplying via exec_sql RPC…')

  const { data: rpcResult, error: rpcError } = await supabase.rpc('exec_sql', {
    sql: MIGRATION_SQL,
  })

  if (rpcError) {
    console.error(`✗ exec_sql RPC is not available on this project: ${rpcError.message}`)
    console.error('\nRun this SQL in the Supabase SQL editor (Dashboard → SQL Editor → New query):\n')
    console.error(MIGRATION_SQL)
    process.exit(1)
  }

  console.log('✓ exec_sql returned:', JSON.stringify(rpcResult))

  // Re-verify
  const after = await existingColumns()
  const stillMissing = VARIANT_COLUMNS.filter((c) => !after.includes(c))
  if (stillMissing.length === 0) {
    console.log('\n✓ Migration verified — total_price and price_per_unit now exist on product_variants.')
  } else {
    console.error(`\n✗ Still missing after exec_sql: ${stillMissing.join(', ')}. Run the SQL above manually in the Supabase SQL editor.`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
