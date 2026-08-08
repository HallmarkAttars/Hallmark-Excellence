// Applies server/db/migration_add_brand_bulk_pricing.sql to the LIVE Supabase
// database using the service-role client, then verifies the columns exist.
//
//   node scripts/applyBrandBulkMigration.js
//
// Idempotent — safe to re-run. Steps:
//   1. Probe the brands table for the four columns (bulk_enabled,
//      standard_price, bulk_unit_price, bulk_min_qty).
//   2. If all already exist → done (nothing changes).
//   3. Otherwise try the exec_sql RPC (same mechanism as runMigration.js). If
//      that RPC does not exist on this project, it prints the exact SQL to
//      paste into the Supabase SQL editor instead — DDL cannot be sent through
//      PostgREST directly.
//   4. Re-verify and print the final column list.

require('dotenv').config()
const supabase = require('../src/config/supabase')

const BRAND_COLUMNS = ['bulk_enabled', 'standard_price', 'bulk_unit_price', 'bulk_min_qty']

const MIGRATION_SQL = `\
alter table brands add column if not exists bulk_enabled boolean not null default false;
alter table brands add column if not exists standard_price numeric(10,2);
alter table brands add column if not exists bulk_unit_price numeric(10,2);
alter table brands add column if not exists bulk_min_qty int;`

// Which of the columns currently exist on the live brands table?
// (Probes each column individually so an empty brands table still reports
// correctly — the same approach createBulkTestProduct.js uses.)
async function existingColumns() {
  const present = []
  for (const col of BRAND_COLUMNS) {
    const { error } = await supabase.from('brands').select(col).limit(1)
    if (!error) present.push(col)
  }
  return present
}

async function main() {
  const present = await existingColumns()
  const missing = BRAND_COLUMNS.filter((c) => !present.includes(c))

  console.log(`Brands columns found: ${present.length ? present.join(', ') : '(none of the bulk fields)'}`)

  if (missing.length === 0) {
    console.log('✓ The combined brand bulk pricing migration is ALREADY applied — nothing to do.')
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
    console.error('\nThen re-run this script to verify.')
    process.exit(1)
  }

  console.log('  exec_sql OK:', JSON.stringify(rpcResult))

  // Re-verify
  const after = await existingColumns()
  const stillMissing = BRAND_COLUMNS.filter((c) => !after.includes(c))
  if (stillMissing.length > 0) {
    console.error(`✗ Migration ran but columns still missing: ${stillMissing.join(', ')}`)
    process.exit(1)
  }

  console.log(`✓ Migration applied — brands now has: ${BRAND_COLUMNS.join(', ')}`)
  console.log('\nNext: seed the demo values with  node scripts/seedBrandBulkPricing.js')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
