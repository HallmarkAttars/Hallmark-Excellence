const supabase = require('../config/supabase')
const { sendOrderEmails } = require('../services/orderEmailService')
const { applyBulkPricing, resolveBrandBulkPricing, brandBulkUnitPriceFor } = require('../utils/orderPricing')

function generateOrderNumber() {
  const randomSixDigits = Math.floor(100000 + Math.random() * 900000)
  return `ORD-${randomSixDigits}`
}

// Round monetary values to 2 decimals (the orders table stores numeric(10,2)).
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
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
//
// Money is computed HERE from the database — product/variant prices fetched
// from Supabase are the only authority. Frontend-supplied prices, subtotals
// and totals (req.body.total_amount etc.) are IGNORED so a customer can never
// manipulate the frontend request to change what they pay.
async function createOrder(req, res) {
  try {
    const { customer_name, email, phone, address, pincode, message, items, idempotency_key } = req.body

    console.log('[createOrder] Received payload:', JSON.stringify({
      customer_name,
      phone,
      address,
      pincode,
      message,
      items_count: items?.length,
    }, null, 2))

    if (!customer_name || !phone || !address || !pincode || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'customer_name, phone, address, pincode, and at least one item are required.',
      })
    }

    // Customer email is REQUIRED — it is the recipient of the order
    // confirmation email.
    const customerEmail = String(email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return res.status(400).json({ error: 'A valid email address is required.' })
    }

    // --- Duplicate-order / duplicate-email protection -----------------------
    // The checkout generates one idempotency key per checkout session. If a
    // duplicate submission (double click, network retry, browser retry) reaches
    // this endpoint again, the SAME existing order is returned — no second
    // order is created, so no second pair of emails is ever sent.
    if (idempotency_key) {
      try {
        const { data: existing, error: dupError } = await supabase
          .from('orders')
          .select('*')
          .eq('notes->>idempotency_key', String(idempotency_key))
          .maybeSingle()
        if (!dupError && existing) {
          console.log(`[createOrder] Duplicate submission blocked (idempotency_key ${idempotency_key}); returning existing order ${existing.order_number}`)
          return res.status(200).json({ order: existing })
        }
      } catch (dupErr) {
        // Never let the idempotency check break checkout — proceed on failure.
        console.error('[createOrder] Idempotency check failed (proceeding):', dupErr.message)
      }
    }

    // --- Fetch authoritative product / variant data from the database --------
    const productIds = items
      .map((it) => it.product_id ?? it.id)
      .filter((id) => id != null && String(id).trim() !== '')
      .map((id) => String(id))

    if (productIds.length !== items.length) {
      return res.status(400).json({ error: 'Every order item must include a product_id.' })
    }

    let productSelect =
      'id, name, price, image, compare_at_price, bulk_price, bulk_min_qty, bulk_enabled, brand_id'
    let dbProducts
    let prodError
    ;({ data: dbProducts, error: prodError } = await supabase
      .from('products')
      .select(productSelect)
      .in('id', productIds))
    // The bulk/pricing migration may not be applied yet — retry with the
    // minimal select so checkout keeps working exactly as before.
    if (prodError && /does not exist|could not find/i.test(prodError.message)) {
      console.warn('[createOrder] Pricing/bulk columns missing — checkout running without bulk pricing.')
      ;({ data: dbProducts, error: prodError } = await supabase
        .from('products')
        .select('id, name, price, image')
        .in('id', productIds))
    }

    if (prodError) {
      console.error('[createOrder] products fetch error:', prodError.message)
      return res.status(500).json({ error: 'Failed to validate products. Please try again.' })
    }

    const variantIds = items
      .filter((it) => it.variant_id != null)
      .map((it) => String(it.variant_id))

    let dbVariants = []
    if (variantIds.length > 0) {
      // Fetch the FULL variant set for every ordered product (not just the
      // selected ones) so bulk pricing resolves against each variant's OWN
      // admin-configured values — per-variant bulk, not a default-variant gate.
      const { data: vs, error: vErr } = await supabase
        .from('product_variants')
        .select('id, product_id, price, display_label, quantity_value, quantity_unit, is_default, bulk_enabled, bulk_price, bulk_min_qty')
        .in('product_id', productIds)
        .order('quantity_value', { ascending: true })
      if (vErr) {
        if (/does not exist|could not find/i.test(vErr.message)) {
          // Per-variant bulk migration not applied yet — variants carry no
          // bulk config, so every variant line prices at its normal price.
          console.warn('[createOrder] Variant bulk columns missing — per-variant bulk pricing unavailable.')
          const { data: vs2, error: vErr2 } = await supabase
            .from('product_variants')
            .select('id, product_id, price, display_label, quantity_value, quantity_unit, is_default')
            .in('product_id', productIds)
            .order('quantity_value', { ascending: true })
          if (vErr2) {
            console.error('[createOrder] variants fetch error:', vErr2.message)
            return res.status(500).json({ error: 'Failed to validate product variants. Please try again.' })
          }
          dbVariants = vs2 || []
        } else {
          console.error('[createOrder] variants fetch error:', vErr.message)
          return res.status(500).json({ error: 'Failed to validate product variants. Please try again.' })
        }
      } else {
        dbVariants = vs || []
      }
    }

    const productMap = new Map(dbProducts.map((p) => [String(p.id), p]))
    const variantMap = new Map(dbVariants.map((v) => [String(v.id), v]))

    // --- Combined brand bulk pricing (brand-wide, mix & match) --------------
    // Brand-level combined bulk: quantities SUM across ALL of a brand's lines
    // in this order (any products of that brand). When the combined total
    // reaches the brand's threshold, EVERY line of that brand is priced at the
    // brand bulk unit price — brand bulk takes precedence over a line's own
    // per-product bulk. Config comes from the brands table (never the client).
    const brandIds = [...new Set((dbProducts || []).map((p) => p.brand_id).filter((v) => v != null).map(String))]
    let brandConfigs = {}
    let brandNames = {}
    if (brandIds.length > 0) {
      let dbBrands
      let brandError
      ;({ data: dbBrands, error: brandError } = await supabase
        .from('brands')
        .select('id, name, bulk_enabled, bulk_unit_price, bulk_min_qty')
        .in('id', brandIds))
      if (brandError && /does not exist|could not find/i.test(brandError.message)) {
        // Brand bulk migration not applied yet — brands carry no bulk config,
        // so every line prices normally (brand bulk disabled).
        console.warn('[createOrder] Brand bulk columns missing — combined brand bulk pricing unavailable.')
        ;({ data: dbBrands, error: brandError } = await supabase
          .from('brands')
          .select('id, name')
          .in('id', brandIds))
      }
      if (brandError) {
        console.error('[createOrder] brands fetch error:', brandError.message)
        return res.status(500).json({ error: 'Failed to validate brands. Please try again.' })
      }
      for (const b of dbBrands || []) {
        brandNames[String(b.id)] = b.name
        brandConfigs[String(b.id)] = {
          bulk_enabled: b.bulk_enabled === true,
          bulk_unit_price: b.bulk_unit_price ?? null,
          bulk_min_qty: b.bulk_min_qty ?? null,
        }
      }
    }

    // Combined quantity per brand across ALL lines (mix & match any items).
    const brandTotals = {}
    for (const item of items) {
      const product = productMap.get(String(item.product_id ?? item.id))
      if (!product || product.brand_id == null) continue
      const qty = Math.floor(Number(item.quantity ?? item.qty ?? 1))
      if (!Number.isFinite(qty) || qty < 1) continue
      const bid = String(product.brand_id)
      brandTotals[bid] = (brandTotals[bid] || 0) + qty
    }
    const activeBrandBulk = resolveBrandBulkPricing({ brandTotals, brandConfigs })

    // Recompute every line from database prices. Any frontend-supplied
    // unit_price / subtotal / total_amount is ignored.
    let normalizedItems
    try {
      normalizedItems = items.map((item) => {
        const product = productMap.get(String(item.product_id ?? item.id))
        if (!product) {
          throw new Error('One of the products in your cart is no longer available. Please refresh and try again.')
        }
        const quantity = Math.floor(Number(item.quantity ?? item.qty ?? 1))
        if (!Number.isFinite(quantity) || quantity < 1) {
          throw new Error(`Invalid quantity for ${product.name}.`)
        }

        let unitPrice
        let variantFields = {}
        // Bulk config source: the SELECTED variant's own per-variant bulk
        // values, or the product-level values for variant-less products.
        let bulkEnabled = product.bulk_enabled
        let bulkPrice = product.bulk_price
        let bulkMinQty = product.bulk_min_qty

        if (item.variant_id != null) {
          const variant = variantMap.get(String(item.variant_id))
          if (!variant || String(variant.product_id) !== String(product.id)) {
            throw new Error(`The selected size/variant of ${product.name} is no longer available. Please refresh and try again.`)
          }
          unitPrice = Number(variant.price)
          variantFields = {
            variant_id: variant.id,
            variant_label: variant.display_label,
            quantity_value: variant.quantity_value,
            quantity_unit: variant.quantity_unit,
          }
          // Per-variant bulk: the selected variant's own config decides. If
          // the variant bulk columns don't exist yet (pre-migration DB), the
          // selected variant carries no bulk config → that line prices at its
          // normal price (matching what the storefront displays). Only
          // variant-less lines fall back to product-level bulk.
          if (variant.bulk_enabled !== undefined) {
            bulkEnabled = variant.bulk_enabled
            bulkPrice = variant.bulk_price
            bulkMinQty = variant.bulk_min_qty
          } else {
            bulkEnabled = false
            bulkPrice = null
            bulkMinQty = null
          }
        } else {
          unitPrice = Number(product.price)
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`Invalid price for ${product.name}.`)
        }

        // --- Optional bulk pricing (authoritative, server-side) -------------
        // The pure math lives in utils/orderPricing.js (unit-tested). Bulk
        // applies when the SELECTED variant's own config is enabled and the
        // quantity reaches ITS minimum — every value below comes from the
        // database, never from the client.
        const normalUnitPrice = unitPrice
        const pricing = applyBulkPricing({
          normalUnitPrice,
          quantity,
          bulkEnabled,
          bulkPrice,
          bulkMinQty,
        })
        unitPrice = pricing.unitPrice

        // --- Combined brand bulk pricing (precedence over per-product) ------
        // When this brand's combined-quantity discount is active, the brand
        // bulk unit price wins over the line's own per-product bulk. It is
        // only ever applied when it is a genuine discount below THIS line's
        // normal price (brandBulkUnitPriceFor enforces that).
        let brandBulkApplied = false
        let brandBulkPrice = null
        let brandBulkMinQty = null
        const brandPrice = brandBulkUnitPriceFor(normalUnitPrice, product.brand_id, activeBrandBulk)
        if (brandPrice != null) {
          unitPrice = brandPrice
          brandBulkApplied = true
          brandBulkPrice = brandPrice
          brandBulkMinQty = activeBrandBulk[String(product.brand_id)].bulkMinQty
        }

        return {
          product_id: product.id,
          product_name: product.name,
          image: product.image || null,
          quantity,
          unit_price: round2(unitPrice),
          subtotal: round2(unitPrice * quantity),
          // Optional reference values: the normal price this line would have
          // used, and the bulk config that unlocked the discount. Kept for
          // display/debugging — the charged amount is always unit_price.
          normal_unit_price: round2(normalUnitPrice),
          ...(pricing.bulkApplied
            ? { bulk_price: round2(pricing.bulkPrice), bulk_min_qty: pricing.bulkMinQty, bulk_applied: true }
            : {}),
          // Brand context + brand-level bulk snapshot (order history stays
          // accurate even if the brand config changes later).
          brand_id: product.brand_id ?? null,
          brand_name: product.brand_id != null ? (brandNames[String(product.brand_id)] ?? null) : null,
          ...(brandBulkApplied
            ? { brand_bulk_applied: true, brand_bulk_price: round2(brandBulkPrice), brand_bulk_min_qty: brandBulkMinQty }
            : {}),
          ...variantFields,
        }
      })
    } catch (err) {
      return res.status(400).json({ error: err.message })
    }

    // Authoritative totals. The current system has no discount/shipping/tax
    // logic — the columns exist on the live table and stay 0 (free shipping).
    const subtotal = round2(normalizedItems.reduce((sum, it) => sum + Number(it.subtotal), 0))
    const discount = 0
    const shippingCharge = 0
    const tax = 0
    const total = round2(subtotal + shippingCharge - discount + tax)

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
    //
    // Each item carries the full variant info so orders stay historically
    // accurate even if the product/variant is edited (or deleted) later.
    const notes = {
      customer_name,
      email: customerEmail,
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
      total_amount: total,
      ...(idempotency_key ? { idempotency_key: String(idempotency_key) } : {}),
    }

    const insertPayload = {
      order_number: orderNumber,
      user_id: DEFAULT_USER_ID,
      address_id: addressId,
      subtotal,
      shipping_charge: shippingCharge,
      discount,
      total,
      payment_method: 'Cash On Delivery',
      payment_status: 'Pending',
      order_status: 'Pending',
      notes: JSON.stringify(notes),
    }

    const { data, error } = await supabase
      .from('orders')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      // Unique-violation on the idempotency index (notes->>idempotency_key):
      // a parallel request with the same key won the insert. Return the
      // existing order instead of creating a duplicate.
      if (error.code === '23505' && idempotency_key) {
        const { data: existing, error: dupError } = await supabase
          .from('orders')
          .select('*')
          .eq('notes->>idempotency_key', String(idempotency_key))
          .maybeSingle()
        if (!dupError && existing) {
          console.log(`[createOrder] Concurrent duplicate blocked (idempotency_key ${idempotency_key}); returning existing order ${existing.order_number}`)
          return res.status(200).json({ order: existing })
        }
      }
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

    // --- ORDER IS SAVED. Only now are the Brevo emails sent. ----------------
    // Both emails use the same params object built from THIS saved order row.
    // Email failures are handled independently and never fail the order.
    console.log('[createOrder] Order created successfully:', data.id, data.order_number)
    try {
      await sendOrderEmails({ order: data })
    } catch (emailErr) {
      // sendOrderEmails never throws by contract; this is a last-resort guard.
      console.error('[ORDER EMAIL ERROR] Unexpected error sending order emails:', emailErr.message || emailErr)
    }

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
        email: notesInfo.email || '',
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
      email: notesInfo.email || '',
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
      // Log the REAL database error (code/detail/hint) so the failure is
      // never hidden behind the generic message — the UI keeps the clean
      // copy, the developer console has the ground truth.
      // NOTE: PostgREST `details` embeds the failing row (including the
      // order notes JSONB with customer PII), so it is deliberately NOT
      // logged. message + code + hint identify the failure safely.
      console.error('updateOrderStatus error:', error.message || error)
      console.error('updateOrderStatus code:', error.code)
      console.error('updateOrderStatus hint:', error.hint)
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
      email: notesInfo.email || '',
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
    const allOrdersQuery = supabase.from('orders').select('id, total, order_status, notes')

    const [{ count: totalProducts, error: prodError }, { data: allOrders, error: ordersError }] =
      await Promise.all([totalProductsQuery, allOrdersQuery])

    if (prodError || ordersError) {
      console.error('getDashboardStats error:', prodError || ordersError)
      return res.status(500).json({ error: 'Failed to compute stats.' })
    }

    const totalOrders = allOrders.length

    // Count UNIQUE customers from the stored checkout phone (fallback: email).
    // The live orders table has no phone/email columns — both live inside the
    // notes JSONB written at checkout. notes is now included in the select above
    // (previously neither column was selected, which is why Customers showed 0).
    const customerKeys = new Set()
    allOrders.forEach((o) => {
      let phone = ''
      let email = ''
      try {
        if (o.notes) {
          const info = JSON.parse(o.notes)
          phone = info.phone || ''
          email = info.email || ''
        }
      } catch {}
      if (phone) customerKeys.add(phone)
      else if (email) customerKeys.add(email)
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
        items_count: Array.isArray(notesInfo.items) ? notesInfo.items.length : 0,
      }
    })

    return res.json({
      total_products: totalProducts ?? 0,
      total_orders: totalOrders,
      total_customers: customerKeys.size,
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

