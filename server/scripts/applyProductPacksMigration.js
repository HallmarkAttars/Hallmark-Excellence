// Applies server/db/migration_add_product_packs.sql to the LIVE Supabase
// database using the service-role client, then verifies the table exists.
//
//   node scripts/applyProductPacksMigration.js
//
// Idempotent — safe to re-run. Steps:
//   1. Probe the product_packs table.
//   2. If it exists with all expected columns → done (nothing changes).
//   3. Otherwise try the exec_sql RPC (same mechanism as runMigration.js and
//      applyBrandBulkMigration.js). If that RPC does not exist on this
//      project, it prints the exact SQL to paste into the Supabase SQL editor
//      instead — DDL cannot be sent through PostgREST directly.
//   4. Re-verify and print the final state.

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const supabase = require('../src/config/supabase')

const REQUIRED = ['id', 'product_id', 'name', 'usage_label', 'pack_quantity', 'price', 'is_active', 'display_order', 'created_at', 'updated_at']

// The full migration SQL lives in server/db/migration_add_product_packs.sql —
// one file, so the SQL editor and this script can never drift apart.
const MIGRATION_SQL = fs.readFileSync(path.join(__dirname, '..', 'db', 'migration_add_product_packs.sql'), 'utf8')

// Which of the expected columns currently exist on the live table? Probes each
// column individually so an EMPTY table still reports correctly (deriving the
// columns from the first row would claim "missing" for a fresh, empty table).
async function existingColumns() {
  const present = []
  for (const col of REQUIRED) {
    const { error } = await supabase.from('product_packs').select(col).limit(1)
    if (!error) present.push(col)
  }
  return present
}

async function main() {
  const present = await existingColumns()
  const missing = REQUIRED.filter((c) => !present.includes(c))

  if (present.length > 0 && missing.length === 0) {
    const { count } = await supabase.from('product_packs').select('id', { count: 'exact', head: true })
    console.log(`✓ The product_packs migration is ALREADY applied — nothing to do. (row count: ${count ?? '?'})`)
    return
  }

  if (present.length === 0) {
    console.log('product_packs table does not exist yet (no expected columns found).')
  } else {
    console.log(`Table exists but missing columns: ${missing.join(', ')}`)
  }

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
  applied = true

  // Re-verify
  const after = await existingColumns()
  const stillMissing = REQUIRED.filter((c) => !after.includes(c))
  if (stillMissing.length > 0) {
    console.error(`✗ Migration ran but columns still missing: ${stillMissing.join(', ')}`)
    process.exit(1)
  }

  console.log('✓ Migration applied — product_packs table is live and readable.')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
