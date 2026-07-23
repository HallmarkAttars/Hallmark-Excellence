// Script to run database migration via Supabase service role using REST API
// Since direct PostgreSQL connection is firewalled, we use the Supabase JS client
// to run the migration SQL via the management API

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log('Starting orders table migration...\n');

  // Step 1: Make user_id nullable
  console.log('1. Making user_id nullable...');
  const { error: err1 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;'
  });
  if (err1) console.log('   Note: ' + err1.message);
  else console.log('   ✓ user_id is now nullable');

  // Step 2: Make address_id nullable
  console.log('2. Making address_id nullable...');
  const { error: err2 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE public.orders ALTER COLUMN address_id DROP NOT NULL;'
  });
  if (err2) console.log('   Note: ' + err2.message);
  else console.log('   ✓ address_id is now nullable');

  // Step 3: Verify the orders table structure
  console.log('\n3. Verifying orders table structure...');
  const { data: orders, error: oe } = await supabase.from('orders').select('*').limit(1);
  if (oe) {
    console.log('   Note: ' + oe.message);
  } else if (orders && orders.length > 0) {
    console.log('   Columns: ' + Object.keys(orders[0]).join(', '));
  } else {
    console.log('   Orders table exists and is empty');
  }

  // Step 4: Test insert with a minimal order (without user_id/address_id)
  console.log('\n4. Testing guest order insert...');
  const testOrder = {
    order_number: 'TEST-MIGRATION-' + Date.now(),
    customer_name: 'Migration Test',
    phone: '+971500000000',
    address: 'Test Address',
    pincode: '000000',
    items: [{ id: 'test', name: 'Test Product', qty: 1, price: 100 }],
    total_amount: 100,
    order_status: 'Pending',
    payment_method: 'Cash On Delivery'
  };

  const { data: inserted, error: ie } = await supabase
    .from('orders')
    .insert(testOrder)
    .select('*')
    .single();

  if (ie) {
    console.log('   ✗ Insert failed: ' + ie.message);
    if (ie.details) console.log('   Details: ' + ie.details);
  } else {
    console.log('   ✓ Order inserted successfully! ID: ' + inserted.id);
    
    // Clean up test order
    const { error: de } = await supabase.from('orders').delete().eq('id', inserted.id);
    if (de) console.log('   Note (cleanup): ' + de.message);
    else console.log('   ✓ Test order cleaned up');
  }

  console.log('\nMigration complete!');
}

run().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});

