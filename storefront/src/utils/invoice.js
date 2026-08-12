// ============================================================================
// INVOICE — single source of truth for invoice data & formatting.
//
// ONE formatter (formatOrderForInvoice) feeds every invoice surface:
//   - the on-screen <OrderInvoice> component
//   - the A4 PDF download (jsPDF)
//   - the dedicated print window
//
// It always derives from the SAVED ORDER RECORD — never from the cart, and
// never by re-fetching live product prices. Historical pricing is preserved.
//
// The formatter accepts BOTH shapes the codebase stores:
//   - a flat enriched order (admin / tracking API): customer_name, phone,
//     address, items, total_amount, status, ...
//   - a raw orders row whose customer fields + items live inside a JSON
//     `notes` string (checkout response) — parsed transparently here.
// ============================================================================

import { BUSINESS, INVOICE } from '../data/content'

// Company block printed on the invoice. Contact details come from the
// existing BUSINESS config — nothing is invented here. If a value is not
// configured it is simply left out (no fake GSTIN / registration numbers).
export const INVOICE_COMPANY = {
  name: INVOICE.companyName || BUSINESS.name,
  tagline: BUSINESS.tagline || '',
  phone: BUSINESS.phoneDisplay || '',
  email: BUSINESS.email || '',
  // Not configured today (BUSINESS has no website) — the contact strip
  // simply omits it; nothing fake is ever printed.
  website: BUSINESS.website || '',
  address: BUSINESS.address || '',
  gstNote: INVOICE.gstNote || 'Prices are inclusive of applicable GST.',
  thanks: INVOICE.thanks || 'Thank you for your order.',
}

// ₹1,000 / ₹14,449.50 — Indian grouping, up to 2 decimals, never "₹NaN".
export function formatINR(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

// Stored Supabase timestamp -> "07 Aug 2026" (Asia/Kolkata). Formats ONLY the
// stored timestamp — never generates a new one.
export function formatInvoiceDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

// Stored Supabase timestamp -> "4:13 PM" (Asia/Kolkata).
export function formatInvoiceTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(d)
    .replace(/\bam\b/i, 'AM')
    .replace(/\bpm\b/i, 'PM')
}

// Download filename: Invoice-ORD-592546.pdf (Order ID sanitized).
export function invoiceFileName(orderId) {
  const safe = String(orderId || 'ORDER').replace(/[^\w-]/g, '').slice(0, 40)
  return `Invoice-${safe || 'ORDER'}.pdf`
}

// Brand name split into two centred lines — "Hallmark of Excellence" becomes
// ["HALLMARK OF", "EXCELLENCE"] (uppercased, split at the last space). The
// luxury header renders these stacked under one another with the tagline
// below. A single-word name simply returns one line.
export function invoiceBrandLines(name) {
  const n = String(name || '').trim().toUpperCase()
  const idx = n.lastIndexOf(' ')
  if (idx > 0 && idx < n.length - 1) return [n.slice(0, idx), n.slice(idx + 1)]
  return [n]
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

// ----------------------------------------------------------------------------
// THE formatter. Returns a plain, render-ready invoice object.
// ----------------------------------------------------------------------------
export function formatOrderForInvoice(order) {
  const notes = parseNotes(order)

  const orderId = pick(order.orderId, order.order_number, order.orderNumber)
  const createdAt = pick(order.createdAt, order.created_at)
  const status = pick(order.status, order.order_status, notes.order_status) || 'Pending'
  const paymentMethod = pick(order.payment_method, notes.payment_method) || 'Cash On Delivery'
  // Payment status always starts 'Pending' (there is no gateway); only staff
  // can mark an order 'Paid' after manually receiving the payment.
  const paymentStatus = pick(order.payment_status, notes.payment_status) || 'Pending'
  // Document type — INVOICE by default; an ESTIMATE/QUOTATION flag stored on
  // the order record (document_type / documentType) switches the title. The
  // invoice component also accepts an explicit documentType prop override.
  const rawDocType = String(
    pick(order.document_type, order.documentType, notes.document_type, notes.documentType) || ''
  ).toUpperCase()
  const documentType = rawDocType === 'ESTIMATE' || rawDocType === 'QUOTATION' ? 'ESTIMATE' : 'INVOICE'
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
    const size =
      it.variant_label ||
      (it.quantity_value != null && it.quantity_unit
        ? `${it.quantity_value} ${it.quantity_unit}`
        : '')
    // PACK purchase metadata — preserved from the order snapshot so invoices
    // show "Pack of 10 · 3 packs · 30 pieces" (never ambiguous pack/piece
    // counts).
    const pack = it.pack_id != null
      ? {
          id: it.pack_id,
          name: it.pack_name || (it.pack_size != null ? `Pack of ${it.pack_size}` : ''),
          size: it.pack_size != null ? Number(it.pack_size) : null,
          packs: it.number_of_packs != null ? Number(it.number_of_packs) : null,
          pieces: it.actual_piece_quantity != null ? Number(it.actual_piece_quantity) : qty,
          price: it.pack_price != null ? Number(it.pack_price) : null,
        }
      : null
    // Detail line: BRAND · SIZE — only when the saved snapshot actually
    // carries those values. Nothing is invented.
    const brand = it.brand_name || ''
    const detail = [brand, size].filter(Boolean).join(' · ')
    return {
      name: it.product_name || it.name || 'Product',
      // Thumbnail from the saved snapshot — best-effort; empty string simply
      // hides the small thumbnail on the invoice (no broken image).
      image: it.image || '',
      detail,
      brand,
      size,
      pack,
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
    paymentStatus,
    documentType,
    total: Number.isFinite(total) ? total : 0,
    subtotal,
    delivery, // number | null  (null => "To be confirmed")
    customer,
    addressLines,
    items,
  }
}
