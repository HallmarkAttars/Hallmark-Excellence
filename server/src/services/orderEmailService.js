// services/orderEmailService.js
// ---------------------------------------------------------------------------
// Brevo transactional order emails — CUSTOMER order confirmation + ADMIN new
// order notification + ORDER STATUS updates (Processing, Shipped) for
// Hallmark Excellence Attars.
//
// CONTRACT (read before editing):
//  * This module NEVER throws. A Brevo failure must never fail an order or
//    order-status update.
//  * sendOrderEmails() is called ONLY from the backend order-creation flow,
//    AFTER the order row has been saved in the database.
//  * sendOrderStatusEmail() is called ONLY when order status actually changes
//    (oldStatus !== newStatus), AFTER the update succeeds in the database.
//  * Emails are built from params objects derived from the SAVED/UPDATED
//    order row (never from request-body values, never from mock data).
//  * The API key lives only in the server environment. It is never logged,
//    never returned to clients, and never exposed to any frontend.
// ---------------------------------------------------------------------------

const brevo = require('@getbrevo/brevo')
const { validateEmailSyntax } = require('../utils/emailValidation')

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

// Builds ONE params object shared by templates from the SAVED order row.
// Field names below support both camelCase and snake_case contracts with Brevo templates
// (e.g. {{params.order_number}}, {{params.orderId}}, {{params.customer_name}}, etc.)
function buildOrderEmailParams(order) {
  let notesInfo = {}
  try {
    if (order && order.notes) {
      notesInfo = typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes
    }
  } catch {
    notesInfo = {}
  }

  const itemsSource = Array.isArray(notesInfo.items)
    ? notesInfo.items
    : (Array.isArray(order?.items) ? order.items : [])

  const items = itemsSource.map((it) => {
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

  const subtotal = Number(order?.subtotal ?? order?.total_amount ?? 0)
  const discount = Number(order?.discount ?? 0)
  const shipping = Number(order?.shipping_charge ?? 0)
  const tax = 0 // the current system does not collect tax separately
  const total = Number(order?.total ?? order?.total_amount ?? subtotal)

  const orderNumber = order?.order_number || ''
  const orderDate = formatOrderDate(order?.created_at)
  const orderStatus = order?.order_status || 'Pending'
  const trackUrl = buildTrackOrderUrl(orderNumber)

  const customerName = notesInfo.customer_name || order?.customer_name || 'Valued Customer'
  const customerEmail = notesInfo.email || notesInfo.customer_email || order?.customer_email || order?.email || ''
  const phone = notesInfo.phone || order?.phone || ''
  const message = notesInfo.message || order?.message || ''

  const paymentLabel =
    String(order?.payment_method || '').toLowerCase().includes('upi')
      ? 'UPI / Online Payment'
      : 'Advance Payment'
  const paymentStatus = order?.payment_status || 'Pending'

  return {
    // Order identifiers
    orderId: orderNumber,
    order_id: orderNumber,
    orderNumber: orderNumber,
    order_number: orderNumber,
    orderDate,
    order_date: orderDate,
    orderStatus,
    order_status: orderStatus,

    // Track Order deep-link
    trackOrderUrl: trackUrl,
    track_order_url: trackUrl,

    // Customer
    customerName,
    customer_name: customerName,
    customerEmail,
    customer_email: customerEmail,
    phone,
    message,

    // Products — loop with {% for item in params.items %}
    items,

    // Price summary
    subtotal: formatINR(subtotal),
    subtotalRaw: subtotal,
    subtotal_raw: subtotal,
    discount: formatINR(discount),
    discountRaw: discount,
    discount_raw: discount,
    shipping: formatINR(shipping),
    shippingRaw: shipping,
    shipping_raw: shipping,
    tax: formatINR(tax),
    taxRaw: tax,
    tax_raw: tax,
    total: formatINR(total),
    totalRaw: total,
    total_raw: total,

    // Payment
    paymentMethod: paymentLabel,
    payment_method: paymentLabel,
    paymentStatus,
    payment_status: paymentStatus,

    // Delivery
    address: notesInfo.address || order?.address || '',
    addressLine2: notesInfo.address_line2 || '',
    address_line2: notesInfo.address_line2 || '',
    locality: notesInfo.locality || '',
    city: notesInfo.city || order?.city || '',
    state: notesInfo.state || order?.state || '',
    pincode: notesInfo.pincode || order?.pincode || '',
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
    return { status: 'skipped', reason: 'BREVO_API_KEY not configured' }
  }
  if (!Number.isFinite(id) || id <= 0) {
    console.log(`[ORDER EMAIL] Skipped ${tag}: template id not configured`)
    return { status: 'skipped', reason: 'Template ID not configured' }
  }

  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Brevo request timed out')), REQUEST_TIMEOUT_MS)
    )
    // v6 SDK request object — templateId / to / params are the exact fields
    // the Brevo templates expect.
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
    // Log only the generic message + HTTP status + response body (when available)
    // never the API key, tokens or payment data.
    const status = err?.statusCode ?? err?.status ?? err?.response?.statusCode ?? err?.response?.status
    const body = err?.response?.body || err?.response?.data || err?.body
    const bodyStr = body ? (typeof body === 'object' ? JSON.stringify(body) : String(body)) : ''
    console.error(`[ORDER EMAIL ERROR] ${tag} failed${status ? ` (HTTP ${status})` : ''}: ${err.message || err}${bodyStr ? ` | Response: ${bodyStr}` : ''}`)
    return { status: 'failed', error: err }
  }
}

