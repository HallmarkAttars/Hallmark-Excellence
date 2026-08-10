// Pure helpers for the admin PACKING / SHIPPING LABEL feature.
// Framework-free so the address building, range presets and filename rules
// are unit-testable. No prices, payment or email data ever enters a label.

// YYYY-MM-DD in LOCAL time (matches the date inputs + created_at display).
export function formatDateKey(d) {
  const x = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(x.getTime())) return ''
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

// Resolve a range preset to { from, to } Date boundaries (local time).
// 'custom' is handled by the caller's explicit From/To date inputs.
export function presetBounds(preset, now = new Date()) {
  switch (preset) {
    case 'yesterday': {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      return { from: startOfDay(y), to: endOfDay(y) }
    }
    case '7d': {
      const f = new Date(now)
      f.setDate(f.getDate() - 6)
      return { from: startOfDay(f), to: endOfDay(now) }
    }
    case '30d': {
      const f = new Date(now)
      f.setDate(f.getDate() - 29)
      return { from: startOfDay(f), to: endOfDay(now) }
    }
    case 'today':
    default:
      return { from: startOfDay(now), to: endOfDay(now) }
  }
}

// Orders whose created_at falls within [from, to] (inclusive). Orders without
// a parseable timestamp are never included.
export function ordersInDateRange(orders, { from, to }) {
  const f = from ? new Date(from).getTime() : -Infinity
  const t = to ? new Date(to).getTime() : Infinity
  return (orders || []).filter((o) => {
    const ts = o && o.created_at ? new Date(o.created_at).getTime() : NaN
    if (Number.isNaN(ts)) return false
    return ts >= f && ts <= t
  })
}

// Delivery address lines for the label — shows only what actually exists,
// never "undefined". Mirrors the invoice's address composition.
export function buildAddressLines(order) {
  const lines = []
  if (order?.address) lines.push(String(order.address))
  const area = [order?.locality, order?.city, order?.state].filter(Boolean).join(', ')
  if (area) lines.push(area)
  if (order?.pincode) {
    const pin = String(order.pincode)
    if (lines.length > 0) lines[lines.length - 1] = `${lines[lines.length - 1]} - ${pin}`
    else lines.push(pin)
  }
  return lines.filter(Boolean)
}

// The ONLY data a packing label carries: order id, customer, mobile, address.
export function packingLabelData(order) {
  return {
    orderId: order?.order_number || order?.id || '—',
    customerName: order?.customer_name || '—',
    phone: order?.phone || '—',
    addressLines: buildAddressLines(order),
  }
}

// packing-label-ORD-519550.pdf
export function packingLabelFileName(orderId) {
  const safe = String(orderId || 'order').replace(/[^\w-]+/g, '_')
  return `packing-label-${safe}.pdf`
}

// packing-labels-2026-08-09-to-2026-08-10.pdf
export function packingLabelsFileName(from, to) {
  const a = formatDateKey(from || new Date())
  const b = formatDateKey(to || new Date())
  return `packing-labels-${a}-to-${b}.pdf`
}
