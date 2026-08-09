// Shared display formatters for the admin panel — ONE source of truth so the
// Dashboard and Orders pages render currency, dates, times and item counts
// identically. All dates derive from the stored database timestamp only.

// ₹1,000 / ₹14,449 — Indian grouping, no forced decimals.
export function formatINR(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '₹0'
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

// Stored timestamp -> "07 Aug 2026" (Asia/Kolkata). Never generates a new
// timestamp; only formats the existing one.
export function formatOrderDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

// Stored timestamp -> "10:15 AM" (Asia/Kolkata).
export function formatOrderTime(value) {
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

// Stored timestamp -> "07 Aug 2026, 10:15 AM" (Asia/Kolkata).
export function formatOrderDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const time = formatOrderTime(value)
  return time ? `${formatOrderDate(value)}, ${time}` : formatOrderDate(value)
}

// 0 -> "0 Items", 1 -> "1 Item", 5 -> "5 Items"
export function formatItemsCount(value) {
  const n = Math.max(0, Math.floor(Number(value ?? 0)) || 0)
  return `${n} ${n === 1 ? 'Item' : 'Items'}`
}

// Lowercase status key used for badge/select colour classes.
export function statusKey(value) {
  return String(value || 'Pending').toLowerCase()
}

// ----------------------------------------------------------------------------
// Order search normalization — mirrors the backend's matching rules
// (server/src/controllers/orders.controller.js normalizeOrderId/normalizePhone)
// so the admin search and the live data agree on what counts as a match.
// ----------------------------------------------------------------------------

// Order IDs: strip a leading '#' (the visual marker from the checkout success
// screen), trim, uppercase — case-insensitive + whitespace-tolerant compare.
export function normalizeOrderId(raw) {
  return String(raw || '').replace(/^#/, '').trim().toUpperCase()
}

// Stored checkout phones are E.164 (+919876543210). Compare the LAST 10
// digits so +91 / 91 / local / spaced / dashed inputs all resolve to the same
// number, exactly like the tracking flow does.
export function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '').slice(-10)
}

// True when an order matches the admin search query. ONE field serves both
// Order IDs and mobile numbers — auto-detected per input:
//   "ORD-519550"          → matches the order number (case-insensitive)
//   "9876543210"          → matches the stored phone +919876543210
//   "+91 98765 43210"     → normalized to the same 10 digits
//   "91 9876543210"       → normalized to the same 10 digits
//   "INVALID-ORDER"       → no match
// An empty query matches everything (no filtering).
//
// Auto-detection: a query CONTAINING LETTERS is treated as an Order ID (the
// phone path is skipped, so "ORD-519550" can never accidentally match a phone
// that happens to contain those digits); a digit-only query runs both paths
// (order IDs also match partial digit input like "5195" as-you-type).
export function matchesOrderSearch(order, query) {
  const q = String(query || '').trim()
  if (!q) return true
  const qOrder = normalizeOrderId(q).replace(/\s+/g, '')
  const orderId = normalizeOrderId(order?.order_number || '').replace(/\s+/g, '')
  if (qOrder && orderId && orderId.includes(qOrder)) return true
  // Phone matching only for digit-only queries — a lettered query is an
  // Order ID by definition (see module comment above).
  if (/[a-zA-Z]/.test(q)) return false
  const qPhone = normalizePhone(q)
  const storedPhone = normalizePhone(order?.phone)
  return Boolean(qPhone && storedPhone && storedPhone.includes(qPhone))
}
