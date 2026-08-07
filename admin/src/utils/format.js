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
