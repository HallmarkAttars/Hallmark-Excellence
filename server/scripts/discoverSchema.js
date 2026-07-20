require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  // Discover products columns by trying to insert a minimal row
  const { data: pd, error: pe } = await supabase.from('products').insert({
    name: 'test', slug: 'test', price: 10
  }).select('*').single();
  if (pe) {
    console.log('products insert error:', pe.message);
    if (pe.details) {
      const match = pe.details.match(/Failing row contains \((.*)\)\./);
      if (match) {
        console.log('Row values:', match[1]);
      }
    }
  } else {
    console.log('Created product:', JSON.stringify(pd, null, 2));
  }

  // Discover orders columns
  const { data: od, error: oe } = await supabase.from('orders').insert({
    user_id: 'a422c5dd-9b57-4fda-88a1-49c784002b7f',
    order_number: 'ORD-SCHEMA-TEST',
    order_status: 'pending',
    subtotal: 100,
    total: 100
  }).select('*').single();
  if (oe) {
    console.log('\norders insert error:', oe.message);
    if (oe.details) {
      const match = oe.details.match(/Failing row contains \((.*)\)\./);
      if (match) console.log('Row values:', match[1]);
    }
  } else {
    console.log('\nCreated order:', JSON.stringify(od, null, 2));
  }
}
run().catch(e => console.error(e.message));

