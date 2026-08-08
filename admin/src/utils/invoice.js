// ============================================================================
// INVOICE — single source of truth for invoice data & formatting (admin).
//
// This is the SAME formatter the storefront uses (utils/invoice.js there) so
// customer invoices and admin invoices are always identical. The company
// block is self-contained here because the admin app has no content.js —
// values mirror the storefront BUSINESS config exactly.
//
// It always derives from the SAVED ORDER RECORD — never from the cart, and
// never by re-fetching live product prices. Historical pricing is preserved.
// ============================================================================

export const INVOICE_COMPANY = {
  name: 'Hallmark of Excellence',
  phone: '+91 98765 43210',
  email: 'hello@areesdahab.com',
  address: '83 Moore Street, Mannady, Chennai, Tamil Nadu 600001',
  gstNote: 'Prices are inclusive of applicable GST.',
  thanks: 'Thank you for your order.',
}

// Reuse the admin's existing formatters (utils/format.js) — ONE source of
// truth for currency and Asia/Kolkata date/time.
import { formatINR, formatOrderDate, formatOrderTime } from './format'
export { formatINR }

// Thin wrappers: the invoice HIDES absent timestamps ('' instead of '—').
export function formatInvoiceDate(value) {
  return value ? formatOrderDate(value) : ''
}
export function formatInvoiceTime(value) {
  return value ? formatOrderTime(value) : ''
}

// Download filename: Invoice-ORD-592546.pdf (Order ID sanitized).
export function invoiceFileName(orderId) {
  const safe = String(orderId || 'ORDER').replace(/[^\w-]/g, '').slice(0, 40)
  return `Invoice-${safe || 'ORDER'}.pdf`
}

// Parse the notes JSONB (string or already-parsed object); never throws.
function parseNotes(order) {
  if (!order) return {}
  if (order.notes && typeof order.notes === 'string') {
    try {
      return JSON.parse(order.notes)
    } catch {
      return {}
    }
  }
  if (order.notes && typeof order.notes === 'object') return order.notes
  return {}
}

// Pick the first present value — hides legacy/null/undefined gracefully.
function pick(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return ''
}

export function formatOrderForInvoice(order) {
  const notes = parseNotes(order)

  const orderId = pick(order.orderId, order.order_number, order.orderNumber)
  const createdAt = pick(order.createdAt, order.created_at)
  const status = pick(order.status, order.order_status, notes.order_status) || 'Pending'
  const paymentMethod = pick(order.payment_method, notes.payment_method) || 'Cash On Delivery'
  const total = Number(order.total ?? order.total_amount ?? notes.total_amount ?? 0)

  const customer = {
    name: pick(order.customer_name, notes.customer_name),
    phone: pick(order.phone, notes.phone),
    email: pick(order.email, notes.email),
    address: pick(order.address, notes.address),
    pincode: pick(order.pincode, notes.pincode),
    locality: pick(order.locality, notes.locality),
    city: pick(order.city, notes.city),
    state: pick(order.state, notes.state),
  }

  // Items straight from the saved order snapshot (variants included). Line
  // total = unit price × quantity; the SAVED ORDER TOTAL remains the final
  // authoritative figure on the invoice.
  const rawItems = Array.isArray(order.items) ? order.items : notes.items
  const items = (Array.isArray(rawItems) ? rawItems : []).map((it) => {
    const rate = Number(it.unit_price ?? it.price ?? it.selected_price ?? 0)
    const qty = Number(it.quantity ?? it.qty ?? 1)
    const detail =
      it.variant_label ||
      (it.quantity_value != null && it.quantity_unit
        ? `${it.quantity_value} ${it.quantity_unit}`
        : '')
    return {
      name: it.product_name || it.name || 'Product',
      detail: detail || '',
      qty: Number.isFinite(qty) ? qty : 1,
      rate: Number.isFinite(rate) ? rate : 0,
      amount: Number.isFinite(rate) && Number.isFinite(qty) ? rate * qty : 0,
    }
  })

  const subtotal = items.reduce((sum, it) => sum + it.amount, 0)

  // Delivery / Transport: only a REAL stored charge is printed as a figure.
  // The business states "To be confirmed" otherwise — never silently ₹0.
  const shipping = Number(order.shipping_charge ?? notes.shipping_charge ?? 0)
  const delivery = Number.isFinite(shipping) && shipping > 0 ? shipping : null

  // BILL TO block — address, then "locality, city, state - pincode".
  const addressLines = []
  if (customer.address) addressLines.push(customer.address)
  const area = [customer.locality, customer.city, customer.state].filter(Boolean).join(', ')
  if (area) addressLines.push(area)
  if (customer.pincode) {
    if (addressLines.length > 0) {
      addressLines[addressLines.length - 1] = `${addressLines[addressLines.length - 1]} - ${customer.pincode}`
    } else {
      addressLines.push(customer.pincode)
    }
  }

  return {
    company: INVOICE_COMPANY,
    orderId,
    date: formatInvoiceDate(createdAt),
    time: formatInvoiceTime(createdAt),
    status,
    paymentMethod,
    total: Number.isFinite(total) ? total : 0,
    subtotal,
    delivery, // number | null  (null => "To be confirmed")
    customer,
    addressLines,
    items,
  }
}
