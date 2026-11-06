// Offline conversation tests for the WhatsApp bot state machine — no network,
// no env credentials. io stubs simulate the shop; assertions check the exact
// contract the owner signed off (UPI payment details + confirm-the-order ask).

import { describe, it, expect, beforeEach } from 'vitest'
import { handleInput, handleWithStatusSweep, statusSweep, payTextMessage, UPI_ID } from './_bot.js'

const CATS = [
  { id: 'cat-1', name: 'Roll on Attars', count: 3 },
  { id: 'cat-2', name: 'Fragrance Oil', count: 2 },
  { id: 'cat-3', name: 'Bakhoor', count: 1 },
]

const PRODUCTS = (catId) => {
  if (catId === 'cat-1') {
    return {
      catId,
      list: Array.from({ length: 12 }, (_, i) => ({
        id: `p-${catId}-${i + 1}`,
        name: `Test Attar ${i + 1}`,
        displayPrice: 150 + i,
        unitLabel: i % 2 ? '12ml (6 pcs)' : '6ml (6 pcs)',
        variants:
          i === 0
            ? [
                { id: 'v-1a', display_label: '6ml (6 pcs)', quantity_value: 1, quantity_unit: 'Pieces', price: 150, total_price: 150, price_per_unit: 150, is_default: true, stock: 4 },
                { id: 'v-1b', display_label: '12ml (6 pcs)', quantity_value: 2, quantity_unit: 'Pieces', price: 280, total_price: 280, price_per_unit: 280, is_default: false, stock: 2 },
              ]
            : [],
      })),
    }
  }
  if (catId === 'cat-2') {
    return {
      catId,
      list: [{ id: 'p-oil-1', name: 'Musk Oil 100g', displayPrice: 500, unitLabel: '', variants: [] }],
    }
  }
  return { catId, list: [{ id: 'p-bak-1', name: 'Bakhoor Chips', displayPrice: 350, unitLabel: '100g pack', variants: [] }] }
}

let catalog
function stubIo(overrides = {}) {
  const calls = { postOrder: [], trackOrder: [] }
  const io = {
    getShopCategories: async () => catalog.categories,
    categoryProducts: async (cat) => {
      const bucket = catalog.products[cat.id]
      if (!bucket) throw new Error('catalog_fetch_failed')
      return bucket.list
    },
    postOrder: async (payload) => {
      calls.postOrder.push(payload)
      return { order: { order_number: '0123' } }
    },
    trackOrder: async (q) => {
      calls.trackOrder.push(q)
      // Status-sweep tests override the ledger via catalog.track.
      return catalog.track || [
        { order_number: '0123', order_status: 'Processing', total: 150, payment_status: 'Unpaid' },
        { order_number: '0118', order_status: 'Shipped', total: 900, payment_status: 'Paid' },
      ]
    },
    getQrImage: async () => catalog.qrImage ?? null,
    ...overrides,
    calls,
  }
  return io
}

let io
let session

