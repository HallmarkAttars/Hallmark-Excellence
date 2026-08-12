// Applies server/db/migration_add_bulk_tiers.sql to the LIVE Supabase
// database using the service-role client, then verifies the column exists.
//
//   node scripts/applyBulkTiersMigration.js
//
// Idempotent — safe to re-run. Steps:
//   1. Probe the brands table for the `bulk_tiers` column.
//   2. If it already exists → done (nothing changes).
//   3. Otherwise try the exec_sql RPC (same mechanism as runMigration.js). If
//      that RPC does not exist on this project, it prints the exact SQL to
//      paste into the Supabase SQL editor instead — DDL cannot be sent through
//      PostgREST directly.
//   4. Re-verify.

require('dotenv').config()
const supabase = require('../src/config/supabase')

const MIGRATION_SQL = `alter table brands add column if not exists bulk_tiers jsonb;`

async function main() {
  // --- Preflight: does the column already exist? ---------------------------
  const { error } = await supabase.from('brands').select('bulk_tiers').limit(1)
  if (!error) {
    console.log('✓ The bulk_tiers column ALREADY exists on brands — nothing to do.')
    return
  }
  if (!/does not exist|could not find/i.test(error.message)) {
    console.error('✗ Preflight probe failed:', error.message)
    process.exit(1)
  }

  console.log('bulk_tiers missing — applying via exec_sql RPC…')

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
  const { error: after } = await supabase.from('brands').select('bulk_tiers').limit(1)
  if (after) {
    console.error(`✗ Migration ran but bulk_tiers still missing: ${after.message}`)
    process.exit(1)
  }

  console.log('✓ Migration applied — brands.bulk_tiers (jsonb) now exists.')
  console.log('\nNext: configure tiers from Admin → Bulk Pricing (the new tier editor),')
  console.log('      or seed demo tiers with node scripts/seedBrandBulkPricing.js')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
