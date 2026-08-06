// TEMPORARY diagnostic — map the allowed values of orders_order_status_check.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const candidates = [
  'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled',
  'pending', 'processing', 'shipped', 'delivered', 'cancelled',
  'Completed', 'In Progress', 'On Hold', 'Refunded', 'Failed', 'Returned',
];

async function run() {
  const { data: tmp, error: ie } = await supabase
    .from('orders')
    .insert({
      order_number: 'ORD-CONSTRAINT-PROBE-' + Date.now(),
      user_id: 'a422c5dd-9b57-4fda-88a1-49c784002b7f',
      address_id: '16ab13d1-bc41-41b0-9b92-02e356c3be16',
      subtotal: 1,
      total: 1,
      payment_method: 'Cash On Delivery',
      payment_status: 'Pending',
      order_status: 'Pending',
      notes: JSON.stringify({ customer_name: 'Probe', items: [] }),
    })
    .select('id')
    .single();
  if (ie) { console.log('tmp insert error:', ie.message); return; }
  const id = tmp.id;

  for (const c of candidates) {
    const { error } = await supabase.from('orders').update({ order_status: c }).eq('id', id);
    console.log(error ? `REJECTED: ${c}` : `ALLOWED : ${c}`);
  }

  await supabase.from('orders').delete().eq('id', id);
  console.log('temp order deleted');
}
run().catch((e) => console.error('Fatal:', e.message));
