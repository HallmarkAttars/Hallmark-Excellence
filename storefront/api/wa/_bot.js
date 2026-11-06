// Hikma Exports WhatsApp bot — deterministic state machine (no LLM).
//
// Every interaction is enumerated buttons/lists + a few text prompts, all in
// English (owner's choice C). Pure logic: handlers receive an `input` and the
// current session, and return { actions, session, note? } where `actions` are
// message descriptors the webhook renders via _graph.js. All I/O (catalog
// reads, order placement, tracking) arrives through the `io` object, so the
// offline test suite exercises the exact same conversation as production.
//
// Flow (matching the owner's spec):
//   menu → browse categories → product list (paginated) → variant list
//   → cart → review → [Send UPI & confirm] → image + "UPI ID: qr.hikmaex@sib"
//   + "Can I confirm your order?" → [Yes, confirm] → POST /api/orders
//   (payment_method 'upi') → order number + pending-payment note.
//   menu option 3 → Track (own number / order number), 4 → shop info,
//   5 → any "human" wording → hand-off note.

import { getShopCategories, getCategoryProducts, orderVariants, buildOrderItem } from './_catalog.js'

export const UPI_ID = process.env.WHATSAPP_UPI_ID || 'qr.hikmaex@sib'
export const PAY_NAME = 'HIKMA EXPORTS (Arees Perfumes)'
const SHOPIFY_URL = 'https://www.areesperfumes.in'
export const FALLBACK_EMAIL = process.env.WHATSAPP_FALLBACK_EMAIL || 'orders@areesperfumes.in'

const MAX_ROWS = 10 // WhatsApp lists: hard upper bound per message
// Product/variant rows per page leave room for the "Next page" row so the
// combined list never exceeds the 10-row limit.
const PAGE_SIZE = 9

// ---------------------------------------------------------------------------
// small formatting helpers — WhatsApp row titles ≤24 chars, descriptions ≤72
// ---------------------------------------------------------------------------

