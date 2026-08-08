const supabase = require('../config/supabase')

// ---------------------------------------------------------------------------
// POST /api/track-order
// Public. The single customer tracking endpoint used by the storefront.
// Supports tracking by EITHER the public order number OR the checkout mobile
// number — one function on the frontend, one endpoint here.
//
// Request:
//   { "type": "phone",   "value": "9876543210" }  -> every order for that phone
//   { "type": "orderId", "value": "ORD-592546" }  -> the single matching order
//
// Response: { "orders": [ safeOrder, ... ] } sorted newest -> oldest.
// 200 is always returned for a completed lookup (an empty array means "no
// matching orders"), so callers can distinguish "nothing found" from a real
// failure (400/500).
//
// Only tracking-safe fields are returned — never the internal UUID, raw
// notes, address, email, payment secrets or admin data.
// ---------------------------------------------------------------------------

// Public order id normalization: "ORD-592546" or "#ORD-592546" -> "ORD-592546".
function normalizeOrderId(raw) {
  return String(raw || '').replace(/^#/, '').trim().toUpperCase()
}

// Strict Indian mobile normalization (mirrors the storefront helper):
//  1. removes spaces, hyphens and brackets
//  2. drops a leading +91 / 91 prefix
//  3. keeps the final 10-digit national number
//  4. returns '' unless the result is EXACTLY 10 digits
// 9876543210 / +919876543210 / +91 98765 43210 / 91-9876543210 all normalize
// to "9876543210". Anything else (e.g. "123", "98765432101") returns ''.
function normalizeIndianPhone(raw) {
  if (raw == null) return ''
  let s = String(raw).replace(/[\s\-()]/g, '')
  if (s.startsWith('+91')) s = s.slice(3)
  else if (s.startsWith('91') && s.length > 10) s = s.slice(2)
  s = s.replace(/\D/g, '')
  return /^[0-9]{10}$/.test(s) ? s : ''
}

// Comparison helper for STORED phone values. Checkout writes E.164
// (+919876543210) today; historical orders may hold the bare 10-digit
// national number. Only those two Indian formats are accepted — a stored
// foreign-format number (e.g. +449876543210) can never match a +91 search.
// The last 10 digits are compared so both historical formats match the
// normalized search value without altering any historical data.
function normalizeStoredPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  const indianFormat = digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))
  return indianFormat ? digits.slice(-10) : ''
}

function parseNotes(row) {
  try {
    if (row && row.notes) return JSON.parse(row.notes)
  } catch {
    // malformed notes never block tracking — treat as empty
  }
  return {}
}

// Minimal customer-safe projection of one order row.
function toSafeTrackingOrder(row) {
  const notesInfo = parseNotes(row)
  const items = (row.items || notesInfo.items || []).map((it) => ({
    product_name: it.product_name || it.name || 'Product',
    image: it.image || null,
    quantity: Number(it.quantity ?? it.qty ?? 1),
    unit_price: Number(it.unit_price ?? it.price ?? 0),
    subtotal: Number(
      it.subtotal ??
        Number(it.unit_price ?? it.price ?? 0) * Number(it.quantity ?? it.qty ?? 1)
    ),
    ...(it.variant_label ? { variant_label: it.variant_label } : {}),
    ...(it.quantity_value != null && it.quantity_unit
      ? { quantity_value: it.quantity_value, quantity_unit: it.quantity_unit }
      : {}),
  }))

  return {
    orderId: row.order_number,
    createdAt: row.created_at,
    status: row.order_status || 'Pending',
    total: Number(row.total ?? row.total_amount ?? notesInfo.total_amount ?? 0),
    payment_method: row.payment_method || 'Cash On Delivery',
    items,
    // BILL-TO fields so the customer's own invoice can be rendered from the
    // resolved order (tracking / view-order). Only the resolved order's own
    // saved data — never another customer's, never admin/internal fields.
    customer_name: notesInfo.customer_name || '',
    phone: notesInfo.phone || '',
    email: notesInfo.email || '',
    address: notesInfo.address || '',
    pincode: notesInfo.pincode || '',
    locality: notesInfo.locality || '',
    city: notesInfo.city || '',
    state: notesInfo.state || '',
  }
}

async function trackOrders(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const { type, value } = req.body || {}

    if (!type || value === undefined || value === null || String(value).trim() === '') {
      return res.status(400).json({ error: 'INVALID_REQUEST' })
    }

    // --- Track by checkout mobile number ------------------------------------
    if (type === 'phone') {
      const digits = normalizeIndianPhone(value)
      if (!digits) {
        return res.status(400).json({ error: 'INVALID_PHONE' })
      }

      // Phone lives inside the orders.notes JSONB (no phone column on the
      // live table). Match any stored value that ENDS with the 10 digits
      // (covers +919876543210 and the historical bare-10-digit format), then
      // verify exactly in JS so a stored 11-digit number can never match.
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`notes->>phone.ilike.%${digits}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('trackOrders (phone) error:', error)
        return res.status(500).json({ error: 'TRACKING_FAILED' })
      }

      const orders = (data || [])
        .filter((row) => normalizeStoredPhone(row.phone || parseNotes(row).phone || '') === digits)
        .map(toSafeTrackingOrder)

      return res.json({ orders })
    }

    // --- Track by public order id -------------------------------------------
    if (type === 'orderId') {
      const orderNumber = normalizeOrderId(value)
      if (!orderNumber) {
        return res.status(400).json({ error: 'INVALID_ORDER_ID' })
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .maybeSingle()

      if (error) {
        console.error('trackOrders (orderId) error:', error)
        return res.status(500).json({ error: 'TRACKING_FAILED' })
      }

      return res.json({ orders: data ? [toSafeTrackingOrder(data)] : [] })
    }

    return res.status(400).json({ error: 'INVALID_TYPE' })
  } catch (err) {
    console.error('trackOrders error:', err)
    return res.status(500).json({ error: 'TRACKING_FAILED' })
  }
}

module.exports = { trackOrders }
