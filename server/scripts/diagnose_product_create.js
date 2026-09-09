require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log('=== Step 1: Discover products table NOT NULL constraints ===');
  const { data: columns, error: colErr } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name, is_nullable, column_default, data_type
      FROM information_schema.columns
      WHERE table_name = 'products' AND table_schema = 'public'
      ORDER BY ordinal_position
    `
  });

  // If exec_sql isn't available, try a raw approach
  if (colErr) {
    console.log('RPC not available, using direct approach...');
  } else {
    console.log('Products columns:', columns);
  }

  console.log('\n=== Step 2: Try minimal product insert ===');
  const { data: prod, error: prodErr } = await supabase
    .from('products')
    .insert({
      name: 'Diagnostic Test Product',
      slug: 'diagnostic-test-product',
      description: 'Test description',
      price: 0,
      image: null,
      is_active: true,
      is_featured: false,
      display_order: 99999,
    })
    .select('id')
    .single();

  if (prodErr) {
    console.log('INSERT FAILED:', JSON.stringify(prodErr, null, 2));
    console.log('Error code:', prodErr.code);
    console.log('Error message:', prodErr.message);
    console.log('Error details:', prodErr.details);
    console.log('Error hint:', prodErr.hint);
  } else {
    console.log('INSERT SUCCEEDED! Product ID:', prod.id);
    // Clean up
    await supabase.from('products').delete().eq('id', prod.id);
    console.log('Cleaned up test product.');
  }

  console.log('\n=== Step 3: Check product_variants table schema ===');
  const { data: varCols, error: varErr } = await supabase
    .from('product_variants')
    .select('*')
    .limit(1);

  if (varErr) {
    console.log('product_variants select error:', JSON.stringify(varErr, null, 2));
  } else {
    console.log('product_variants columns:', varCols.length > 0 ? Object.keys(varCols[0]) : 'empty table');
  }

  console.log('\n=== Step 4: Try product_variants insert ===');
  if (prod && prod.id) {
    // This shouldn't happen since we deleted it, but just in case
  }

  // Create a temp product for variant test
  const { data: tempProd, error: tempErr } = await supabase
    .from('products')
    .insert({ name: 'Temp Variant Test', price: 0 })
    .select('id')
    .single();

  if (tempErr) {
    console.log('Temp product insert failed:', JSON.stringify(tempErr, null, 2));
    return;
  }

  console.log('Temp product created:', tempProd.id);

  const { data: varIns, error: varInsErr } = await supabase
    .from('product_variants')
    .insert({
      product_id: tempProd.id,
      quantity_value: 100,
      quantity_unit: 'ML',
      display_label: '100 ML',
      price: 1000,
      total_price: 1000,
      price_per_unit: 10,
      is_default: true,
    })
    .select('id')
    .single();

  if (varInsErr) {
    console.log('Variant insert FAILED:', JSON.stringify(varInsErr, null, 2));
  } else {
    console.log('Variant insert SUCCEEDED!');
  }

  // Clean up
  await supabase.from('product_variants').delete().eq('product_id', tempProd.id);
  await supabase.from('products').delete().eq('id', tempProd.id);
  console.log('Cleaned up temp records.');
}

run().catch(e => console.error('FATAL:', e));
