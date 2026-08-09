// services/orderEmailService.js
// ---------------------------------------------------------------------------
// Brevo transactional order emails — CUSTOMER order confirmation + ADMIN new
// order notification for Hallmark Excellence Attars.
//
// CONTRACT (read before editing):
//  * This module NEVER throws. A Brevo failure must never fail an order.
//  * sendOrderEmails() is called ONLY from the backend order-creation flow,
//    AFTER the order row has been saved in the database. It is never called
//    from React/frontend code and never from order-viewing endpoints.
//  * Both emails are built from ONE params object derived from the SAVED
//    order row (never from request-body values, never from mock data).
//  * The API key lives only in the server environment. It is never logged,
//    never returned to clients, and never exposed to any frontend.
// ---------------------------------------------------------------------------

const brevo = require('@getbrevo/brevo')

// NOTE: the installed @getbrevo/brevo@6 SDK uses the new client API
// (new BrevoClient({ apiKey }) + client.transactionalEmails.sendTransacEmail).
// The legacy v5 API (TransactionalEmailsApi / SendSmtpEmail) no longer exists.

// --- Currency / date helpers ----------------------------------------------

// Indian-formatted amount WITHOUT the ₹ symbol (e.g. 3350 -> "3,350").
// The Brevo templates add the ₹ symbol themselves (e.g. "₹{{params.total}}").
function formatINR(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

// "07 Aug 2026, 11:45 AM" — derived from the database created_at timestamp,
// rendered in Asia/Kolkata. Never trusts a frontend-supplied date.
function formatOrderDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const date = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
  let time = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
  time = time.replace(/\bam\b/i, 'AM').replace(/\bpm\b/i, 'PM')
  return `${date}, ${time}`
}

// Only publicly reachable https/http image URLs may go into emails. Anything
// else (blob:, localhost, filesystem paths, empty) becomes '' so the Brevo
// template still renders without breaking.
function safeImage(url) {
  if (!url) return ''
  return /^https?:\/\//i.test(String(url)) ? String(url) : ''
}

// ${FRONTEND_URL}/track-order?order_id=${orderNumber} — the Track Order button
// target in the CUSTOMER confirmation email. The base URL comes ONLY from the
// server environment (never hardcoded in code, never exposed to the frontend).
// Returns '' when FRONTEND_URL or the order number is missing so the template
// simply omits the button.
function buildTrackOrderUrl(orderNumber) {
  const base = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '')
  if (!base || !orderNumber) return ''
  return `${base}/track-order?order_id=${encodeURIComponent(String(orderNumber))}`
}

// --- Params builder --------------------------------------------------------

// Builds ONE params object shared by BOTH templates from the SAVED order row.
// Field names below are the contract with the Brevo templates — they must
// match {{params.*}} / {% for item in params.items %} exactly.
//
// Money fields ship twice so templates can display either form:
//   formatted string, e.g. "3,350"        -> {{params.total}}
//   raw number,     e.g. 3350             -> {{params.totalRaw}}
// trackOrderUrl is the customer template's Track Order button deep-link,
// built from process.env.FRONTEND_URL (never hardcoded).
// The example admin subject "New Order #{{params.orderId}} - ₹{{params.total}}"
// renders as "New Order #ORD-123456 - ₹3,350" with the template's own ₹ sign.
function buildOrderEmailParams(order) {
  let notesInfo = {}
  try {
    if (order && order.notes) notesInfo = JSON.parse(order.notes)
  } catch {
    notesInfo = {}
  }

  const items = Array.isArray(notesInfo.items)
    ? notesInfo.items.map((it) => {
        const quantity = Math.floor(Number(it.quantity ?? it.qty ?? 1)) || 1
        const unitPrice = Number(it.unit_price ?? it.price ?? 0)
        const lineTotal = unitPrice * quantity
        const variant =
          it.variant_label ||
          (it.quantity_value != null && it.quantity_unit
            ? `${it.quantity_value} ${it.quantity_unit}`
            : '')
        return {
          name: it.product_name || it.name || 'Product',
          image: safeImage(it.image),
          variant, // use in templates as {{item.variant}}
          size: variant, // alias so templates using {{item.size}} also work
          quantity,
          price: formatINR(unitPrice),
          priceRaw: unitPrice,
          total: formatINR(lineTotal),
          totalRaw: lineTotal,
        }
      })
    : []

  const subtotal = Number(order?.subtotal ?? 0)
  const discount = Number(order?.discount ?? 0)
  const shipping = Number(order?.shipping_charge ?? 0)
  const tax = 0 // the current system does not collect tax separately
  const total = Number(order?.total ?? subtotal)

  return {
    // Order
    orderId: order?.order_number || '',
    orderDate: formatOrderDate(order?.created_at),
    orderStatus: order?.order_status || 'Pending',

    // Track Order deep-link for the customer template's button (built from
    // the configured FRONTEND_URL — never hardcoded).
    trackOrderUrl: buildTrackOrderUrl(order?.order_number),

    // Customer
    customerName: notesInfo.customer_name || '',
    customerEmail: notesInfo.email || '',
    phone: notesInfo.phone || '',
    message: notesInfo.message || '', // customer's optional checkout note

    // Products — loop with {% for item in params.items %}
    items,

    // Price summary
    subtotal: formatINR(subtotal),
    subtotalRaw: subtotal,
    discount: formatINR(discount),
    discountRaw: discount,
    shipping: formatINR(shipping),
    shippingRaw: shipping,
    tax: formatINR(tax),
    taxRaw: tax,
    total: formatINR(total),
    totalRaw: total,

    // Payment
    paymentMethod: order?.payment_method || 'Cash On Delivery',
    paymentStatus: order?.payment_status || 'Pending',

    // Delivery
    address: notesInfo.address || '',
    addressLine2: notesInfo.address_line2 || '',
    city: notesInfo.city || '',
    state: notesInfo.state || '',
    pincode: notesInfo.pincode || '',
    country: notesInfo.country || 'India',
  }
}

