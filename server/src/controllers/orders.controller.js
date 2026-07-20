const supabase = require('../config/supabase')

function generateOrderNumber() {
  const randomSixDigits = Math.floor(100000 + Math.random() * 900000)
  return `ORD-${randomSixDigits}`
}

// POST /api/orders
// Public. Storefront checkout.
async function createOrder(req, res) {
  try {
    const { customer_name, phone, address, pincode, message, items, total_amount } = req.body

    if (!customer_name || !phone || !address || !pincode || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'customer_name, phone, address, pincode, and at least one item are required.',
      })
    }

    if (total_amount === undefined || total_amount === null || isNaN(Number(total_amount))) {
      return res.status(400).json({ error: 'total_amount is required and must be a number.' })
    }

    const orderNumber = generateOrderNumber()

    // Store customer info in notes field as JSON, use total field for amount,
    // and mark as Cash On Delivery payment.
    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        // Use a default address_id (will be null-able after migration)
        // We store the shipping details in notes as JSON
        notes: JSON.stringify({
          customer_name,
          phone,
          address,
          pincode,
          message: message ?? '',
          items,
        }),
        subtotal: Number(total_amount),
        total: Number(total_amount),
        order_status: 'Pending',
        payment_method: 'Cash On Delivery',
        payment_status: 'Cash On Delivery',
      })
      .select('*')
      .single()

    if (error) {
      console.error('createOrder error:', error)
      return res.status(500).json({ error: 'Failed to place order.' })
    }

    return res.status(201).json({ order: data })
  } catch (err) {
    console.error('createOrder error:', err)
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
    if (search) query = query.or(`order_number.ilike.%${search}%,notes.ilike.%${search}%`)

    const { data, error } = await query

    if (error) {
      console.error('getOrders error:', error)
      return res.status(500).json({ error: 'Failed to fetch orders.' })
    }

    // Parse notes JSON to extract customer info for display
    const enriched = (data || []).map((o) => {
      let customerInfo = {}
      try {
        if (o.notes) customerInfo = JSON.parse(o.notes)
      } catch {}
      return {
        ...o,
        customer_name: customerInfo.customer_name || '',
        phone: customerInfo.phone || '',
        address: customerInfo.address || '',
        pincode: customerInfo.pincode || '',
        message: customerInfo.message || '',
        items: customerInfo.items || [],
        total_amount: Number(o.total),
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

    // Parse notes
    let customerInfo = {}
    try {
      if (data.notes) customerInfo = JSON.parse(data.notes)
    } catch {}
    const enriched = {
      ...data,
      customer_name: customerInfo.customer_name || '',
      phone: customerInfo.phone || '',
      address: customerInfo.address || '',
      pincode: customerInfo.pincode || '',
      message: customerInfo.message || '',
      items: customerInfo.items || [],
      total_amount: Number(data.total),
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

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
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

    // Parse notes for response
    let customerInfo = {}
    try { if (data.notes) customerInfo = JSON.parse(data.notes) } catch {}
    const enriched = {
      ...data,
      customer_name: customerInfo.customer_name || '',
      phone: customerInfo.phone || '',
      address: customerInfo.address || '',
      items: customerInfo.items || [],
      total_amount: Number(data.total),
    }

    return res.json({ order: enriched })
  } catch (err) {
    console.error('updateOrderStatus error:', err)
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

    // Count unique customers from parsed notes
    const customerPhones = new Set()
    allOrders.forEach((o) => {
      try {
        if (o.notes) {
          const info = JSON.parse(o.notes)
          if (info.phone) customerPhones.add(info.phone)
        }
      } catch {}
    })

    const totalRevenue = allOrders
      .filter((o) => o.order_status !== 'Cancelled')
      .reduce((sum, o) => sum + Number(o.total), 0)

    const { data: recentOrders, error: recentError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) {
      console.error('getDashboardStats recent orders error:', recentError)
      return res.status(500).json({ error: 'Failed to compute stats.' })
    }

    // Enrich recent orders
    const enrichedRecent = (recentOrders || []).map((o) => {
      let info = {}
      try { if (o.notes) info = JSON.parse(o.notes) } catch {}
      return {
        id: o.id,
        order_number: o.order_number,
        customer_name: info.customer_name || '',
        status: o.order_status,
        total_amount: Number(o.total),
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
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getDashboardStats,
}