function st(v, max) {
  const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim()
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
const t24 = (v) => st(v, 24)
const t72 = (v) => st(v, 72)
const rupee = (n) => `₹${Number(n) % 1 === 0 ? Number(n).toLocaleString('en-IN') : Number(n).toFixed(2)}`

function sessionIdFromPhone(from) {
  const digits = String(from || '').replace(/\D/g, '')
  if (digits.length === 12 || digits.length === 13) return digits.slice(-10)
  return digits
}

export function customerPhone(from) {
  const digits = String(from || '').replace(/\D/g, '')
  const last10 = digits.slice(-10)
  return `+${/^[0-9]{10}$/.test(last10) ? '91' : ''}${last10}`
}

export function defaultSession() {
  // `v` guards against schema changes wiping state; cart starts empty.
  return { state: 'menu', v: 1, cart: [] }
}

const MENU_BODY =
  'Assalaamu Alaikum, welcome to Hikma Exports (Arees Perfumes), Chennai — attars, fragrance oils, bakhoor & packaging.\nWhat would you like to do?'

function menuActions() {
  return [
    {
      type: 'list',
      body: MENU_BODY,
      rows: [
        { id: 'm:order', title: '1. Order products', description: 'Browse and place an order' },
        { id: 'm:track', title: '2. Track my order', description: 'Order or delivery status' },
        { id: 'm:info', title: '3. Shop info', description: 'Address, hours, contact' },
        { id: 'm:human', title: '4. Talk to a person', description: 'Reply to our team member here' },
      ],
    },
  ]
}

// ---------------------------------------------------------------------------
// cart helpers
// ---------------------------------------------------------------------------

function cartTotal(cart) {
  return cart.reduce((sum, line) => sum + (Number(line.subtotal) || 0), 0)
}

function cartText(cart) {
  if (!cart.length) return '*Your cart is empty.*'
  const lines = cart.map(
    (l, i) =>
      `${i + 1}. ${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ''} × ${l.quantity} — ${rupee(l.subtotal)}`,
  )
  return `*Your cart*\n${lines.join('\n')}\n*Total: ${rupee(cartTotal(cart))}*`
}

function actionsCart(cart) {
  return [
    {
      type: 'buttons',
      body: `${cartText(cart)}\n\nWhat next?`,
      buttons: [
        { id: 'c:more', title: 'Add more' },
        { id: 'c:checkout', title: 'Confirm order' },
        { id: 'c:remove', title: 'Remove item' },
      ],
    },
  ]
}

function actionsReview(s) {
  const k = s.checkout
  return [
    {
      type: 'buttons',
      body:
        '*Order review*\n' +
        `Name: ${k.name}\nAddress: ${k.address}, ${k.city} - ${k.pincode}\n` +
        `Phone: ${s.phone}\nEmail: ${k.email}\n\n${cartText(s.cart)}\n\n` +
        'Send payment details?',
      buttons: [
        { id: 'k:pay', title: 'Send UPI & confirm' },
        { id: 'k:edit', title: 'Edit address' },
      ],
    },
  ]
}

export function payTextMessage(cart) {
  return {
    type: 'text',
    text: `*SCAN & PAY* — ${PAY_NAME}\nUPI ID: *${UPI_ID}*\nAmount payable: *${rupee(cartTotal(cart))}*\n(Pay the advance via any UPI app — Google Pay, PhonePe, Paytm, Amazon Pay, Mobikwik.)`,
  }
}

// ---------------------------------------------------------------------------
// handlers
// ---------------------------------------------------------------------------

async function newIdempotencyKey() {
  return globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `wa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function handleMenuIntent(text, session) {
  const t = (text || '').toLowerCase()
  // NOTE: 'menu' is NOT here — it is the reset word handled in handleInput.
  if (['hi', 'hello', 'hey', 'start', 'hlo', 'assalam', 'salam', 'vanakkam', 'namaste', 'hi hikma', 'hello hikma'].some((w) => t.startsWith(w))) {
    return { actions: menuActions(), session: { ...session, state: 'menu' }, note: 'menu' }
  }
  if (/\b(human|agent|staff|person|manager|talk|help me)\b/.test(t)) {
    return humanHandoff(session)
  }
  return null
}

function humanHandoff(session) {
  return {
    actions: [
      {
        type: 'text',
        text: 'Noted — one of our team members will reply here shortly (9:00 AM–9:30 PM).\nWhile you wait, you can continue here:',
      },
      ...menuActions(),
    ],
    session: { ...session, state: 'menu', note: 'human-handoff' },
  }
}

function infoActions() {
  return [
    {
      type: 'text',
      text:
        '*Hikma Exports — Arees Perfumes*\n' +
        'Wholesale & retail attars, fragrance oils, bakhoor, bottles.\n\n' +
        'Shop address: S-1, 145, AJ Beach Rd, North Street, Mannadi, George Town, Chennai - 600001\n' +
        'Timings: any day, 9:00 AM–9:30 PM\n' +
        'Phone: +91 98407 50467\n' +
        'Website:\n' +
        `• Wholesale: ${SHOPIFY_URL}/wholesale\n` +
        `• Retail catalogue: ${SHOPIFY_URL}/shop\n` +
        `• Attar buying guide: ${SHOPIFY_URL}/attar-perfume-shop-south-india`,
      previewUrl: true,
    },
  ]
}

async function actionsProductList(cat, page, io, session) {
  let products
  try {
    products = await io.categoryProducts(cat, session)
  } catch (err) {
    return [{ actions: [{ type: 'text', text: 'The shop is catching up — please try again in a minute.' }, ...menuActions()], session: { ...session, state: 'menu' } }]
  }
  const pages = Math.max(1, Math.ceil(products.length / PAGE_SIZE))
  const idx = Math.min(Math.max(0, page), pages - 1)
  const slice = products.slice(idx * PAGE_SIZE, idx * PAGE_SIZE + PAGE_SIZE)
  const rows = slice.map((p, i) => ({
    id: `p:${p.id}`,
    title: t24(p.name),
    description: p.unitLabel
      ? t72(`${rupee(p.displayPrice)} — ${p.unitLabel}`)
      : t72(`${p.displayPrice > 0 ? rupee(p.displayPrice) : 'Ask price'} — in stock`),
  }))
  if (idx < pages - 1) {
    rows.push({ id: `pg:${idx + 1}`, title: 'Next page ›', description: `More items (${idx + 2}/${pages})` })
  }
  return [
    {
      actions: [
        {
          type: 'list',
          header: t24(cat.name),
          body: `${cat.name}: page ${idx + 1} of ${pages}. Tap an item to see sizes and prices.`,
          rows,
        },
      ],
      session: { ...session, state: 'products', catId: cat.id, catName: cat.name, page: idx, cats: session.cats },
    },
  ]
}

async function actionsVariantList(product, page, session, io) {
  const variants = orderVariants(product)
  if (!variants.length) {
    // Product without variants → add the default line directly.
    return addToCart(product, null, session, 1)
  }
  const cartRow = session.cart.length
    ? { id: 'c:review', title: 'Find my cart', description: 'Back to cart summary' }
    : null
  // Row budget: 10 total. Pages that carry the "Next page" button + the cart
  // row get 8 variant rows; 9 with one of them; 10 with neither.
  const count = variants.length
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const idx = Math.min(Math.max(0, page), pages - 1)
  const hasNext = idx < pages - 1
  const pageRows = hasNext ? (cartRow ? 8 : PAGE_SIZE) : cartRow ? PAGE_SIZE : MAX_ROWS
  const slice = variants.slice(idx * pageRows, idx * pageRows + pageRows)
  const rows = slice
    .map((v, i) => ({
      id: `v:${v.id}`,
      title: t24(v.display_label || `${v.quantity_value || 1} ${v.quantity_unit || ''}`.trim() || `Option ${idx * pageRows + i + 1}`),
      description: t72(
        `${rupee(v.total_price ?? v.price)}${v.is_default ? ' — popular size' : ''}${v.price_per_unit ? ` (₹${v.price_per_unit}/unit)` : ''}`,
      ),
    }))
    .concat(
      hasNext
        ? [{ id: `vp:${idx + 1}`, title: 'Next page ›', description: `More sizes (${idx + 2}/${pages})` }]
        : [],
      cartRow ? [cartRow] : [],
    )
  return [
    {
      actions: [
        {
          type: 'list',
          header: t24(product.name),
          body: `${product.name}: pick a size.`,
          rows,
        },
      ],
      session: {
        ...session,
        state: 'variants',
        prodId: product.id,
        prodName: product.name,
        variantPage: idx,
        catId: session.catId,
        catName: session.catName,
      },
    },
  ]
}

async function findProduct(io, session, prodId) {
  const cat = (session.cats || []).find((c) => c.id === session.catId)
  const products = await io.categoryProducts(cat || { id: session.catId, name: session.catName || '' }, session)
  return products.find((p) => p.id === prodId) || null
}

function addToCart(product, variant, session, quantity) {
  const line = buildOrderItem(product, variant, quantity)
  line.name = line.product_name // cart renderers use the short `name` field
  const cart = [...session.cart]
  const i = cart.findIndex((l) => l.productId === line.product_id && String(l.variantId) === String(line.variantId))
  if (i >= 0) {
    const merged = { ...cart[i], quantity: cart[i].quantity + line.quantity, totalPieces: cart[i].totalPieces + line.totalPieces, subtotal: roundAdd(cart[i].unitPrice, cart[i].quantity + line.quantity) }
    merged.totalPrice = merged.subtotal
    cart[i] = merged
  } else {
    cart.push(line)
  }
  const next = { ...session, state: 'cart', cart }
  return [{ actions: actionsCart(cart), session: next }]
}

// sum of fixed unitPrice × qty, consistent with the storefront cart math.
function roundAdd(unitPrice, qty) {
  return Math.round(Number(unitPrice) * Number(qty) * 100) / 100
}

function actionsRemoveList(session) {
  const rows = session.cart.map((l, idx) => ({
    id: `r:${idx}`,
    title: t24(l.name),
    description: t72(`${l.variantLabel || ''} × ${l.quantity} — ${rupee(l.subtotal)}`),
  }))
  rows.push({ id: 'c:review', title: 'Keep all', description: 'Back to cart summary' })
  return [
    {
      actions: [{ type: 'list', body: 'Which item to remove from your cart?', rows }],
      session: { ...session, state: 'remove' },
    },
  ]
}

export function payConfirmActions(s, ioNote) {
  const texts = [payTextMessage(s.cart)]
  const image = s.qrImage || ioNote?.qrImage
  const out = image ? [{ type: 'image', url: image }, ...texts] : texts
  return [
    {
      actions: [
        ...out,
        {
          type: 'buttons',
          body: 'Can I confirm your order?',
          buttons: [
            { id: 'k:confirm', title: 'Yes, confirm' },
            { id: 'c:review', title: 'No, cancel' },
          ],
        },
      ],
      session: { ...s, state: 'confirm_pay' },
    },
  ]
}

async function placeOrder(session, io, input) {
  try {
    const items = session.cart.map((l) => ({
      product_id: l.productId,
      productId: l.productId,
      variantId: l.variantId,
      variant_id: l.variantId,
      variantPieces: l.variantPieces,
      quantity: l.quantity,
      totalPieces: l.totalPieces,
      unitPrice: l.unitPrice,
      totalPrice: l.subtotal,
      selectedVariant: l.variantPieces,
      product_name: l.name,
      image: l.image,
      pieces: l.totalPieces,
      unit_price: l.unitPrice,
      subtotal: l.subtotal,
      ...(l.variantId
        ? {
            variant_label: l.variantLabel,
            quantity_value: l.variantPieces,
            quantity_unit: 'Pieces',
            variant_total_price: l.subtotal,
            variant_price_per_unit: l.unitPrice,
          }
        : {}),
    }))
    const total = Math.round(cartTotal(session.cart) * 100) / 100
    const k = session.checkout
    const payload = {
      customer_name: k.name,
      email: k.email,
      phone: session.phone,
      address: k.address,
      pincode: k.pincode,
      ...(k.city ? { city: k.city } : {}),
      message: 'Placed via WhatsApp bot',
      items,
      total_amount: total,
      payment_method: 'upi',
      idempotency_key: session.idemKey,
    }
    const res = await io.postOrder(payload)
    const orderNumber = res?.order?.order_number ?? res?.order_number ?? res?.order?.orderNumber ?? ''
    const placed = res?.order ?? null
    // Baseline for the status sweep: this order is already known at its
    // current status, so the customer is notified only on later CHANGES
    // (payment verified, shipped, delivered …) — never re-announced.
    const statusSnap = orderNumber
      ? { ...(session.statusSnap || {}), [String(orderNumber)]: snapOf(placed, total) }
      : session.statusSnap
    capSnap(statusSnap)
    return {
      note: 'order-placed',
      actions: [
        {
          type: 'text',
          text:
            `*Order confirmed — thank you!*\n` +
            (orderNumber ? `Order number: *${orderNumber}*\n` : '') +
            `Total: ${rupee(total)} (advance payment via UPI)\nPay UPI ID ${UPI_ID} if not paid yet — our team verifies the payment, then packs and ships.\n` +
            `Track: ${SHOPIFY_URL}/track-order\n\nOur staff will message you here if any detail needs checking.`,
        },
        ...menuActions(),
      ],
      session: {
        ...session,
        state: 'done',
        cart: [],
        checkout: null,
        lastOrder: orderNumber,
        ...(statusSnap ? { statusSnap } : {}),
      },
    }
  } catch (err) {
    const detail = err && err.message ? ` — ${err.message}` : ''
    return {
      actions: [
        { type: 'text', text: `Sorry — placing the order failed${detail}. Reply *confirm* to try again, or *menu*.` },
      ],
      session: { ...session, state: 'confirm_pay', retryable: true },
    }
  }
}

// Main entry — returns a promise resolving to a single branch result:
// { actions, session, note? }.
// input: { kind: 'text'|'interactive', text?, customId?, from? }
// io production wiring lives in wa-webhook.js; tests inject stubs.
export async function handleInput(input, sessionIn, { io }) {
  const base = sessionIn && sessionIn.v ? sessionIn : defaultSession()
  const session = base.phone ? base : { ...base, phone: customerPhone(input.from || '') }
  const text = typeof input === 'object' ? (input.text || '').trim() : ''
  const customId = typeof input === 'object' ? (input.customId || '') : ''
  const { state } = session

  const menuIntent = handleMenuIntent(text, session)
  if (menuIntent && state !== 'chk_name' && state !== 'chk_addr' && state !== 'chk_pin' && state !== 'chk_city' && !['confirm_pay'].includes(state)) {
    return menuIntent
  }

  // ---- global reset words ----
  if (/^(menu|restart|reset|cancel)$/i.test(text)) {
    return { actions: menuActions(), session: { ...defaultSession(), cats: session.cats } }
  }

  switch (state) {
    case 'menu':
    case 'done':
      return menuState(input, session, io)
    case 'browse':
      return browseState(input, customId, session, io)
    case 'products':
      return productsState(input, customId, session, io)
    case 'variants':
      return variantsState(input, customId, session, io)
    case 'cart':
      return cartState(customId, text, session, io)
    case 'remove':
      return removeState(customId, session)
    case 'review':
      return reviewState(customId, session, io)
    case 'chk_name':
    case 'chk_addr':
    case 'chk_pin':
    case 'chk_city':
    case 'chk_email': {
      // If the customer taps "keep all"/other interactive while typing, route it.
      if (customId) {
        const r = handleReviewStepButton(customId, session)
        if (r) return r
      }
      return collectStep(state, text, session)
    }
    case 'confirm_pay':
      return confirmPayState(customId, text, session, io)
    case 'track_pick':
      return trackPickState(customId, session, io)
    case 'track_order':
      return trackOrderState(text, session, io)
    default: {
      // Unknown session (schema drift / KV wipe) → restart cleanly.
      const fresh = defaultSession()
      return menuState(input, fresh, io)
    }
  }
}

function handleReviewStepButton(customId, session) {
  return null // reserved — currently no buttons in collection steps
}

// ---------------------------------------------------------------------------
// state handlers
// ---------------------------------------------------------------------------

async function menuState(input, session, io) {
  // Numbers accepted in text for feature phones (1 Order / 2 Track / 3 Info / 4 Human).
  const text = typeof input === 'object' ? (input.text || '').trim() : ''
  const id = customIdOf(input)
  const picked = id || `m:${{ '1': 'order', '2': 'track', '3': 'info', '4': 'human' }[text] || ''}`
  if (picked === 'm:order') {
    return browseState(null, 'm:order', session, io)
  }
  if (picked === 'm:track') {
    return trackPickActions(session)
  }
  if (picked === 'm:info') {
    return {
      actions: [infoActions()[0], ...menuActions()],
      session: { ...session, state: 'menu' },
    }
  }
  if (picked === 'm:human') {
    return humanHandoff(session)
  }
  return { actions: menuActions(), session: { ...session, state: 'menu' } }
}

function customIdOf(input) {
  return typeof input === 'object' && input.kind === 'interactive' ? input.customId || '' : ''
}

async function browseState(_input, customId, session, io) {
  let cats
  try {
    cats = await io.getShopCategories()
  } catch (err) {
    return { actions: [{ type: 'text', text: 'The shop is catching up — please try again in a minute.' }], session: { ...session, state: 'menu' } }
  }
  if (!Array.isArray(session.cats) || session.cats.length !== cats.length) {
    session = { ...session, cats }
  }
  if (customId.length > 2 && customId.startsWith('c:')) {
    const cat = cats.find((c) => c.id === customId.slice(2))
    if (cat) return actionsProductList(cat, 0, io, session).then((r) => r[0])
  }
  const rows = cats.slice(0, MAX_ROWS).map((c, i) => ({
    id: `c:${c.id}`,
    title: `${i + 1}. ${t24(c.name)}`,
    description: t72(`${c.count} items — tap to view`),
  }))
  return {
    actions: [{ type: 'list', body: 'Which range are you shopping for?', rows }],
    session: { ...session, state: 'browse', cats },
  }
}

async function productsState(input, customId, session, io) {
  const cat = (session.cats || []).find((c) => c.id === session.catId)
  if (!cat) return browseState(null, 'm:order', { ...session, state: 'browse' }, io)
  if (customId.startsWith('pg:')) {
    const [r] = await actionsProductList(cat, Number(customId.slice(3)), io, session)
    return r
  }
  if (customId.startsWith('p:')) {
    const prodId = customId.slice(2)
    const product = await findProduct(io, session, prodId)
    if (!product) {
      const [r] = await actionsProductList(cat, session.page || 0, io, session)
      return r
    }
    const [r] = await actionsVariantList(product, 0, session, io)
    return r
  }
  if (customId.startsWith('c:')) {
    return browseState(null, customId, session, io)
  }
  if (textOf(input)) {
    // A typed number while browsing = product index on the current page.
    return { actions: menuActions(), session: { ...session, state: 'menu' } }
  }
  const [r] = await actionsProductList(cat, session.page || 0, io, session)
  return r
}

function textOf(input) {
  return typeof input === 'object' ? (input.text || '').trim() : ''
}

async function variantsState(input, customId, session, io) {
  const product = await findProduct(io, session, session.prodId)
  if (!product) {
    return browseState(null, 'm:order', { ...session, state: 'browse' }, io)
  }
  if (customId.startsWith('vp:')) {
    const [r] = await actionsVariantList(product, Number(customId.slice(3)), session, io)
    return r
  }
  if (customId.startsWith('v:')) {
    const variant = orderVariants(product).find((v) => v.id === customId.slice(2))
    if (!variant) {
      const [r] = await actionsVariantList(product, session.variantPage || 0, session, io)
      return r
    }
    return addToCart(product, variant, session, 1)[0]
  }
  if (customId.startsWith('c:review')) {
    return { actions: actionsCart(session.cart), session: { ...session, state: 'cart' } }
  }
  if (customId.startsWith('p:')) {
    const product2 = await findProduct(io, session, customId.slice(2))
    if (product2) {
      const [r] = await actionsVariantList(product2, 0, session, io)
      return r
    }
  }
  if (customId.startsWith('c:')) {
    return browseState(null, customId, session, io)
  }
  const [r] = await actionsVariantList(product, session.variantPage || 0, session, io)
  return r
}

async function cartState(customId, text, session, io) {
  if (customId === 'c:checkout' || /^confirm order$/i.test(text)) {
    return checkoutStart(session)
  }
  if (customId === 'c:more') {
    return browseState(null, 'm:order', session, io)
  }
  if (customId === 'c:remove') {
    return actionsRemoveList(session)[0]
  }
  return { actions: actionsCart(session.cart), session: { ...session, state: 'cart' } }
}

function checkoutStart(session) {
  return {
    actions: [
      {
        type: 'text',
        text: '*Step 1 of 4 — delivery details.*\nWhat is your full name? (This goes on the invoice.)',
      },
    ],
    session: { ...session, state: 'chk_name', checkout: {} },
  }
}

function collectStep(state, text, session) {
  const value = String(text || '').trim()
  if (!value) {
    return { actions: [{ type: 'text', text: 'Please reply with the details — tap the menu if you want to stop.' }], session }
  }
  if (state === 'chk_name') {
    if (value.length < 3 || value.length > 60 || /@/.test(value)) {
      return { actions: [{ type: 'text', text: 'Please reply with the full name to invoice — e.g. "Ahmed Khan".' }], session: { ...session, state } }
    }
    return {
      actions: [{ type: 'text', text: '*Step 2 of 4.* Full delivery address in one line:\nflat/house no., area/street, landmark' }],
      session: storebourne(session, { name: value }, 'chk_addr'),
    }
  }
  if (state === 'chk_addr') {
    if (value.length < 10 || value.length > 240) {
      return { actions: [{ type: 'text', text: 'Please include flat/house no., area and landmark — at least a full line.' }], session: { ...session, state } }
    }
    return {
      actions: [{ type: 'text', text: '*Step 3 of 4.* Your area PIN code (6 digits)?' }],
      session: storebourne(session, { address: value }, 'chk_pin'),
    }
  }
  if (state === 'chk_pin') {
    if (!/^[1-9][0-9]{5}$/.test(value)) {
      return { actions: [{ type: 'text', text: 'PIN code must be exactly 6 digits (e.g. 600001).' }], session: { ...session, state } }
    }
    return {
      actions: [{ type: 'text', text: '*Step 4 of 4.* City for delivery?' }],
      session: storebourne(session, { pincode: value }, 'chk_city'),
    }
  }
  if (state === 'chk_city') {
    if (value.length < 2 || value.length > 40) {
      return { actions: [{ type: 'text', text: 'City/town name, please (e.g. Chennai).' }], session: { ...session, state } }
    }
    return {
      actions: [{ type: 'text', text: `City noted: ${value}.\nFinally your email for the invoice? (or reply *skip*)` }],
      session: storebourne(session, { city: value }, 'chk_email'),
    }
  }
  if (state === 'chk_email') {
    const email = /^skip$/i.test(value) ? FALLBACK_EMAIL : value
    if (!/^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email)) {
      return { actions: [{ type: 'text', text: 'Reply with your email address (e.g. name@gmail.com) or *skip* if none.' }], session: { ...session, state } }
    }
    const checkout = { ...session.checkout, email }
    return {
      actions: actionsReview({ ...session, checkout, cart: session.cart }),
      session: { ...session, checkout, state: 'review' },
    }
  }
  return { actions: menuActions(), session: { ...defaultSession(), cats: session.cats } }
}

function storebourne(session, patch, nextState) {
  return { ...session, checkout: { ...session.checkout, ...patch }, state: nextState }
}

async function reviewState(customId, session, io) {
  if (customId === 'k:pay') {
    let qrImage = null
    try {
      qrImage = await io.getQrImage()
    } catch {}
    return payConfirmActions(session, { qrImage })[0]
  }
  if (customId === 'k:edit') {
    return checkoutStart({ ...session, checkout: {} })
  }
  if (customId === 'c:review') {
    return { actions: actionsCart(session.cart), session: { ...session, state: 'cart' } }
  }
  return { actions: actionsReview(session), session: { ...session, state: 'review' } }
}

function trackPickActions(session) {
  return [
    {
      actions: [
        {
          type: 'buttons',
          body: 'Track by your WhatsApp number or an order number?',
          buttons: [
            { id: 't:me', title: 'My number' },
            { id: 't:other', title: 'Order number' },
          ],
        },
      ],
      session: { ...session, state: 'track_pick' },
    },
  ][0]
}

async function trackPickState(customId, session, io) {
  if (customId === 't:me') {
    const { lines } = await runTrackLookup(io, { type: 'phone', value: String(session.phone || '').replace(/\D/g, '').slice(-10) })
    return { actions: [{ type: 'text', text: lines }, ...menuActions()], session: { ...session, state: 'menu' } }
  }
  if (customId === 't:other') {
    return { actions: [{ type: 'text', text: 'Send your order number (e.g. #0123 or just 0123).' }], session: { ...session, state: 'track_order' } }
  }
  return trackPickActions(session)
}

export async function runTrackLookup(io, { type, value }) {
  const out = await io.trackOrder({ type, value })
  const orders = Array.isArray(out) ? out : []
  if (!orders.length) {
    return { lines: 'No order found for that detail. Double-check the order number or phone number.\nTrack online: https://www.areesperfumes.in/track-order' }
  }
  const lines = orders.slice(0, 3).map((o) => {
    const total = o.total != null ? o.total : o.total_amount
    return `• *${o.order_number || 'Order'}* — ${String(o.order_status || o.status || 'Processing')} — ${rupee(total)}${o.payment_status ? ` (${String(o.payment_status).replace(/[_-]/g, ' ')})` : ''}`
  })
  return { lines: `${lines.join('\n')}\nFull timeline: https://www.areesperfumes.in/track-order` }
}

async function trackOrderState(text, session, io) {
  const value = String(text || '').replace(/^#/, '').trim().toUpperCase()
  if (!/^[A-Z0-9-]{3,20}$/.test(value)) {
    return { actions: [{ type: 'text', text: 'That does not look like an order number. Try again, or reply *menu*.' }], session: { ...session, state: 'track_order' } }
  }
  const { lines } = await runTrackLookup(io, { type: 'order', value })
  return { actions: [{ type: 'text', text: lines }, ...menuActions()], session: { ...session, state: 'menu' } }
}

function removeState(customId, session) {
  if (customId && customId.startsWith('r:')) {
    const idx = Number(customId.slice(2))
    if (Number.isInteger(idx) && idx >= 0 && idx < session.cart.length) {
      const cart = session.cart.filter((_, i) => i !== idx)
      if (!cart.length) {
        return {
          actions: [{ type: 'text', text: 'Cart is now empty.' }, ...menuActions()],
          session: { ...session, state: 'menu', cart: [] },
        }
      }
      return { actions: actionsCart(cart), session: { ...session, state: 'cart', cart } }
    }
  }
  return { actions: actionsCart(session.cart), session: { ...session, state: 'cart' } }
}

async function confirmPayState(customId, text, session, io) {
  if (customId === 'k:confirm' || /^(confirm|yes|paid|haan|alright)$/i.test(text)) {
    const at = { ...session, idemKey: session.idemKey || (await newIdempotencyKey()) }
    return placeOrder(at, io, text)
  }
  // cancel → back to the cart view so the customer can adjust or retry later
  return { actions: actionsCart(session.cart), session: { ...session, state: 'cart' } }
}

export function sessionIdFrom(from) {
  return sessionIdFromPhone(from)
}

// ---------------------------------------------------------------------------
// status sweep — proactive "payment received / shipped / delivered" updates
// ---------------------------------------------------------------------------

// Snapshot of one order as seen from POST /api/track-order — the webhook/POS
// staff flip payment_status / order_status in the shop admin; the sweep's
// diff against this snapshot produces the customer notification.
function snapOf(order, fallbackTotal = 0) {
  const o = order || {}
  return {
    order_status: String(o.order_status ?? o.status ?? ''),
    payment_status: String(o.payment_status ?? ''),
    total: Number(o.total ?? o.total_amount ?? fallbackTotal) || 0,
  }
}

// Keep the session snapshot bounded — the 8 most recent orders matter.
function capSnap(snap) {
  if (!snap || typeof snap !== 'object') return
  const keys = Object.keys(snap)
  if (keys.length <= 8) return
  for (const k of keys.slice(0, keys.length - 8)) delete snap[k]
}

function titleCase(s) {
  const cleaned = String(s || '').replace(/[_-]+/g, ' ').trim()
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : ''
}

function payLabel(v) {
  const t = String(v || '').toLowerCase()
  if (/unpaid|pending|await/.test(t)) return 'Not paid yet'
  if (/paid|received/.test(t)) return 'Paid'
  if (/refund/.test(t)) return 'Refunded'
  return titleCase(v)
}

function statusLabel(v) {
  const t = String(v || '').toLowerCase()
  if (/shipped|dispatch/.test(t)) return 'Shipped'
  if (/deliver/.test(t)) return 'Delivered'
  if (/cancell/.test(t)) return 'Cancelled'
  if (/refus|reject/.test(t)) return 'Cancelled'
  if (/pack/.test(t)) return 'Packed'
  if (/process/.test(t)) return 'Processing'
  if (/pend|new/.test(t)) return 'Processing'
  return titleCase(v)
}

// One sweep = fetch the sender's recent orders + diff vs the snapshot.
// Returns { actions, session } — actions are notification texts (possibly
// empty). Silent on: no phone, network error, empty history, first-ever look
// (baseline), and no changes.
export async function statusSweep(session, io, { notify = true } = {}) {
  const digits = String(session?.phone || '').replace(/\D/g, '')
  const last10 = digits.slice(-10)
  if (!/^[0-9]{10}$/.test(last10)) return { actions: [], session: session || defaultSession() }

  let orders
  try {
    orders = await io.trackOrder({ type: 'phone', value: last10 })
  } catch {
    return { actions: [], session }
  }
  if (!Array.isArray(orders) || !orders.length) {
    return { actions: [], session }
  }

  const prev = session.statusSnap && typeof session.statusSnap === 'object' ? session.statusSnap : {}
  const baseline = Object.keys(prev).length === 0
  const lines = []
  const next = {}
  for (const o of orders.slice(0, 8)) {
    const num = String(o.order_number ?? o.orderNumber ?? '')
    if (!num) continue
    const cur = snapOf(o)
    next[num] = cur
    const old = prev[num]
    if (baseline || !old) continue
    const changes = []
    if (cur.payment_status && old.payment_status !== cur.payment_status) {
      changes.push(`Payment: ${payLabel(old.payment_status)} → *${payLabel(cur.payment_status)}*`)
    }
    if (cur.order_status && old.order_status !== cur.order_status) {
      changes.push(`Status: ${statusLabel(old.order_status)} → *${statusLabel(cur.order_status)}*`)
    }
    if (changes.length) {
      lines.push(`Order *${num}*${cur.total ? ` (${rupee(cur.total)})` : ''}\n${changes.join('\n')}`)
    }
  }
  const updated = { ...session, statusSnap: next }
  if (!notify || !lines.length) return { actions: [], session: updated }
  return {
    actions: [
      {
        type: 'text',
        text: `*Order update for you*\n\n${lines.join('\n\n')}\n\nFull timeline: ${SHOPIFY_URL}/track-order`,
      },
    ],
    session: updated,
  }
}

// Webhook-level entry: sweep first (silent baseline/diff), then the normal
// conversation branch. Sweep notifications are PREPENDED so the customer
// sees status updates above the bot's reply to whatever they sent.
export async function handleWithStatusSweep(input, sessionIn, { io }) {
  const seed = sessionIn && sessionIn.v ? sessionIn : defaultSession()
  let sweep = { actions: [], session: seed }
  try {
    sweep = await statusSweep(seed, io, { notify: true })
  } catch {
    sweep = { actions: [], session: seed }
  }
  const branch = await handleInput(input, sweep.session, { io })
  const note = branch.note || (sweep.actions.length ? 'status-notified' : undefined)
  return { ...branch, actions: [...sweep.actions, ...(branch.actions || [])], note }
}