describe('wa bot — menu & navigation', () => {
  beforeEach(() => {
    catalog = { categories: CATS, products: {}, qrImage: null }
    for (const c of CATS) catalog.products[c.id] = PRODUCTS(c.id)
    io = stubIo()
    session = undefined
  })

  it('greeting text shows the main menu (4 rows)', async () => {
    const r = await handleInput({ kind: 'text', text: 'hi', from: '919840750467' }, session, { io })
    expect(r.session.state).toBe('menu')
    const list = r.actions.find((a) => a.type === 'list')
    expect(list.rows.map((x) => x.title)).toEqual([
      '1. Order products',
      '2. Track my order',
      '3. Shop info',
      '4. Talk to a person',
    ])
    session = r.session
  })

  it('menu → browse → product list page with pagination', async () => {
    session = (await handleInput({ kind: 'text', text: 'hi', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'm:order', from: '919840750467' }, session, { io })).session
    expect(session.state).toBe('browse')
    const r3 = await handleInput({ kind: 'interactive', customId: `c:cat-1`, from: '919840750467' }, session, { io })
    session = r3.session
    expect(session.state).toBe('products')
    const list = r3.actions.find((a) => a.type === 'list')
    expect(list.rows).toHaveLength(10) // 9 products + "Next page" = WhatsApp's 10-row cap
    expect(list.rows.at(-1).title).toBe('Next page ›')
    expect(list.rows.at(-2).title).toBe('Test Attar 9')
    // every row title stays within WhatsApp's 24-char list limit
    for (const row of list.rows) expect(row.title.length).toBeLessThanOrEqual(24)
  })

  it('next page reveals remaining products', async () => {
    session = (await handleInput({ kind: 'text', text: 'hi', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'm:order', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'c:cat-1', from: '919840750467' }, session, { io })).session
    const r3 = await handleInput({ kind: 'interactive', customId: 'pg:1', from: '919840750467' }, session, { io })
    session = r3.session
    const list = r3.actions.find((a) => a.type === 'list')
    expect(list.rows.map((x) => x.title)).toEqual(['Test Attar 10', 'Test Attar 11', 'Test Attar 12'])
  })

  it('product without variants adds directly to the cart', async () => {
    session = (await handleInput({ kind: 'text', text: 'hi', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'm:order', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'c:cat-2', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'p:p-oil-1', from: '919840750467' }, session, { io })).session
    expect(session.state).toBe('cart')
    expect(session.cart).toHaveLength(1)
    expect(session.cart[0].subtotal).toBe(500)
  })
})

