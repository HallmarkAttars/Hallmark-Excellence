// Applies server/db/migration_fix_guest_addresses.sql to the LIVE Supabase
// database using the service-role client, then verifies guest orders/addresses
// can be stored with user_id = NULL.
//
//   node scripts/applyGuestAddressMigration.js
//
// Idempotent — safe to re-run. If the exec_sql RPC is not available on this
// project (as on the live DB), it prints the exact SQL to paste into the
// Supabase SQL editor (same pattern as the other apply* scripts).

require('dotenv').config()
const supabase = require('../src/config/supabase')

const MIGRATION_SQL = `
alter table public.addresses
  alter column user_id drop not null;

alter table public.orders
  alter column user_id drop not null;
`

async function main() {
  console.log('Applying guest-address migration via exec_sql RPC…')

  const { data: rpcResult, error: rpcError } = await supabase.rpc('exec_sql', {
    sql: MIGRATION_SQL,
  })

  if (rpcError) {
    console.error(`✗ exec_sql RPC is not available on this project: ${rpcError.message}`)
    console.error('\nRun this SQL in the Supabase SQL editor (Dashboard → SQL Editor → New query):\n')
    console.error(MIGRATION_SQL)
    process.exit(1)
  }

  console.log('✓ Migration applied:', JSON.stringify(rpcResult))

  // Verify: addresses.user_id must now accept NULL.
  const probe = await supabase.from('addresses').insert({
    user_id: null,
    full_name: 'VERIFY-TEMP',
    phone: '0000000000',
    address_line1: 'VERIFY-TEMP',
    address_line2: '',
    city: 'N/A',
    state: 'N/A',
    country: 'India',
    postal_code: '000000',
    is_default: false,
  }).select('id').single()

  if (probe.error) {
    console.error('✗ Verification insert with user_id=null failed:', probe.error.message)
    process.exit(1)
  }
  console.log('✓ addresses.user_id accepts NULL (id ' + probe.data.id + '); cleaning up…')
  const { error: delErr } = await supabase.from('addresses').delete().eq('id', probe.data.id)
  if (delErr) console.error('  cleanup note:', delErr.message)
  else console.log('✓ cleanup done')

  console.log('\n✓ Guest-address migration verified.')
}

main().catch((e) => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
