// Applies server/db/migration_drop_stock_bulk_packs.sql to the LIVE Supabase
// database using the service-role client, then verifies the columns are gone.
//
//   node scripts/applyDropStockBulkPacksMigration.js
//
// Idempotent — safe to re-run. Steps:
//   1. Probe the products / product_variants tables for the old stock/bulk
//      columns and the product_packs table.
//   2. If none of them exist → done (nothing changes).
//   3. Otherwise try the exec_sql RPC (same mechanism as runMigration.js). If
//      that RPC does not exist on this project, it prints the exact SQL to
//      paste into the Supabase SQL editor instead — DDL cannot be sent through
//      PostgREST directly.
//   4. Re-verify and print the final state.
//
// Brand-level bulk columns (brands.bulk_enabled / standard_price /
// bulk_unit_price / bulk_min_qty) are NEVER touched by this script.

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const supabase = require('../src/config/supabase')

const PRODUCT_COLUMNS = ['stock', 'bulk_enabled', 'bulk_price', 'bulk_min_qty']
const VARIANT_COLUMNS = ['stock', 'bulk_enabled', 'bulk_price', 'bulk_min_qty']

const MIGRATION_SQL = fs.readFileSync(
  path.join(__dirname, '..', 'db', 'migration_drop_stock_bulk_packs.sql'),
  'utf8'
)

// Returns the subset of `columns` that still exist on `table`.
async function existingColumns(table, columns) {
  const present = []
  for (const col of columns) {
    const { error } = await supabase.from(table).select(col).limit(1)
    if (!error) present.push(col)
  }
  return present
}

async function main() {
  const prodPresent = await existingColumns('products', PRODUCT_COLUMNS)
  const varPresent = await existingColumns('product_variants', VARIANT_COLUMNS)

  const { error: packsError } = await supabase.from('product_packs').select('id').limit(1)
  const packsExist = !packsError

  console.log(
    `products:        ${prodPresent.length ? prodPresent.join(', ') : '(stock/bulk already gone)'}`
  )
  console.log(
    `product_variants:${varPresent.length ? varPresent.join(', ') : '(stock/bulk already gone)'}`
  )
  console.log(`product_packs:   ${packsExist ? 'still exists' : 'already gone'}`)

  if (prodPresent.length === 0 && varPresent.length === 0 && !packsExist) {
    console.log('✓ The drop migration is ALREADY applied — nothing to do.')
    return
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

  // Re-verify
  const prodAfter = await existingColumns('products', PRODUCT_COLUMNS)
  const varAfter = await existingColumns('product_variants', VARIANT_COLUMNS)
  const { error: packsAfterError } = await supabase.from('product_packs').select('id').limit(1)
  const packsStillExist = !packsAfterError

  if (prodAfter.length > 0 || varAfter.length > 0 || packsStillExist) {
    console.error(
      `✗ Migration ran but leftovers remain: products [${prodAfter.join(', ')}] variants [${varAfter.join(', ')}] packs=${packsStillExist}`
    )
    process.exit(1)
  }

  console.log('✓ Migration applied — stock/bulk columns and product_packs dropped.')
  console.log('  Brand-level bulk pricing (brands table) was NOT touched.')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