describe('wa bot — cart, UPI checkout, order confirmation', () => {
  beforeEach(async () => {
    catalog = { categories: CATS, products: {}, qrImage: 'https://www.areesperfumes.in/upi-qr.jpeg' }
    for (const c of CATS) catalog.products[c.id] = PRODUCTS(c.id)
    io = stubIo()
    session = (await handleInput({ kind: 'text', text: 'hi', from: '919840750467' }, undefined, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'm:order', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'c:cat-1', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'p:p-cat-1-1', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'v:v-1a', from: '919840750467' }, session, { io })).session
  })

  it('cart line uses variant total price × quantity', () => {
    expect(session.cart[0]).toMatchObject({
      name: 'Test Attar 1',
      variantId: 'v-1a',
      quantity: 1,
      unitPrice: 150,
      subtotal: 150,
      totalPieces: 1,
    })
  })

  it('adding the same variant again increases quantity', async () => {
    session = (await handleInput({ kind: 'interactive', customId: 'c:more', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'c:cat-1', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'p:p-cat-1-1', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 'v:v-1a', from: '919840750467' }, session, { io })).session
    expect(session.cart[0].quantity).toBe(2)
    expect(session.cart[0].subtotal).toBe(300)
  })

  it('remove-item flow empties the cart', async () => {
    session = (await handleInput({ kind: 'interactive', customId: 'c:remove', from: '919840750467' }, session, { io })).session
    expect(session.state).toBe('remove')
    const r = await handleInput({ kind: 'interactive', customId: 'r:0', from: '919840750467' }, session, { io })
    expect(r.session.cart).toHaveLength(0)
    expect(r.session.state).toBe('menu')
  })

  it('checkout collects name → address → pincode → city → email → review', async () => {
    session = (await handleInput({ kind: 'interactive', customId: 'c:checkout', from: '919840750467' }, session, { io })).session
    expect(session.state).toBe('chk_name')
    session = (await handleInput({ kind: 'text', text: 'Ahmed Khan', from: '919840750467' }, session, { io })).session
    expect(session.state).toBe('chk_addr')
    session = (await handleInput({ kind: 'text', text: '12/A, Sowcarpet, near Metro', from: '919840750467' }, session, { io })).session
    expect(session.checkout.address).toBe('12/A, Sowcarpet, near Metro')
    session = (await handleInput({ kind: 'text', text: '600001', from: '919840750467' }, session, { io })).session
    expect(session.checkout.pincode).toBe('600001')
    session = (await handleInput({ kind: 'text', text: 'Chennai', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'text', text: 'skip', from: '919840750467' }, session, { io })).session
    expect(session.state).toBe('review')
    expect(session.checkout.email).toBe(UPI_ID ? 'orders@areesperfumes.in' : '')
    const rv = await handleInput({ kind: 'interactive', customId: '', text: '', from: '919840750467' }, session, { io })
    const review = rv.actions.find((a) => a.type === 'buttons')
    expect(review.body).toContain('Ahmed Khan')
  })

  it('bad PIN keeps prompting on the same step', async () => {
    session = (await handleInput({ kind: 'interactive', customId: 'c:checkout', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'text', text: 'Ahmed Khan', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'text', text: '12/A, Sowcarpet, near Metro', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'text', text: '12a', from: '919840750467' }, session, { io })).session
    expect(session.state).toBe('chk_pin')
    expect(session.checkout.address).toBeDefined()
    expect(session.checkout.pincode).toBeUndefined()
  })

  it('review → sends QR image + UPI ID + asks to confirm the order', async () => {
    session = (await runCheckout(session)).session
    const r = await handleInput({ kind: 'interactive', customId: 'k:pay', from: '919840750467' }, session, { io })
    session = r.session
    expect(session.state).toBe('confirm_pay')
    const image = r.actions.find((a) => a.type === 'image')
    expect(image.url).toBe('https://www.areesperfumes.in/upi-qr.jpeg')
    const pay = r.actions.find((a) => a.type === 'text')
    expect(pay.text).toContain('qr.hikmaex@sib')
    expect(pay.text).toContain('₹150')
    const confirm = r.actions.find((a) => a.type === 'buttons')
    expect(confirm.body).toBe('Can I confirm your order?')
    expect(confirm.buttons.map((b) => b.title)).toEqual(['Yes, confirm', 'No, cancel'])
  })

  it('confirm places the order exactly like the storefront checkout contract', async () => {
    const { session: reviewed } = await runCheckout(session)
    const r = await handleInput({ kind: 'interactive', customId: 'k:pay', from: '919840750467' }, reviewed, { io })
    const r2 = await handleInput({ kind: 'interactive', customId: 'k:confirm', from: '919840750467' }, r.session, { io })
    expect(io.calls.postOrder).toHaveLength(1)
    const payload = io.calls.postOrder[0]
    expect(payload).toMatchObject({
      customer_name: 'Ahmed Khan',
      email: 'orders@areesperfumes.in',
      phone: '+919840750467',
      pincode: '600001',
      city: 'Chennai',
      payment_method: 'upi',
      total_amount: 150,
    })
    expect(payload.address).toContain('Sowcarpet')
    expect(payload.message).toBe('Placed via WhatsApp bot')
    expect(payload.items[0]).toMatchObject({
      product_id: 'p-cat-1-1',
      variantId: 'v-1a',
      quantity: 1,
      unit_price: 150,
      subtotal: 150,
      totalPieces: 1,
    })
    expect(typeof payload.idempotency_key).toBe('string')
    const okText = r2.actions.find((a) => a.type === 'text' && a.text.includes('Order confirmed'))
    expect(okText.text).toContain('Order number:')
    expect(okText.text).toContain('0123')
    expect(r2.session.state).toBe('done')
    expect(r2.session.cart).toHaveLength(0)
  })

  it('failed order keeps the cart and lets the customer retry', async () => {
    session = (await runCheckout(session)).session
    const brokenIo = stubIo({ postOrder: async () => { throw new Error('Order failed (409)') } })
    const r = await handleInput({ kind: 'interactive', customId: 'k:pay', from: '919840750467' }, session, { io })
    const r2 = await handleInput({ kind: 'interactive', customId: 'k:confirm', from: '919840750467' }, r.session, { io: brokenIo })
    const errText = r2.actions.find((a) => a.type === 'text')
    expect(errText.text).toContain('placing the order failed')
    expect(r2.session.cart).toHaveLength(1)
  })

  it('QR missing → UPI ID stays in text (dictionary fallback)', async () => {
    catalog.qrImage = null
    session = (await runCheckout(session)).session
    // A missing QR probe returns null — pay action text carries the UPI ID either way.
    const pay = payTextMessage(session.cart)
    expect(pay.text).toContain(UPI_ID)
    expect(pay.text).toContain('qr.hikmaex@sib')
  })
})

