// Pure dashboard computations. Everything is derived from the REAL order and
// product arrays fetched through the existing services — no invented values.
// The revenue rule mirrors the backend stats endpoint exactly
// (server/src/controllers/orders.controller.js): non-cancelled orders only,
// summed on total_amount.

import { formatDateKey } from './packing'

const DAY_MS = 86400000

// Canonical order statuses (must match the values the backend writes).
export const STATUS_KEYS = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

export const PERIOD_OPTIONS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '3m', label: '3 Months' },
  { value: '1y', label: '1 Year' },
]

function parseTs(value) {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

function canonicalStatus(value) {
  return STATUS_KEYS.find((k) => k.toLowerCase() === String(value || '').toLowerCase()) || null
}

// NaN-safe amount — one bad row must never poison a dashboard total.
function toAmount(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function isCancelled(order) {
  return String(order?.status || order?.order_status || '').toLowerCase() === 'cancelled'
}

// { Pending: n, Processing: n, Shipped: n, Delivered: n, Cancelled: n }
export function statusCounts(orders) {
  const counts = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]))
  for (const o of orders || []) {
    const s = canonicalStatus(o.status)
    if (s) counts[s] += 1
  }
  return counts
}

// Sum of non-cancelled order totals — same rule as /api/admin/stats.
export function revenueTotal(orders) {
  return (orders || []).reduce((sum, o) => {
    if (isCancelled(o)) return sum
    return sum + toAmount(o.total_amount ?? o.total)
  }, 0)
}

export function ordersToday(orders, now = new Date()) {
  const from = new Date(now)
  from.setHours(0, 0, 0, 0)
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)
  return (orders || []).filter((o) => {
    const ts = parseTs(o.created_at)
    return ts != null && ts >= from.getTime() && ts <= to.getTime()
  }).length
}

// Products whose created_at falls inside the current calendar month.
export function productsThisMonth(products, now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  return (products || []).filter((p) => {
    const ts = parseTs(p.created_at)
    return ts != null && ts >= from
  }).length
}

// Revenue this month vs last month → { current, previous, pct } | null.
export function monthOverMonth(orders, now = new Date()) {
  const startThis = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
  let current = 0
  let previous = 0
  for (const o of orders || []) {
    if (isCancelled(o)) continue
    const ts = parseTs(o.created_at)
    if (ts == null) continue
    const amt = toAmount(o.total_amount ?? o.total)
    if (ts >= startThis) current += amt
    else if (ts >= startPrev) previous += amt
  }
  if (current === 0 && previous === 0) return null
  if (previous <= 0) return { current, previous, pct: null }
  return { current, previous, pct: ((current - previous) / previous) * 100 }
}

// Revenue buckets for the SVG chart. Returns [{ label, value }] oldest→newest.
// 7d/30d → daily · 3m → weekly (13 Mondays) · 1y → monthly (12 months).
export function revenueBuckets(orders, period, now = new Date()) {
  const buckets = []

  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const map = new Map()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS)
      map.set(formatDateKey(d), {
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value: 0,
      })
    }
    for (const o of orders || []) {
      const ts = parseTs(o.created_at)
      if (ts == null || isCancelled(o)) continue
      const d = new Date(ts)
      const b = map.get(formatDateKey(d))
      if (b) b.value += toAmount(o.total_amount ?? o.total)
    }
    return [...map.values()]
  }

  if (period === '3m') {
    // Current week starts Monday (local).
    const nowD = new Date(now)
    const dow = (nowD.getDay() + 6) % 7 // Mon = 0
    const weekStart = new Date(nowD)
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - dow)
    const map = new Map()
    for (let i = 12; i >= 0; i--) {
      const d = new Date(weekStart.getTime() - i * 7 * DAY_MS)
      map.set(formatDateKey(d), {
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value: 0,
      })
    }
    const weekKey = (ts) => {
      const d = new Date(ts)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      return formatDateKey(d)
    }
    for (const o of orders || []) {
      const ts = parseTs(o.created_at)
      if (ts == null || isCancelled(o)) continue
      const b = map.get(weekKey(ts))
      if (b) b.value += toAmount(o.total_amount ?? o.total)
    }
    return [...map.values()]
  }

  // 1y → 12 monthly buckets.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const map = new Map()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth() - i, 1)
    map.set(`${d.getFullYear()}-${d.getMonth() + 1}`, {
      label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      value: 0,
    })
  }
  for (const o of orders || []) {
    const ts = parseTs(o.created_at)
    if (ts == null || isCancelled(o)) continue
    const d = new Date(ts)
    const b = map.get(`${d.getFullYear()}-${d.getMonth() + 1}`)
    if (b) b.value += toAmount(o.total_amount ?? o.total)
  }
  return [...map.values()]
}

// Top-selling products aggregated from order item snapshots (name, qty,
// revenue, image) — newest data always wins for the image.
export function topProducts(orders, limit = 5) {
  const agg = new Map()
  for (const o of orders || []) {
    for (const it of o.items || []) {
      const name = it.product_name ?? it.name ?? 'Item'
      const qty = Number(it.quantity ?? it.qty ?? 1)
      const subtotal = Number(it.subtotal ?? Number(it.unit_price ?? it.price ?? 0) * qty)
      const cur = agg.get(name) || { name, qty: 0, revenue: 0, image: '' }
      cur.qty += qty
      cur.revenue += subtotal
      if (!cur.image && it.image) cur.image = it.image
      agg.set(name, cur)
    }
  }
  return [...agg.values()].sort((a, b) => b.qty - a.qty).slice(0, limit)
}

// Orders awaiting manual payment follow-up: UPI + not yet marked Paid.
export function pendingPaymentOrders(orders) {
  return (orders || []).filter((o) => {
    const label = String(o.payment_method || '').toLowerCase()
    const code = String(o.payment_code || o.payment_method || '').toLowerCase()
    const isUpi = label.includes('upi') || code === 'upi'
    const paid = String(o.payment_status || '').toLowerCase() === 'paid'
    return isUpi && !paid
  })
}
