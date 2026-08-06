const supabase = require('../config/supabase')

function generateOrderNumber() {
  const randomSixDigits = Math.floor(100000 + Math.random() * 900000)
  return `ORD-${randomSixDigits}`
}

// Default user for guest checkouts (no auth on storefront)
// This is the existing admin user in the users table
const DEFAULT_USER_ID = 'a422c5dd-9b57-4fda-88a1-49c784002b7f'

// Lazily cached default address ID for guest orders
let _cachedAddressId = null

async function getDefaultAddressId() {
  if (_cachedAddressId) return _cachedAddressId

  // Check if a "Guest Checkout" address already exists
  const { data: existing } = await supabase
    .from('addresses')
    .select('id')
    .eq('user_id', DEFAULT_USER_ID)
    .limit(1)
    .maybeSingle()

  if (existing) {
    _cachedAddressId = existing.id
    return _cachedAddressId
  }

  // Create a placeholder address for guest orders
  const { data: newAddr, error } = await supabase
    .from('addresses')
    .insert({
      user_id: DEFAULT_USER_ID,
      full_name: 'Guest Checkout',
      phone: '0000000000',
      address_line1: 'Guest Address',
      city: 'N/A',
      state: 'N/A',
      postal_code: '000000',
      country: 'N/A'
    })
    .select('id')
    .single()

  if (error) {
    console.error('[getDefaultAddressId] Could not create default address:', error.message)
    return null
  }

  _cachedAddressId = newAddr.id
  return _cachedAddressId
}

// GET /api/pincode/:pincode
// Public. Indian PIN-code lookup proxied through this server because
// api.postalpincode.in sends no CORS headers (browsers cannot call it
// directly). Returns the real postal data — never hardcoded.
async function lookupPincode(req, res) {
  try {
    const pincode = String(req.params.pincode || '').replace(/\D/g, '').slice(0, 6)
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ error: 'Enter a valid 6-digit PIN code.' })
    }

    const upstream = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      // Never let a hanging upstream stall the checkout lookup.
      signal: AbortSignal.timeout(8000),
    })
    if (!upstream.ok) throw new Error(`Upstream lookup failed: ${upstream.status}`)

    const raw = await upstream.json()
    const entry = Array.isArray(raw) ? raw[0] : null
    const offices =
      entry && entry.Status === 'Success' && Array.isArray(entry.PostOffice)
        ? entry.PostOffice
        : []

    const localities = offices.map((o) => ({
      name: (o.Name || '').trim(),
      district: o.District || '',
      state: o.State || '',
      country: o.Country || 'India',
    }))

    return res.json({
      pincode,
      status: localities.length ? 'found' : 'not_found',
      localities,
      city: localities[0]?.district || '',
      state: localities[0]?.state || '',
      country: localities[0]?.country || 'India',
    })
  } catch (err) {
    console.error('lookupPincode error:', err)
    return res.status(502).json({ error: 'Unable to verify this PIN code. Please try again.' })
  }
}

// GET /api/orders/track?order_id=ORD-571848&phone=9876543210
// Public. Customer order tracking. Verifies the order number AGAINST the
// customer's phone (never the order number alone) and queries ONLY the single
// matching order row — never the full table. Returns a minimal customer-safe
// projection (no internal UUIDs, no raw notes, no admin data).
//
// Every failure — missing order, wrong phone, malformed input — returns the
// SAME generic 404 so a caller can never learn whether an order number exists
// or a phone number is registered.
function normalizeOrderId(raw) {
  // Accept ORD-571848 or #ORD-571848 (visual '#' from the success screen).
  return String(raw || '').replace(/^#/, '').trim().toUpperCase()
}

// Stored checkout phones are E.164 (+919876543210). Customers may type the
// 10-digit national number, with or without +91 / spaces / dashes. Compare the
// last 10 digits so every reasonable input matches the stored value.
function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '').slice(-10)
}