describe('wa bot — tracking, info, human handoff', () => {
  beforeEach(async () => {
    catalog = { categories: CATS, products: {}, qrImage: null }
    for (const c of CATS) catalog.products[c.id] = PRODUCTS(c.id)
    io = stubIo()
    session = (await handleInput({ kind: 'text', text: 'hello', from: '919840750467' }, undefined, { io })).session
  })

  it('track by sender phone returns the latest statuses', async () => {
    session = (await handleInput({ kind: 'interactive', customId: 'm:track', from: '919840750467' }, session, { io })).session
    expect(session.state).toBe('track_pick')
    const r = await handleInput({ kind: 'interactive', customId: 't:me', from: '919840750467' }, session, { io })
    const text = r.actions.find((a) => a.type === 'text')
    expect(io.calls.trackOrder[0]).toEqual({ type: 'phone', value: '9840750467' })
    expect(text.text).toContain('0123')
    expect(text.text).toContain('Processing')
    expect(text.text).toContain('0118')
    expect(text.text).toContain('Shipped')
    expect(r.session.state).toBe('menu')
  })

  it('track by order number normalises # and casing', async () => {
    session = (await handleInput({ kind: 'interactive', customId: 'm:track', from: '919840750467' }, session, { io })).session
    session = (await handleInput({ kind: 'interactive', customId: 't:other', from: '919840750467' }, session, { io })).session
    expect(session.state).toBe('track_order')
    const r = await handleInput({ kind: 'text', text: ' #0123 ', from: '919840750467' }, session, { io })
    expect(io.calls.trackOrder[0]).toEqual({ type: 'order', value: '0123' })
    expect(r.session.state).toBe('menu')
  })

  it('shop info shows the real address, hours and phone', async () => {
    const r = await handleInput({ kind: 'text', text: '3', from: '919840750467' }, session, { io })
    const info = r.actions[0]
    expect(info.type).toBe('text')
    expect(info.text).toContain('+91 98407 50467')
    expect(info.text).toContain('9:00 AM–9:30 PM')
    expect(info.text).toContain('Mannadi')
  })

  it('any human wording hands off and re-opens the menu', async () => {
    const r = await handleInput({ kind: 'text', text: 'I want to talk to a manager', from: '919840750467' }, session, { io })
    const text = r.actions[0]
    expect(text.type).toBe('text')
    expect(text.text).toMatch(/reply here shortly/i)
    expect(r.session.state).toBe('menu')
    expect(r.session.note).toBe('human-handoff')
  })

  it('menu/reset after an order returns the fresh conversation', async () => {
    const r = await handleInput({ kind: 'text', text: 'menu', from: '919840750467' }, { ...session, state: 'cart', cart: [{ subtotal: 100 }], checkout: {} }, { io })
    expect(r.session.state).toBe('menu')
    expect(r.session.cart).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function runCheckout(startSession) {
  let s = startSession
  s = (await handleInput({ kind: 'interactive', customId: 'c:checkout', from: '919840750467' }, s, { io })).session
  s = (await handleInput({ kind: 'text', text: 'Ahmed Khan', from: '919840750467' }, s, { io })).session
  s = (await handleInput({ kind: 'text', text: '12/A, Sowcarpet, near Metro', from: '919840750467' }, s, { io })).session
  s = (await handleInput({ kind: 'text', text: '600001', from: '919840750467' }, s, { io })).session
  s = (await handleInput({ kind: 'text', text: 'Chennai', from: '919840750467' }, s, { io })).session
  s = (await handleInput({ kind: 'text', text: 'skip', from: '919840750467' }, s, { io })).session
  return { session: s, state: s.state }
}

describe('status sweep � payment/order update notifications', () => {
  beforeEach(() => {
    catalog = { categories: CATS, products: {}, qrImage: null }
    for (const c of CATS) catalog.products[c.id] = PRODUCTS(c.id)
    io = stubIo()
    catalog.track = [
      { order_number: '0123', order_status: 'Processing', total: 150, payment_status: 'Unpaid' },
      { order_number: '0118', order_status: 'Shipped', total: 900, payment_status: 'Paid' },
    ]
  })

  it('no phone → silent noop', async () => {
    const r = await statusSweep({ v: 1, cart: [] }, io)
    expect(r.actions).toHaveLength(0)
  })

  it('first contact builds the baseline silently (no notification)', async () => {
    const r = await statusSweep({ v: 1, phone: '+919840750467' }, io)
    expect(r.actions).toHaveLength(0)
    expect(r.session.statusSnap['0123']).toMatchObject({ order_status: 'Processing', payment_status: 'Unpaid' })
    expect(r.session.statusSnap['0118']).toMatchObject({ order_status: 'Shipped', payment_status: 'Paid' })
  })

  it('payment status change is announced with friendly labels', async () => {
    catalog.track[0].payment_status = 'Paid'
    const r = await statusSweep(
      { v: 1, phone: '+919840750467', statusSnap: { '0123': { order_status: 'Processing', payment_status: 'Unpaid', total: 150 } } },
      io,
    )
    const text = r.actions[0]
    expect(text.type).toBe('text')
    expect(text.text).toContain('*Order update for you*')
    expect(text.text).toMatch(/0123/)
    expect(text.text).toContain('Payment: Not paid yet → *Paid*')
    expect(text.text).not.toContain('Status:')
  })

  it('order status change is announced alongside payment', async () => {
    catalog.track = [{ order_number: '0123', order_status: 'Shipped', total: 150, payment_status: 'Paid' }]
    const r = await statusSweep(
      { v: 1, phone: '+919840750467', statusSnap: { '0123': { order_status: 'Processing', payment_status: 'Unpaid', total: 150 } } },
      io,
    )
    expect(r.actions[0].text).toContain('Status: Processing → *Shipped*')
    expect(r.actions[0].text).toContain('Payment: Not paid yet → *Paid*')
  })

  it('no change → nothing is sent and the snapshot is refreshed', async () => {
    const start = { v: 1, phone: '+919840750467', statusSnap: { '0123': { order_status: 'Processing', payment_status: 'Unpaid', total: 150 }, '0118': { order_status: 'Shipped', payment_status: 'Paid', total: 900 } } }
    const r = await statusSweep(start, io)
    expect(r.actions).toHaveLength(0)
    expect(r.session.statusSnap['0123']).toMatchObject({ order_status: 'Processing' })
  })

  it('webhook entry (handleWithStatusSweep) prepends updates above the reply', async () => {
    const seeded = { v: 1, state: 'menu', phone: '+919840750467', statusSnap: { '0123': { order_status: 'Processing', payment_status: 'Unpaid', total: 150 } }, cart: [] }
    catalog.track = [{ order_number: '0123', order_status: 'Shipped', total: 150, payment_status: 'Paid' }]
    const r = await handleWithStatusSweep({ kind: 'text', text: 'hello', from: '919840750467' }, seeded, { io })
    expect(r.actions[0].text).toContain('*Order update for you*')
    const menu = r.actions.at(-1)
    expect(menu.type).toBe('list')
    expect(r.session.state).toBe('menu')
  })
})
