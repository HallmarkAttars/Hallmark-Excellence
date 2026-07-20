require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  // Check orders - try to get a sample row
  const { data: orders, error: oe } = await supabase.from('orders').select('*').limit(5);
  if (oe) console.log('orders error:', oe.message);
  else {
    console.log('Orders columns:', Object.keys(orders[0] || {}).join(', '));
    console.log('Sample order:', JSON.stringify(orders[0], null, 2));
  }

  // Check products - sample row
  const { data: prods, error: pe } = await supabase.from('products').select('*').limit(5);
  if (pe) console.log('products error:', pe.message);
  else {
    console.log('\nProducts columns:', Object.keys(prods[0] || {}).join(', '));
    console.log('Sample product:', JSON.stringify(prods[0], null, 2));
  }

  // Check categories
  const { data: cats, error: ce } = await supabase.from('categories').select('*').limit(5);
  if (ce) console.log('categories error:', ce.message);
  else {
    console.log('\nCategories columns:', Object.keys(cats[0] || {}).join(', '));
  }

  // Check brands
  const { data: brands, error: be } = await supabase.from('brands').select('*').limit(5);
  if (be) console.log('brands error:', be.message);
  else {
    console.log('\nBrands columns:', Object.keys(brands[0] || {}).join(', '));
  }
}
run().catch(e => console.error(e.message));

