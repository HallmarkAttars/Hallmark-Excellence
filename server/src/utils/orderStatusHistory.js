// Order status-history timestamps for the customer order-progress timeline.
// Unit-tested in orderStatusHistory.test.js.
//
// WHY: the storefront's Order Progress timeline (TrackOrder) shows a real
// date under each completed step. The orders table has NO per-status
// timestamp columns, so transition times are recorded inside the existing
// orders.notes JSONB under `status_history` — the same additive, zero-
// migration pattern the live table already uses for customer_name, phone,
// items, brand_bulk, etc. Historical orders are untouched: rows without a
// status_history simply keep showing "—" for the steps that never happened.
//
// Shape (written by updateOrderStatus, read by the tracking endpoints):
//   notes.status_history = {
//     "Processing": "2026-08-13T...",   // first transition only
//     "Shipped":    "2026-08-14T...",
//     "Delivered":  "2026-08-15T..."
//   }
// The "Order Placed" step is intentionally NOT recorded: its date must be
// the ORIGINAL order creation timestamp (created_at), which every tracking
// response already carries and the storefront already falls back to.
// The keys are the EXACT labels the storefront stepTimestamp() looks up
// (label / lowercase / uppercase), so the timeline lights up with no
// storefront change.

// Key under which the timeline lives inside orders.notes.
const STATUS_HISTORY_KEY = 'status_history'

// Canonical stored status → customer-facing timeline label. These are the
// labels rendered under the timeline steps in the storefront. "Pending" is
// deliberately absent — the "Order Placed" step always uses created_at.
const STATUS_HISTORY_LABELS = {
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
}

// Robustly parse an orders row's `notes` column into a plain object.
//
// The live table stores notes in three shapes (verified against the project
// database):
//   1. a JSON *object* — properly-encoded jsonb (PostgREST returns the
//      parsed object directly)
//   2. a JSON *string* — the shape createOrder writes today, stored as a
//      JSON string inside the jsonb column
//   3. anything else / malformed — treated as {} so a bad note can never
//      block a status change or a tracking lookup
function parseOrderNotes(row) {
  if (!row || row.notes == null) return {}
  if (typeof row.notes === 'object') return row.notes
  try {
    const parsed = JSON.parse(row.notes)
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed
  } catch {
    return {}
  }
}

// Serialize a notes object the same way createOrder writes it — as a JSON
// *string* inside the jsonb column (the established storage shape). The
// tracking parser above handles this shape on the way back out.
function stringifyOrderNotes(notesInfo) {
  return JSON.stringify(notesInfo || {})
}

// Record a status transition timestamp. Returns a NEW notes object.
//   - The status is mapped to its timeline label ("Processing" → the
//     "Processing" step).
//   - First write wins: re-setting a status never overwrites the original
//     transition time.
//   - Unknown / empty statuses are ignored (nothing is added).
//   - All other notes fields are preserved untouched.
function recordStatusTimestamp(notesInfo, status, now = new Date()) {
  const label = STATUS_HISTORY_LABELS[String(status || '').toLowerCase()]
  if (!label) return notesInfo
  const prev = notesInfo || {}
  const history =
    prev[STATUS_HISTORY_KEY] && typeof prev[STATUS_HISTORY_KEY] === 'object'
      ? { ...prev[STATUS_HISTORY_KEY] }
      : {}
  if (history[label] == null) {
    history[label] = now.toISOString()
  }
  return { ...prev, [STATUS_HISTORY_KEY]: history }
}

module.exports = {
  STATUS_HISTORY_KEY,
  STATUS_HISTORY_LABELS,
  parseOrderNotes,
  stringifyOrderNotes,
  recordStatusTimestamp,
}
