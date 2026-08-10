// Applies server/db/migration_add_payment_methods.sql to the LIVE Supabase
// database using the service-role client, then verifies both payment methods
// can be stored on the orders table.
//
//   node scripts/applyPaymentMethodsMigration.js
//
// Idempotent — safe to re-run. Steps:
//   1. Try the exec_sql RPC (same mechanism as runMigration.js). If that RPC
//      does not exist on this project, it prints the exact SQL to paste into
//      the Supabase SQL editor instead (same pattern as the variant migration).
//   2. Verifies the new constraint accepts 'Cash on Delivery' and
//      'UPI / Online Payment' (with the legacy 'Cash On Delivery' still valid).
//   3. Cleans up the temporary verification rows.
//
// The migration is SAFE: it only REPLACES the orders_payment_method_check
// constraint, keeping the legacy 'Cash On Delivery' value valid and adding the
// two customer-selectable labels. No deletions, no data loss.

require('dotenv').config()
const supabase = require('../src/config/supabase')

const MIGRATION_SQL = `
alter table public.orders drop constraint if exists orders_payment_method_check;

alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in (
    'Cash On Delivery',
    'Cash on Delivery',
    'UPI / Online Payment',
    'cod',
    'upi'
  ));`

const VERIFY_LABELS = ['Cash On Delivery', 'Cash on Delivery', 'UPI / Online Payment']

async function main() {
  console.log('Applying payment-methods migration via exec_sql RPC…')

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

  // Verify each label can be stored (legacy + both new labels), then clean up.
  const uid = process.env.ADMIN_USER_ID || 'a422c5dd-9b57-4fda-88a1-49c784002b7f'
  const { data: addr } = await supabase
    .from('addresses').select('id').eq('user_id', uid).limit(1).maybeSingle()

  for (const label of VERIFY_LABELS) {
    const { data, error } = await supabase.from('orders').insert({
      order_number: `PMMIG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: uid,
      address_id: addr?.data?.id ?? null,
      subtotal: 1,
      shipping_charge: 0,
      discount: 0,
      total: 1,
      payment_method: label,
      payment_status: 'Pending',
      order_status: 'Pending',
      notes: '{}',
    }).select('id').single()

    if (error) {
      console.error(`✗ Storing "${label}" FAILED: ${error.message}`)
      process.exit(1)
    }
    console.log(`✓ "${label}" stored successfully`)
    await supabase.from('orders').delete().eq('id', data.id)
  }

  console.log('\n✓ Payment-methods migration verified — all three labels are accepted.')
}

main().catch((e) => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
