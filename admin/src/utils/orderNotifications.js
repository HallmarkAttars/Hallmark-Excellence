// Pure helpers for the admin NEW-ORDER notification bell.
// All order detection / dedupe / persistence / formatting logic lives here
// (framework-free) so it can be unit-tested without React or the network.
//
// The bell has ONE purpose: notify the admin about NEW customer orders.
// Nothing else (products, categories, brands, employees, status changes…)
// ever produces a notification.

import { formatOrderDate } from './format'

export const STORAGE_KEY = 'ad_admin_new_orders_v1'

// Cap history so localStorage never grows without bound (oldest dropped).
const MAX_HISTORY = 20

function resolveStorage(storage) {
  return storage || (typeof window !== 'undefined' ? window.localStorage : null)
}

// Read the persisted state. Returns null when nothing is stored yet.
export function loadState(storage) {
  const store = resolveStorage(storage)
  if (!store) return null
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      seen: parsed.seen && typeof parsed.seen === 'object' ? parsed.seen : {},
      unread: Array.isArray(parsed.unread) ? parsed.unread : [],
      history: parsed.history && typeof parsed.history === 'object' ? parsed.history : {},
    }
  } catch {
    return null
  }
}

export function saveState(state, storage) {
  const store = resolveStorage(storage)
  if (!store) return
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable (private mode / quota) — notifications keep working
    // in memory for this session only.
  }
}

// First-run seeding: every currently-known order is recorded as SEEN, so the
// feature launch never floods the admin with notifications for old orders.
export function initState(orders) {
  const seen = {}
  for (const o of orders || []) {
    if (o && o.id) seen[o.id] = o.created_at || new Date().toISOString()
  }
  return { seen, unread: [], history: {} }
}

// Returns { state, changed } — the next state and whether any NEW order was
// detected. Order id is the unique key: once seen, an order can never notify
// again, so re-renders, re-polls, tab switches and listener re-inits all stay
// duplicate-free.
export function detectNewOrders(orders, state, now = Date.now()) {
  const base = state || { seen: {}, unread: [], history: {} }
  const seen = { ...base.seen }
  const unread = [...base.unread]
  const history = { ...base.history }
  const timestamp = new Date(now).toISOString()

  for (const o of orders || []) {
    if (!o || !o.id || seen[o.id]) continue
    seen[o.id] = o.created_at || timestamp
    unread.push(o.id)
    history[o.id] = {
      id: o.id,
      order_number: o.order_number || o.id,
      customer_name: o.customer_name || 'Customer',
      total: o.total_amount ?? o.total ?? 0,
      created_at: o.created_at || timestamp,
    }
  }

  // Keep history bounded (oldest entries dropped first).
  const keys = Object.keys(history)
  if (keys.length > MAX_HISTORY) {
    for (const k of keys.slice(0, keys.length - MAX_HISTORY)) delete history[k]
  }

  return { state: { seen, unread, history }, changed: unread.length !== base.unread.length }
}

// "Mark all as read" — clears the badge but NEVER touches the actual orders
// or their data; history is retained.
export function markAllRead(state) {
  if (!state || state.unread.length === 0) return state
  return { ...state, unread: [] }
}

// Marks a single order notification read (used when the admin opens it).
export function markRead(state, id) {
  if (!state) return state
  const unread = state.unread.filter((u) => u !== id)
  if (unread.length === state.unread.length) return state
  return { ...state, unread }
}

// Unread notifications, newest first, ready for rendering.
export function notificationsFor(state) {
  const base = state || { unread: [], history: {} }
  return base.unread
    .map((id) => base.history[id])
    .filter(Boolean)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// Human-friendly age for a stored order timestamp: "Just now", "5 minutes
// ago", "2 hours ago", "3 days ago", then the formatted date for older rows.
export function timeAgo(value, now = Date.now()) {
  if (!value) return ''
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, now - t)
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatOrderDate(value)
}
