// Applies server/db/migration_add_display_order.sql to the LIVE Supabase
// database using the service-role client, then verifies the column exists.
//
//   node scripts/applyDisplayOrderMigration.js
//
// Idempotent — safe to re-run. Steps:
//   1. Probe the products table for the display_order column.
//   2. If it exists → done (nothing changes).
//   3. Otherwise try the exec_sql RPC (same mechanism as the other apply
//      scripts). If that RPC does not exist on this project, it prints the
//      exact SQL to paste into the Supabase SQL editor instead — DDL cannot
//      be sent through PostgREST directly.
//   4. Re-verify and print the final column list.

require('dotenv').config()
const supabase = require('../src/config/supabase')

const MIGRATION_SQL = `
alter table products add column if not exists display_order int not null default 0;
create index if not exists idx_products_display_order on products (display_order);`

async function main() {
  const { error } = await supabase.from('products').select('display_order').limit(1)

  if (!error) {
    console.log('✓ products.display_order ALREADY exists — nothing to do.')
    return
  }

  console.log('products.display_order missing — applying migration…')

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
  const { error: after } = await supabase.from('products').select('display_order').limit(1)
  if (after) {
    console.error(`✗ Migration ran but the column is still missing: ${after.message}`)
    process.exit(1)
  }

  console.log('✓ Migration applied — products now has a display_order column.')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