// Sends the CUSTOMER confirmation + ADMIN notification for a freshly saved order.
// Never throws.
async function sendOrderEmails({ order }) {
  try {
    const params = buildOrderEmailParams(order)
    const orderNumber = order?.order_number || 'unknown'

    const emails = []

    // 1) Customer confirmation — uses BREVO_ORDER_CONFIRMATION_TEMPLATE_ID (fallback BREVO_CUSTOMER_TEMPLATE_ID)
    const customerEmail = String(params.customerEmail || '').trim().toLowerCase()
    if (validateEmailSyntax(customerEmail)) {
      emails.push({
        tag: 'Customer confirmation email',
        to: [{ email: customerEmail, name: params.customerName || 'Valued Customer' }],
        templateId: process.env.BREVO_ORDER_CONFIRMATION_TEMPLATE_ID || process.env.BREVO_CUSTOMER_TEMPLATE_ID,
      })
    } else {
      console.log(`[ORDER EMAIL] Skipped customer confirmation email: no customer email for ${orderNumber}`)
    }

    // 2) Admin notification — always to ADMIN_EMAIL (infohallmarkexcellence@gmail.com).
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
    if (validateEmailSyntax(adminEmail)) {
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

// Sends status change emails (Processing, Shipped, Cancelled) to the customer.
// Only sends when oldStatus !== newStatus.
// Never throws.
async function sendOrderStatusEmail({ order, oldStatus, newStatus }) {
  try {
    const fromStatus = (oldStatus || '').trim().toLowerCase()
    const toStatus = (newStatus || '').trim().toLowerCase()

    // CRITICAL: Do not send duplicate emails if status has not changed or is empty
    if (!toStatus || fromStatus === toStatus) {
      return { status: 'skipped', reason: 'Status unchanged or empty' }
    }

    let templateId = null
    let tag = ''

    if (toStatus === 'processing') {
      templateId = process.env.BREVO_ORDER_PROCESSING_TEMPLATE_ID
      tag = 'Processing email'
    } else if (toStatus === 'shipped') {
      templateId = process.env.BREVO_ORDER_SHIPPED_TEMPLATE_ID
      tag = 'Shipped email'
    } else if (toStatus === 'cancelled') {
      templateId = process.env.BREVO_ORDER_CANCELLED_TEMPLATE_ID
      tag = 'Cancellation email'
    } else {
      // No email automated for other statuses (Pending, Delivered, Returned)
      return { status: 'skipped', reason: `No email automation for status "${newStatus}"` }
    }

    const params = buildOrderEmailParams(order)
    const orderNumber = order?.order_number || 'unknown'
    const customerEmail = String(params.customerEmail || '').trim().toLowerCase()

    if (!validateEmailSyntax(customerEmail)) {
      if (toStatus === 'cancelled') {
        console.log(`[ORDER EMAIL] Customer email missing or invalid; cancellation email skipped for ${orderNumber}`)
      } else {
        console.log(`[ORDER EMAIL] Skipped ${tag}: no customer email for ${orderNumber}`)
      }
      return { status: 'skipped', reason: 'No valid customer email' }
    }

    const to = [{ email: customerEmail, name: params.customerName || 'Valued Customer' }]
    const res = await sendTemplateEmail({ tag, to, templateId, params })
    if (res.status === 'sent') {
      if (toStatus === 'cancelled') {
        console.log(`[ORDER EMAIL] Cancellation email sent successfully:\norder=${orderNumber}\nemail=${customerEmail}\ntemplate=${templateId}`)
      } else {
        console.log(`[ORDER EMAIL] ${tag} sent: ${orderNumber}`)
      }
    }
    return res
  } catch (err) {
    console.error('[ORDER EMAIL ERROR] Unexpected status email error:', err.message || err)
    return { status: 'failed', error: err }
  }
}

module.exports = {
  formatINR,
  formatOrderDate,
  safeImage,
  buildOrderEmailParams,
  sendTemplateEmail,
  sendOrderEmails,
  sendOrderStatusEmail,
}