async function trackOrder(req, res) {
  try {
    const orderId = normalizeOrderId(req.query.order_id || req.query.orderId || '')
    const phone = normalizePhone(req.query.phone || '')

    if (!orderId || !/^\d{10}$/.test(phone)) {
      return res.status(404).json({
        error: 'Order not found. Please check your Order ID and phone number.',
      })
    }

    // Only the one matching order is ever read — never a table scan.
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderId)
      .maybeSingle()

    if (error) {
      console.error('trackOrder error:', error)
      return res.status(500).json({ error: 'Unable to check your order. Please try again.' })
    }
    if (!data) {
      return res.status(404).json({
        error: 'Order not found. Please check your Order ID and phone number.',
      })
    }

    // Verify the phone against the stored value. Checkout persists it inside
    // the notes JSONB; fall back to a legacy phone column for older orders.
    let notesInfo = {}
    try {
      if (data.notes) notesInfo = JSON.parse(data.notes)
    } catch {}
    const storedPhone = normalizePhone(data.phone || notesInfo.phone || '')
    if (!storedPhone || storedPhone !== phone) {
      // Deliberately identical to the "no order" response above.
      return res.status(404).json({
        error: 'Order not found. Please check your Order ID and phone number.',
      })
    }

    // Minimal customer-safe projection — never the full row.
    const items = (data.items || notesInfo.items || []).map((it) => ({
      product_name: it.product_name || it.name || 'Product',
      image: it.image || null,
      quantity: Number(it.quantity ?? it.qty ?? 1),
      unit_price: Number(it.unit_price ?? it.price ?? 0),
      subtotal: Number(it.subtotal ?? (Number(it.unit_price ?? it.price ?? 0) * Number(it.quantity ?? it.qty ?? 1))),
      ...(it.variant_label ? { variant_label: it.variant_label } : {}),
      ...(it.quantity_value != null && it.quantity_unit
        ? { quantity_value: it.quantity_value, quantity_unit: it.quantity_unit }
        : {}),
    }))

    return res.json({
      order: {
        order_number: data.order_number,
        status: data.order_status || 'Pending',
        created_at: data.created_at,
        customer_name: data.customer_name || notesInfo.customer_name || '',
        payment_method: data.payment_method || 'Cash On Delivery',
        total: Number(data.total ?? data.total_amount ?? notesInfo.total_amount ?? 0),
        items,
      },
    })
  } catch (err) {
    console.error('trackOrder error:', err)
    return res.status(500).json({ error: 'Unable to check your order. Please try again.' })
  }
}

