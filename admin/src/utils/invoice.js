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
  // Legal name — printed in the footer copyright line (© … All rights
  // reserved) exactly as before.
  name: 'Hallmark of Excellence',
  // The premium header brand title (reference design) — stacked centred on
  // the invoice and used for the thank-you sign-off ("— Team Arees
  // Perfumes"). Kept separate from `name` so the copyright stays the legal
  // company name.
  brandTitle: 'Arees Perfumes',
  tagline: 'The Art of Significance Attars',
  phone: '+91 98765 43210',
  email: 'hello@areesdahab.com',
  // No website is configured in the admin app — the invoice contact strip
  // simply omits it (nothing fake is ever printed).
  website: '',
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

// Customer-facing label for the STORED payment method. The business now
// takes only advance payments — the legacy 'cod' / 'Cash on Delivery'
// values DISPLAY as 'Advance Payment' (stored data is never rewritten).
// UPI keeps its own label. Shared by the checkout UI, success page, order
// tracking and the invoice so every surface agrees.
export function paymentMethodLabel(value) {
  const v = String(value ?? '').trim().toLowerCase()
  return v.includes('upi') ? 'UPI / Online Payment' : 'Advance Payment'
}

export function formatOrderForInvoice(order) {
  const notes = parseNotes(order)

  const orderId = pick(order.orderId, order.order_number, order.orderNumber)
  const createdAt = pick(order.createdAt, order.created_at)
  const status = pick(order.status, order.order_status, notes.order_status) || 'Pending'
  const paymentMethod = paymentMethodLabel(
    pick(order.payment_method, notes.payment_method) || 'Cash On Delivery'
  )
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
    // Stored line figures — the ONLY authoritative values. The displayed
    // RATE/QTY columns below are derived presentation fields built from
    // these stored numbers (never recalculated, never invented).
    const unitPrice = Number(it.unit_price ?? it.price ?? it.selected_price ?? 0)
    const quantity = Number(it.quantity ?? it.qty ?? 1)
    // Line total stays exactly the stored unit_price × quantity — the RATE
    // column may show a per-piece price, but AMOUNT is never re-derived
    // from it (a 126-piece bulk line shows RATE ₹42/pcs + AMOUNT ₹5,292).
    const amount = Number.isFinite(unitPrice) && Number.isFinite(quantity)
      ? unitPrice * quantity
      : 0
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
          pieces: it.actual_piece_quantity != null ? Number(it.actual_piece_quantity) : quantity,
          price: it.pack_price != null ? Number(it.pack_price) : null,
        }
      : null
    // Detail line: BRAND · SIZE — only when the saved snapshot actually
    // carries those values. Nothing is invented.
    const brand = it.brand_name || ''
    const detail = [brand, size].filter(Boolean).join(' · ')

    // RATE/QTY display for piece-based lines (the reference design):
    //   • a piece-count line (brand bulk — e.g. 126 Pieces @ ₹42) shows
    //     QTY = pieces and RATE = per-piece price (bulk_per_unit wins, then
    //     the variant's per-unit price)
    //   • a Pieces variant bought N× (e.g. 2 × "100 Pieces" variant) keeps
    //     QTY = the customer's quantity with RATE = per-unit price
    //   • pack purchases keep their pack price/QTY (existing behaviour)
    // All values come from the SAVED SNAPSHOT — never live prices, never
    // a recalculation.
    const isPack = it.pack_id != null
    const isPiecesUnit = String(it.quantity_unit ?? '').trim() === 'Pieces'
    const pieces =
      it.pieces != null ? Number(it.pieces)
      : it.unit_pieces != null ? Number(it.unit_pieces)
      : null
    const unitPieces = it.unit_pieces != null ? Number(it.unit_pieces) : null
    // Applied per-unit price from the stored snapshot (bulk price wins).
    const perPiece =
      it.bulk_per_unit != null ? Number(it.bulk_per_unit)
      : it.variant_price_per_unit != null ? Number(it.variant_price_per_unit)
      : it.normal_per_piece != null ? Number(it.normal_per_piece)
      : isPiecesUnit && pieces != null && pieces > 0 ? unitPrice / pieces
      : null
    // A piece-count line = the whole line IS one piece selection (126 Pieces
    // with unit_pieces 126). A variant bought N× has pieces = size × N, so
    // pieces !== unit_pieces and QTY stays the customer's quantity.
    const isPieceCountLine =
      isPiecesUnit &&
      pieces != null &&
      pieces > 0 &&
      (unitPieces == null || unitPieces === pieces)
    const displayQty = isPieceCountLine ? pieces : quantity
    const displayRate =
      !isPack && isPiecesUnit && perPiece != null && perPiece > 0
        ? perPiece
        : unitPrice

    return {
      name: it.product_name || it.name || 'Product',
      // Thumbnail from the saved snapshot — best-effort; empty string simply
      // hides the small thumbnail on the invoice (no broken image).
      image: it.image || '',
      detail,
      brand,
      size,
      pack,
      qty: Number.isFinite(displayQty) ? displayQty : 1,
      rate: Number.isFinite(displayRate) ? displayRate : 0,
      // Per-piece RATE cells append "/pcs." (reference design); pack and
      // non-piece lines keep a plain figure.
      ratePerPiece: !isPack && isPiecesUnit && displayRate > 0,
      amount,
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
