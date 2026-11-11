// Customer WhatsApp notification for admin-driven order-status changes.
//
// Called from updateOrderStatus AFTER the DB update succeeds. Sends either a
// free-form text (works inside WhatsApp's 24-hour customer-service window) or,
// when WHATSAPP_STATUS_TEMPLATE_NAME is set, an approved template (works
// outside the window). Every failure is swallowed by the caller so a WhatsApp
// problem can never fail the admin action.

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0'

const STATUS_COPY = {
  pending: 'We received your order and it is being reviewed.',
  processing: 'Your order is being packed and prepared for dispatch.',
  shipped: 'Your order has been shipped and is on its way.',
  delivered: 'Your order has been delivered. Thank you for shopping with us!',
  cancelled: 'Your order has been cancelled. Contact us if you need help.',
  returned: 'Your return has been recorded. Contact us if you need help.',
}

function configured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

function storefrontBase() {
  const base = (process.env.STOREFRONT_URL || process.env.FRONTEND_URL || 'https://www.areesperfumes.in')
    .trim()
    .replace(/\/+$/, '')
  return base || 'https://www.areesperfumes.in'
}

// WhatsApp expects digits with a country code, no '+'. Indian 10-digit
// numbers get 91 prefixed; longer numbers are assumed to already include it.
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length >= 11 && digits.length <= 15) return digits
  return ''
}

function parseNotes(order) {
  if (order?.notes && typeof order.notes === 'object') return order.notes
  try {
    return order?.notes ? JSON.parse(order.notes) : {}
  } catch {
    return {}
  }
}

function buildStatusText({ orderNumber, status, total, trackUrl }) {
  const label = String(status || '').trim()
  const copy = STATUS_COPY[label.toLowerCase()] || 'Your order status has been updated.'
  const totalLine = Number(total) > 0 ? `\nTotal: ₹${Number(total).toLocaleString('en-IN')}` : ''
  return (
    `*Order update*\n\n` +
    `Order *${orderNumber || '—'}* is now *${label || 'updated'}*.${totalLine}\n` +
    `${copy}\n\n` +
    `Track your order: ${trackUrl}`
  )
}

async function graphPost(body) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = data?.error?.message || `Graph error ${res.status}`
    return { ok: false, status: res.status, message }
  }
  return { ok: true, data }
}

// Returns { ok, skipped?, reason?, status?, message? }. Never throws on a
// Graph rejection — callers log and continue.
async function sendOrderStatusWhatsApp({ order, oldStatus, newStatus }) {
  if (!configured()) return { ok: false, skipped: true, reason: 'not configured' }

  const from = String(oldStatus || '').trim().toLowerCase()
  const to = String(newStatus || '').trim().toLowerCase()
  if (!to || from === to) return { ok: false, skipped: true, reason: 'unchanged' }

  const notes = parseNotes(order)
  const phone = normalizePhone(order?.phone || notes.phone || '')
  if (!phone) return { ok: false, skipped: true, reason: 'no phone' }

  const orderNumber = order?.order_number || notes.order_number || ''
  const total = Number(order?.total ?? order?.total_amount ?? notes.total_amount ?? 0)
  const trackUrl = `${storefrontBase()}/track-order`

  const templateName = process.env.WHATSAPP_STATUS_TEMPLATE_NAME
  if (templateName) {
    return graphPost({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: process.env.WHATSAPP_STATUS_TEMPLATE_LANG || 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: String(orderNumber) },
              { type: 'text', text: String(newStatus) },
              { type: 'text', text: trackUrl },
            ],
          },
        ],
      },
    })
  }

  return graphPost({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'text',
    text: {
      preview_url: true,
      body: buildStatusText({ orderNumber, status: newStatus, total, trackUrl }),
    },
  })
}

module.exports = {
  sendOrderStatusWhatsApp,
  buildStatusText,
  __test__: { normalizePhone, configured, storefrontBase },
}
