// Applies server/db/migration_add_brand_management.sql to the LIVE Supabase
// database using the service-role client, then verifies the columns exist.
//
//   node scripts/applyBrandManagementMigration.js
//
// Idempotent — safe to re-run. Same mechanism as applyBrandBulkMigration.js:
//   1. Probe the brands table for each new column.
//   2. If all exist → done (nothing changes).
//   3. Otherwise try the exec_sql RPC; if that RPC does not exist, print the
//      exact SQL to paste into the Supabase SQL editor (DDL cannot be sent
//      through PostgREST directly).
//   4. Re-verify and print the final column list.

require('dotenv').config()
const supabase = require('../src/config/supabase')

const BRAND_COLUMNS = [
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

const MIGRATION_SQL = `
alter table brands add column if not exists collection_label text;
alter table brands add column if not exists tagline text;
alter table brands add column if not exists description text;
alter table brands add column if not exists long_description text;
alter table brands add column if not exists logo_url text;
alter table brands add column if not exists cover_image_url text;
alter table brands add column if not exists card_image_url text;
alter table brands add column if not exists display_order int not null default 0;
alter table brands add column if not exists display_type text not null default 'standard';
alter table brands add column if not exists is_active boolean not null default true;`

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

  console.log(`Brands management columns found: ${present.length ? present.join(', ') : '(none)'}`)

  if (missing.length === 0) {
    console.log('✓ The brand management migration is ALREADY applied — nothing to do.')
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

  const after = await existingColumns()
  const stillMissing = BRAND_COLUMNS.filter((c) => !after.includes(c))
  if (stillMissing.length > 0) {
    console.error(`✗ Migration ran but columns still missing: ${stillMissing.join(', ')}`)
    process.exit(1)
  }

  console.log(`✓ Migration applied — brands now has: ${BRAND_COLUMNS.join(', ')}`)
  console.log('\nNext: seed the five brands with  node scripts/seedManageBrands.js')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
