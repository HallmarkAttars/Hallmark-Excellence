require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  // Get products columns by trying to insert with all possible fields and seeing the error
  const { data: prods, error: pe } = await supabase.from('products').select('*').limit(1);
  if (pe) console.log('products error:', pe.message);
  else if (prods.length > 0) {
    console.log('Products columns:', Object.keys(prods[0]).join(', '));
  } else {
    // No products yet - try to get table info by querying a non-existent column
    console.log('Products table exists but is empty');
  }

  const { data: orders, error: oe } = await supabase.from('orders').select('*').limit(1);
  if (oe) console.log('orders error:', oe.message);
  else if (orders.length > 0) {
    console.log('Orders columns:', Object.keys(orders[0]).join(', '));
  } else {
    console.log('Orders table exists but is empty');
  }

  // Let's try to see what address_id references by getting an address
  const { data: addrs } = await supabase.from('addresses').select('*').limit(1);
  if (addrs) console.log('Addresses:', addrs.length > 0 ? Object.keys(addrs[0]).join(', ') : 'empty table');

  const { data: ctg } = await supabase.from('categories').select('*').limit(1);
  if (ctg && ctg.length > 0) console.log('Categories:', Object.keys(ctg[0]).join(', '));
}
run().catch(e => console.error(e.message));

