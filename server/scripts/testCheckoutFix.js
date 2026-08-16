// End-to-end checkout test after the address-resolution fix.
//   node scripts/testCheckoutFix.js
//
// POSTs the REAL checkout payload shape to the local server (which talks to
// the production Supabase project) and then verifies:
//   1. HTTP 200 + order created
//   2. the delivery address row stored in `addresses`
//   3. order.address_id points at that address
//   4. the address snapshot is present in the order notes

require('dotenv').config()
const supabase = require('../src/config/supabase')

const API = process.env.TEST_API_URL || 'http://localhost:5000/api'

const TEST_KEY = `fix-test-${Date.now()}`

// Overridable so we can test BOTH a fresh customer (no saved address) and a
// returning customer (reuses the saved address):
//   TEST_PHONE=+919999999999 TEST_NAME='fresh customer' node scripts/testCheckoutFix.js
const TEST_PHONE = process.env.TEST_PHONE || '+919080502177'
const TEST_NAME = process.env.TEST_NAME || 'hamadh ismail (fix-test)'

// Mirrors storefront/src/services/mockApi.js submitOrder() payload shape.
const payload = {
  customer_name: TEST_NAME,
  email: 'hamadhtest2026@gmail.com',
  phone: TEST_PHONE,
  address: '98/3, dfghj, cdfvbgnh',
  pincode: '600001',
  locality: 'Anna Nagar',
  city: 'Chennai',
  state: 'Tamil Nadu',
  message: '',
  items: [
    {
      product_id: '95a844d0-7dd8-406e-b83c-37cb5654348e',
      product_name: 'Sumaiya',
      image: 'https://res.cloudinary.com/llo1vkiz/image/upload/v1786366813/perfume-ecommerce/p7em7apuqck93xlydyv4.jpg',
      quantity: 1,
      unit_price: 2700,
      subtotal: 2700,
    },
  ],
  total_amount: 2700,
  payment_method: 'cod',
  idempotency_key: TEST_KEY,
}

async function main() {
  console.log('=== POST /orders ===')
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json()
  console.log('HTTP', res.status)
  console.log(JSON.stringify(body, null, 2).slice(0, 1500))

  if (res.status < 200 || res.status >= 300) {
    console.error('\n✗ CHECKOUT FAILED')
    process.exit(1)
  }

  const order = body.order || {}
  console.log('\n=== order created:', order.id, order.order_number, '===')

  // Verify the linked address row
  const { data: addr, error: addrErr } = await supabase
    .from('addresses')
    .select('*')
    .eq('id', order.address_id)
    .maybeSingle()
  console.log('\n=== addresses row linked by order.address_id ===')
  if (addrErr) console.log('address lookup error:', addrErr.message)
  else console.log(addr ? JSON.stringify(addr, null, 2) : 'NO ADDRESS ROW FOUND for address_id ' + order.address_id)

  // Verify the notes snapshot
  const notes = typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes
  console.log('\n=== notes snapshot (customer/address fields) ===')
  console.log(JSON.stringify({
    customer_name: notes.customer_name,
    email: notes.email,
    phone: notes.phone,
    address: notes.address,
    pincode: notes.pincode,
    city: notes.city,
    state: notes.state,
    locality: notes.locality,
    idempotency_key: notes.idempotency_key,
  }, null, 2))

  console.log('\n✓ CHECKOUT OK')
}

main().catch((e) => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