// --- Brevo client ----------------------------------------------------------

let _client = null

// Lazily created Brevo client. The installed @getbrevo/brevo is the NEW v6
// SDK (BrevoClient) — the legacy TransactionalEmailsApi / SendSmtpEmail
// classes no longer exist, so this is the only supported way to construct it.
// Returns null when the API key is not configured — emails are then skipped
// (the order is unaffected). The key never leaves the server environment.
function getBrevoClient() {
  if (_client) return _client
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return null
  _client = new brevo.BrevoClient({ apiKey })
  return _client
}

// Hard cap so a hung Brevo API can never stall checkout indefinitely.
const REQUEST_TIMEOUT_MS = 20000

// Sends one transactional email from a Brevo template. Always resolves with
// { status: 'sent' | 'failed' | 'skipped' } — never rejects.
async function sendTemplateEmail({ tag, to, templateId, params }) {
  const client = getBrevoClient()
  const id = Number(templateId)

  if (!client) {
    console.log(`[ORDER EMAIL] Skipped ${tag}: BREVO_API_KEY not configured`)
    return { status: 'skipped' }
  }
  if (!Number.isFinite(id) || id <= 0) {
    console.log(`[ORDER EMAIL] Skipped ${tag}: template id not configured`)
    return { status: 'skipped' }
  }

  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Brevo request timed out')), REQUEST_TIMEOUT_MS)
    )
    // v6 SDK request object — templateId / to / params are the exact fields
    // the Brevo templates expect (the old SendSmtpEmail class is gone).
    await Promise.race([
      client.transactionalEmails.sendTransacEmail({
        templateId: id,
        to,
        params,
      }),
      timeout,
    ])
    return { status: 'sent' }
  } catch (err) {
    // Log only the generic message + HTTP status — never the API key, tokens
    // or payment data (a 400/404 here usually means a template id mismatch).
    const status = err?.statusCode ?? err?.status
    console.error(`[ORDER EMAIL ERROR] ${tag} failed${status ? ` (HTTP ${status})` : ''}: ${err.message || err}`)
    return { status: 'failed' }
  }
}

// Sends the CUSTOMER confirmation + ADMIN notification for a freshly saved
// order. Both emails use the SAME params object. Failures are fully
// independent (Promise.allSettled) and can never affect the saved order.
// Never throws.
async function sendOrderEmails({ order }) {
  try {
    const params = buildOrderEmailParams(order)
    const orderNumber = order?.order_number || 'unknown'

    const emails = []

    // 1) Customer confirmation — only when a real address exists.
    const customerEmail = String(params.customerEmail || '').trim().toLowerCase()
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      emails.push({
        tag: 'Customer email',
        to: [{ email: customerEmail, name: params.customerName || 'Valued Customer' }],
        templateId: process.env.BREVO_CUSTOMER_TEMPLATE_ID,
      })
    } else {
      console.log(`[ORDER EMAIL] Skipped customer email: no customer email for ${orderNumber}`)
    }

    // 2) Admin notification — always to ADMIN_EMAIL (infohallmarkexcellence@gmail.com).
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      emails.push({
        tag: 'Admin email',
        to: [{ email: adminEmail, name: 'Hallmark Excellence Admin' }],
        templateId: process.env.BREVO_ADMIN_TEMPLATE_ID,
      })
    } else {
      console.log(`[ORDER EMAIL] Skipped admin email: ADMIN_EMAIL not configured for ${orderNumber}`)
    }

    const results = await Promise.allSettled(
      emails.map(async (e) => {
        const res = await sendTemplateEmail({ ...e, params })
        if (res.status === 'sent') {
          console.log(`[ORDER EMAIL] ${e.tag} sent: ${orderNumber}`)
        }
        return res
      })
    )

    return results
  } catch (err) {
    // Absolute last-resort guard — an email problem must never reach the caller.
    console.error('[ORDER EMAIL ERROR] Unexpected email error:', err.message || err)
    return []
  }
}

module.exports = {
  formatINR,
  formatOrderDate,
  safeImage,
  buildOrderEmailParams,
  sendOrderEmails,
}
