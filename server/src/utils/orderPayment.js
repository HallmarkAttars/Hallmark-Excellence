// Payment-method + payment-status helpers for order creation and staff
// payment confirmation.
//
// There is NO payment gateway: customers only SELECT how they will pay, new
// orders always start with payment_status 'Pending', and only authorized
// staff can mark an order 'Paid' after actually receiving the payment.
//
// Pure functions (no I/O, no Supabase) so they are unit-tested in isolation
// (orderPayment.test.js) — the orders controller wires them into the
// request/response flow.

// The only payment methods a customer can SELECT (cod | upi). The display
// label is stored on the existing orders.payment_method column; the canonical
// code rides in the notes JSONB for exact matching.
const PAYMENT_METHODS = {
  cod: 'Cash on Delivery',
  upi: 'UPI / Online Payment',
}

// Payment statuses staff can set. New orders always start 'Pending'; only an
// authorized staff action can mark an order 'Paid' — nothing is ever
// auto-confirmed (there is no gateway).
const PAYMENT_STATUSES = ['Pending', 'Paid']

// Resolve the customer's selected payment method into its canonical code and
// the display label stored on the orders.payment_method column.
//
//   'cod' | 'COD' | ' cod ' | missing  -> { code: 'cod', label: 'Cash on Delivery' }
//   'upi' | 'UPI' | ' Upi '             -> { code: 'upi', label: 'UPI / Online Payment' }
//   anything unknown                    -> { code: 'cod', label: 'Cash on Delivery' }
//
// Unknown or missing values fall back to Cash on Delivery so legacy clients
// never break checkout.
function resolvePaymentMethod(raw) {
  const normalized = String(raw ?? '').trim().toLowerCase()
  const code = Object.prototype.hasOwnProperty.call(PAYMENT_METHODS, normalized)
    ? normalized
    : 'cod'
  return { code, label: PAYMENT_METHODS[code] }
}

// Resolve a payment-status update into a canonical value accepted by the live
// orders_payment_status_check constraint. Matching is case-insensitive and
// trims surrounding whitespace. Returns null for anything that is not
// Pending/Paid so the controller can respond with a 400.
function resolvePaymentStatus(raw) {
  const normalized = String(raw ?? '').trim()
  const matched = PAYMENT_STATUSES.find(
    (s) => s.toLowerCase() === normalized.toLowerCase()
  )
  return matched ?? null
}

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  resolvePaymentMethod,
  resolvePaymentStatus,
}