// POST /api/orders
// Public. Storefront checkout.
async function createOrder(req, res) {
  try {
    const { customer_name, phone, address, pincode, message, items, total_amount } = req.body

    console.log('[createOrder] Received payload:', JSON.stringify({
      customer_name,
      phone,
      address,
      pincode,
      message,
      items_count: items?.length,
      total_amount
    }, null, 2))

    if (!customer_name || !phone || !address || !pincode || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'customer_name, phone, address, pincode, and at least one item are required.',
      })
    }

    if (total_amount === undefined || total_amount === null || isNaN(Number(total_amount))) {
      return res.status(400).json({ error: 'total_amount is required and must be a number.' })
    }

    const orderNumber = generateOrderNumber()

    // Get or create default address for guest orders
    const addressId = await getDefaultAddressId()
    if (!addressId) {
      return res.status(500).json({ error: 'Failed to resolve default address for order.' })
    }

    // Build the insert payload matching the ACTUAL live Supabase orders table
    // (verified against the project database on 2026-08-06). Live columns:
    //   id, user_id, address_id, order_number, subtotal, shipping_charge,
    //   discount, total, payment_method, payment_status, order_status,
    //   tracking_number, notes, created_at, updated_at
    //
    // customer_name / phone / address / pincode / items are NOT columns on the
    // live table (schema.sql describes a newer design that was never migrated
    // onto the database). Sending them caused PGRST204 ("Could not find the ...
    // column of 'orders'") which broke checkout. Customer details + item
    // snapshots are persisted in the `notes` JSONB column instead, which the
    // admin order reader already parses back out.
    // Normalize the incoming items into a durable snapshot. Each item
    // carries the full variant info so orders stay historically accurate
    // even if the product/variant is edited (or deleted) later.
    const normalizedItems = (Array.isArray(items) ? items : []).map((item) => {
      const unit_price = Number(item.unit_price ?? item.selected_price ?? item.price ?? 0)
      const quantity = Number(item.quantity ?? item.qty ?? 1)
      const hasVariant = item.variant_id != null
      return {
        product_id: item.product_id ?? item.id,
        product_name: item.name ?? item.product_name,
        image: item.image,
        quantity,
        unit_price,
        subtotal: unit_price * quantity,
        ...(hasVariant
          ? {
              variant_id: item.variant_id,
              variant_label: item.variant_label,
              quantity_value: item.quantity_value,
              quantity_unit: item.quantity_unit,
            }
          : {}),
      }
    })

    // Persist the full snapshot into the `notes` JSONB column — the single
    // source of truth for order history and what the admin order reader parses.
    const insertPayload = {
      order_number: orderNumber,
      user_id: DEFAULT_USER_ID,
      address_id: addressId,
      subtotal: Number(total_amount),
      total: Number(total_amount),
      payment_method: 'Cash On Delivery',
      payment_status: 'Pending',
      order_status: 'Pending',
      notes: JSON.stringify({
        customer_name,
        phone,
        address,
        pincode,
        // Optional location details from the checkout PIN lookup. Stored inside
        // the existing notes JSONB — no schema change.
        ...(req.body.locality ? { locality: req.body.locality } : {}),
        ...(req.body.city ? { city: req.body.city } : {}),
        ...(req.body.state ? { state: req.body.state } : {}),
        message: message ?? '',
        items: normalizedItems,
        total_amount: Number(total_amount),
      }),
    }

    const { data, error } = await supabase
      .from('orders')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      console.error('[createOrder] Supabase error:', JSON.stringify(error, null, 2))
      console.error('[createOrder] Supabase error code:', error.code)
      console.error('[createOrder] Supabase error details:', error.details)
      console.error('[createOrder] Supabase error hint:', error.hint)
      return res.status(500).json({
        error: 'Failed to place order.',
        detail: error.message,
        code: error.code
      })
    }

    console.log('[createOrder] Order created successfully:', data.id, data.order_number)
    return res.status(201).json({ order: data })
  } catch (err) {
    console.error('[createOrder] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/admin/orders
// Protected. Newest first.
async function getOrders(req, res) {
  try {
    const { status, search } = req.query

    let query = supabase.from('orders').select('*').order('created_at', { ascending: false })

    if (status) query = query.eq('order_status', status)
    // customer_name is not a column on the live orders table — it lives inside
    // the notes JSON text, so search notes instead of a phantom column.
    if (search) query = query.or(`order_number.ilike.%${search}%,notes.ilike.%${search}%`)

    const { data, error } = await query

    if (error) {
      console.error('getOrders error:', error)
      return res.status(500).json({ error: 'Failed to fetch orders.' })
    }

    // Use direct column values with fallback to notes parsing for backward compatibility
    const enriched = (data || []).map((o) => {
      let notesInfo = {}
      try {
        if (o.notes) notesInfo = JSON.parse(o.notes)
      } catch {}
      return {
        ...o,
        customer_name: o.customer_name || notesInfo.customer_name || '',
        phone: o.phone || notesInfo.phone || '',
        address: o.address || notesInfo.address || '',
        pincode: o.pincode || notesInfo.pincode || '',
        locality: notesInfo.locality || '',
        city: notesInfo.city || '',
        state: notesInfo.state || '',
        message: o.message || notesInfo.message || '',
        items: o.items || notesInfo.items || [],
        total_amount: Number(o.total_amount || o.total || 0),
        status: o.order_status || 'Pending',
      }
    })

    return res.json({ orders: enriched })
  } catch (err) {
    console.error('getOrders error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/admin/orders/:id
// Protected.
async function getOrderById(req, res) {
  try {
    const { id } = req.params

    const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()

    if (error) {
      console.error('getOrderById error:', error)
      return res.status(500).json({ error: 'Failed to fetch order.' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    // Use direct column values with fallback to notes parsing for backward compatibility
    let notesInfo = {}
    try {
      if (data.notes) notesInfo = JSON.parse(data.notes)
    } catch {}
    const enriched = {
      ...data,
      customer_name: data.customer_name || notesInfo.customer_name || '',
      phone: data.phone || notesInfo.phone || '',
      address: data.address || notesInfo.address || '',
      pincode: data.pincode || notesInfo.pincode || '',
      locality: notesInfo.locality || '',
      city: notesInfo.city || '',
      state: notesInfo.state || '',
      message: data.message || notesInfo.message || '',
      items: data.items || notesInfo.items || [],
      total_amount: Number(data.total_amount || data.total || 0),
      status: data.order_status || 'Pending',
    }

    return res.json({ order: enriched })
  } catch (err) {
    console.error('getOrderById error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /api/admin/orders/:id/status
// Protected.
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body

    // Canonical values accepted by the live orders_order_status_check
    // constraint (after migration_add_processing_status.sql). Kept in sync
    // with the Admin dropdown — matching is case-insensitive so the UI can
    // send either case safely.
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned']
    // Case-insensitive match
    const matched = validStatuses.find(
      (s) => s.toLowerCase() === (status || '').toLowerCase()
    )
    if (!matched) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
      })
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ order_status: matched })
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('updateOrderStatus error:', error)
      return res.status(500).json({ error: 'Failed to update order status.' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    // Use direct column values with fallback to notes parsing
    let notesInfo = {}
    try { if (data.notes) notesInfo = JSON.parse(data.notes) } catch {}
    const enriched = {
      ...data,
      customer_name: data.customer_name || notesInfo.customer_name || '',
      phone: data.phone || notesInfo.phone || '',
      address: data.address || notesInfo.address || '',
      locality: notesInfo.locality || '',
      city: notesInfo.city || '',
      state: notesInfo.state || '',
      items: data.items || notesInfo.items || [],
      total_amount: Number(data.total_amount || data.total || 0),
      status: data.order_status || 'Pending',
    }

    return res.json({ order: enriched })
  } catch (err) {
    console.error('updateOrderStatus error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// DELETE /api/admin/orders/:id
// Protected. Permanently removes an order.
//
// Order line items are snapshotted inside the orders.notes JSONB column, but
// there is also an `order_items` child table (order_items.order_id → orders.id
// with ON DELETE CASCADE, verified 2026-08-06). We delete child rows first so
// no orphaned order-item records can survive even if the FK rule ever changes.
async function deleteOrder(req, res) {
  try {
    const { id } = req.params

    // Remove any child order_items first (cascade makes the order delete
    // sufficient today, but deleting children first is safe under any FK rule).
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', id)

    if (itemsError) {
      console.error('deleteOrder order_items error:', itemsError)
      return res.status(500).json({ error: 'Failed to delete order items.' })
    }

    const { data, error } = await supabase.from('orders').delete().eq('id', id).select('id')

    if (error) {
      console.error('deleteOrder error:', error)
      return res.status(500).json({ error: 'Failed to delete order.' })
    }
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    return res.json({ success: true, id: data[0].id })
  } catch (err) {
    console.error('deleteOrder error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET /api/admin/stats
// Protected. Dashboard summary.
async function getDashboardStats(req, res) {
  try {
    const totalProductsQuery = supabase.from('products').select('id', { count: 'exact', head: true })
    const allOrdersQuery = supabase.from('orders').select('id, total, order_status')

    const [{ count: totalProducts, error: prodError }, { data: allOrders, error: ordersError }] =
      await Promise.all([totalProductsQuery, allOrdersQuery])

    if (prodError || ordersError) {
      console.error('getDashboardStats error:', prodError || ordersError)
      return res.status(500).json({ error: 'Failed to compute stats.' })
    }

    const totalOrders = allOrders.length

    // Count unique customers from phone column
    const customerPhones = new Set()
    allOrders.forEach((o) => {
      if (o.phone) customerPhones.add(o.phone)
      else {
        // Fallback: try parsing notes for backward compatibility
        try {
          if (o.notes) {
            const info = JSON.parse(o.notes)
            if (info.phone) customerPhones.add(info.phone)
          }
        } catch {}
      }
    })

    const totalRevenue = allOrders
      .filter((o) => o.order_status !== 'Cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount || o.total || 0), 0)

    const { data: recentOrders, error: recentError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) {
      console.error('getDashboardStats recent orders error:', recentError)
      return res.status(500).json({ error: 'Failed to compute stats.' })
    }

    // Enrich recent orders - use direct column values with fallback to notes
    const enrichedRecent = (recentOrders || []).map((o) => {
      let notesInfo = {}
      try { if (o.notes) notesInfo = JSON.parse(o.notes) } catch {}
      return {
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name || notesInfo.customer_name || '',
        status: o.order_status || 'Pending',
        total_amount: Number(o.total_amount || o.total || 0),
        created_at: o.created_at,
      }
    })

    return res.json({
      total_products: totalProducts ?? 0,
      total_orders: totalOrders,
      total_customers: customerPhones.size,
      total_revenue: totalRevenue,
      recent_orders: enrichedRecent,
    })
  } catch (err) {
    console.error('getDashboardStats error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  lookupPincode,
  trackOrder,
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getDashboardStats,
}

