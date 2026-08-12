const supabase = require('../config/supabase')
const { sendOrderEmails } = require('../services/orderEmailService')
const {
  resolvePaymentMethod,
  resolvePaymentStatus,
} = require('../utils/orderPayment')
const { applyBrandBulk, isValidBulkRule } = require('../utils/brandBulkPricing')
const {
  parseOrderNotes,
  stringifyOrderNotes,
  recordStatusTimestamp,
} = require('../utils/orderStatusHistory')

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
    const notesInfo = parseOrderNotes(data)
    const storedPhone = normalizePhone(data.phone || notesInfo.phone || '')
    if (!storedPhone || storedPhone !== phone) {
      // Deliberately identical to the "no order" response above.
      return res.status(404).json({
        error: 'Order not found. Please check your Order ID and phone number.',
      })
    }

    // Minimal customer-safe projection — never the full row. The additive
    // fields below (brand_name) are invoice PRESENTATION data only — they
    // never change a price, quantity or total.
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
      ...(it.variant_total_price != null ? { variant_total_price: Number(it.variant_total_price) } : {}),
      ...(it.variant_price_per_unit != null ? { variant_price_per_unit: Number(it.variant_price_per_unit) } : {}),
      // Per-piece pricing snapshot — preserved so the customer's invoice can
      // show the applied RATE/pcs. (bulk or normal per-piece price) and the
      // exact piece count from the SAVED order, never a live recalculation.
      ...(it.pieces != null ? { pieces: Number(it.pieces) } : {}),
      ...(it.unit_pieces != null ? { unit_pieces: Number(it.unit_pieces) } : {}),
      ...(it.bulk_per_unit != null ? { bulk_per_unit: Number(it.bulk_per_unit) } : {}),
      ...(it.normal_per_piece != null ? { normal_per_piece: Number(it.normal_per_piece) } : {}),
      ...(it.brand_name ? { brand_name: it.brand_name } : {}),
      // Pack purchase metadata — preserved for the customer's own invoice.
      ...(it.pack_id ? { pack_id: it.pack_id, pack_name: it.pack_name } : {}),
      ...(it.pack_size != null
        ? { pack_size: Number(it.pack_size), number_of_packs: Number(it.number_of_packs ?? 1), actual_piece_quantity: Number(it.actual_piece_quantity ?? it.quantity) }
        : {}),
      ...(it.pack_price != null ? { pack_price: Number(it.pack_price) } : {}),
    }))

    return res.json({
      order: {
        order_number: data.order_number,
        status: data.order_status || 'Pending',
        created_at: data.created_at,
        customer_name: data.customer_name || notesInfo.customer_name || '',
        payment_method: data.payment_method || 'Cash On Delivery',
        payment_status: data.payment_status || 'Pending',
        // Per-status transition timestamps recorded by updateOrderStatus —
        // drives the customer's order-progress timeline dates.
        status_history: notesInfo.status_history || null,
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

    // Resolve the customer's SELECTED payment method (cod | upi) into the
    // canonical label stored on orders.payment_method. Unknown/missing values
    // safely fall back to Cash on Delivery so legacy clients never break.
    const { code: paymentCode, label: paymentMethodLabel } = resolvePaymentMethod(
      req.body.paymentMethod ?? req.body.payment_method
    )

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
      'id, name, price, image, compare_at_price, brand_id'
    let dbProducts
    let prodError
    ;({ data: dbProducts, error: prodError } = await supabase
      .from('products')
      .select(productSelect)
      .in('id', productIds))
    // The compare_at_price column may not exist yet (pre-migration DB) —
    // retry with the minimal select so checkout keeps working.
    if (prodError && /does not exist|could not find/i.test(prodError.message)) {
      console.warn('[createOrder] compare_at_price column missing — checkout running with base product fields.')
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
      const { data: vs, error: vErr } = await supabase
        .from('product_variants')
        .select('id, product_id, price, total_price, price_per_unit, display_label, quantity_value, quantity_unit, is_default')
        .in('product_id', productIds)
        .order('quantity_value', { ascending: true })
      if (vErr) {
        console.error('[createOrder] variants fetch error:', vErr.message)
        return res.status(500).json({ error: 'Failed to validate product variants. Please try again.' })
      }
      dbVariants = vs || []
    }

    const productMap = new Map(dbProducts.map((p) => [String(p.id), p]))
    const variantMap = new Map(dbVariants.map((v) => [String(v.id), v]))

    // Brand display names + brand-level bulk rules for the order snapshot.
    // Prices NEVER come from the brands table — product/variant rows are the
    // only authority; the brand bulk columns only carry the optional
    // per-piece discount applied AFTER normal prices are computed.
    const brandIds = [...new Set((dbProducts || []).map((p) => p.brand_id).filter((v) => v != null).map(String))]
    const brandNames = {}
    let brandRules = {}
    if (brandIds.length > 0) {
      let dbBrands = []
      let { data, error } = await supabase
        .from('brands')
        .select('id, name, bulk_enabled, standard_price, bulk_unit_price, bulk_min_qty, bulk_tiers')
        .in('id', brandIds)
      // Pre-migration DB (no bulk_tiers column yet) — retry with the legacy
      // single-tier bulk columns only so multi-tier-aware and legacy-brand
      // DBs both keep working.
      if (error && /does not exist|could not find/i.test(error.message)) {
        console.warn('[createOrder] bulk_tiers column missing — running with the legacy single-tier brand bulk columns. Run migration_add_bulk_tiers.sql in Supabase to enable multi-tier bulk pricing.')
        ;({ data, error } = await supabase
          .from('brands')
          .select('id, name, bulk_enabled, standard_price, bulk_unit_price, bulk_min_qty')
          .in('id', brandIds))
      }
      // Pre-migration DB (no brand bulk columns at all) — fall back to names
      // only so checkout keeps working without brand bulk pricing.
      if (error && /does not exist|could not find/i.test(error.message)) {
        console.warn('[createOrder] Brand bulk columns missing — running without brand bulk pricing. Run migration_add_brand_bulk_pricing.sql in Supabase to enable it.')
        ;({ data, error } = await supabase
          .from('brands')
          .select('id, name')
          .in('id', brandIds))
      }
      if (error) {
        console.error('[createOrder] brands fetch error:', error.message)
      }
      for (const b of data || []) {
        brandNames[String(b.id)] = b.name
        brandRules[String(b.id)] = b
      }
    }

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

        // Brand bulk bookkeeping. `pieces` = the pieces this line contributes
        // to its brand's combined tally; `unit_pieces` = the pieces inside ONE
        // unit of the line so the existing invariant holds (line total =
        // unit_price × quantity); `normal_per_piece` = the line's own normal
        // per-piece price (bulk applies only when it is a genuine discount
        // below this). All normal-price math — the brand bulk discount is
        // applied in a second pass (applyBrandBulk) below.
        let unitPrice
        let unitPieces = 1
        let pieces
        let normalPerPiece
        let variantFields = {}
        if (item.variant_id != null) {
          const variant = variantMap.get(String(item.variant_id))
          if (!variant || String(variant.product_id) !== String(product.id)) {
            throw new Error(`The selected size/variant of ${product.name} is no longer available. Please refresh and try again.`)
          }
          // The variant's TOTAL price is the authoritative amount paid for ONE
          // selected variant (e.g. ₹7500 for "1000 Pieces") — never the old
          // per-piece `price`, and never a client-supplied value. Legacy
          // variants without total_price fall back to their old `price`.
          const variantTotal = Number(variant.total_price ?? variant.price)
          const variantPerUnit = Number(variant.price_per_unit ?? variant.price)
          if (!Number.isFinite(variantTotal) || variantTotal < 0) {
            throw new Error(`Invalid price for ${product.name}.`)
          }
          if (!Number.isFinite(Number(variant.quantity_value)) || Number(variant.quantity_value) <= 0) {
            throw new Error(`Invalid variant quantity for ${product.name}.`)
          }
          const validUnits = ['ML', 'Gram', 'Pieces']
          if (!validUnits.includes(String(variant.quantity_unit ?? '').trim())) {
            throw new Error(`Invalid variant unit for ${product.name}.`)
          }

          const isPiecesUnit = String(variant.quantity_unit ?? '').trim() === 'Pieces'
          const sizePerUnit = Math.floor(Number(variant.quantity_value))

          // `pieces` is the TOTAL pieces of the line — either an exact piece
          // count picked on the product page (quantity 1) or a legacy pack
          // line's derived tally (size × quantity). It mirrors the storefront
          // linePieces. unitPieces = pieces per ONE unit of the line, so the
          // existing invariant holds: line total = unit_price × quantity.
          const explicitPieces = item.pieces != null ? Math.floor(Number(item.pieces)) : null
          if (explicitPieces != null && (!Number.isFinite(explicitPieces) || explicitPieces < 1)) {
            throw new Error(`Invalid piece quantity for ${product.name}.`)
          }

          // The brand rule is the source of truth for the brand's
          // piece-priced lines: for Pieces-unit variants the brand's standard
          // price is the authoritative normal per-piece price (the product's
          // own variant per-piece figure may be stale — e.g. ₹45 while the
          // admin's brand rule says ₹50). Non-Pieces variants keep their own
          // TOTAL per unit as the per-piece figure.
          const brand =
            product.brand_id != null ? brandRules[String(product.brand_id)] : null
          const brandStdIsValid = isValidBulkRule(brand)

          // The line's own normal per-piece price (bulk only ever discounts
          // below this): a Pieces variant's price-per-unit, a non-Pieces
          // variant's TOTAL per unit (each unit counts as one piece), with
          // defensive fallbacks for legacy data.
          const lineNormalPerPiece = isPiecesUnit
            ? (brandStdIsValid
                ? Number(brand.standard_price)
                : (variantPerUnit > 0 && variantTotal > 0 && variantPerUnit < variantTotal
                    ? variantPerUnit
                    : round2(variantTotal / (sizePerUnit || 1))))
            : variantTotal

          if (explicitPieces != null) {
            unitPieces = Math.max(1, Math.round(explicitPieces / quantity))
            unitPrice = round2(lineNormalPerPiece * unitPieces)
          } else {
            // Pack-based line: a Pieces unit is charged at the brand's
            // standard per-piece price × pack size (mirrors the cart); other
            // units keep the variant total as the amount per ONE unit.
            unitPieces = isPiecesUnit ? sizePerUnit : 1
            unitPrice =
              isPiecesUnit && brandStdIsValid
                ? round2(Number(brand.standard_price) * unitPieces)
                : variantTotal
          }
          normalPerPiece = lineNormalPerPiece
          pieces = unitPieces * quantity

          variantFields = {
            variant_id: variant.id,
            // Piece-based lines store the EXACT pieces ordered (mirrors the
            // cart line the customer saw); pack-based lines keep the DB label.
            variant_label:
              explicitPieces != null
                ? `${explicitPieces} ${String(variant.quantity_unit ?? '').trim()}`
                : variant.display_label,
            quantity_value: explicitPieces != null ? explicitPieces : variant.quantity_value,
            quantity_unit: variant.quantity_unit,
            variant_total_price: round2(variantTotal),
            variant_price_per_unit: round2(variantPerUnit),
          }
        } else {
          unitPrice = Number(product.price)
          normalPerPiece = unitPrice
          unitPieces = 1
          pieces = quantity
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`Invalid price for ${product.name}.`)
        }

        return {
          product_id: product.id,
          product_name: product.name,
          image: product.image || null,
          quantity,
          // unit_price is the amount charged per ONE unit of this line: the
          // selected variant's total price (variant products) or the product
          // price (variant-less products). Line total = unit_price × quantity.
          // normal_unit_price is the same figure BEFORE any brand bulk
          // discount (bulk never raises a price).
          unit_price: round2(unitPrice),
          subtotal: round2(unitPrice * quantity),
          normal_unit_price: round2(unitPrice),
          // Brand bulk bookkeeping (consumed by applyBrandBulk below).
          unit_pieces: unitPieces,
          pieces,
          normal_per_piece: round2(normalPerPiece),
          // Brand context for order-history display (never affects pricing).
          brand_id: product.brand_id ?? null,
          brand_name: product.brand_id != null ? (brandNames[String(product.brand_id)] ?? null) : null,
          ...variantFields,
        }
      })
    } catch (err) {
      return res.status(400).json({ error: err.message })
    }

    // --- Brand-level bulk pricing ------------------------------------------
    // Once a brand's combined pieces (across ANY mix of that brand's items in
    // this order) reach its bulk_min_qty, every line of that brand is charged
    // per piece at the brand's bulk_unit_price — but only when cheaper than
    // the line's own normal per-piece price. Applied on the DB-computed
    // normal prices above; the totals below reflect it.
    const { items: bulkItems, brands: bulkSummary } = applyBrandBulk(normalizedItems, brandRules)
    normalizedItems = bulkItems

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
      // Canonical payment code (cod | upi) — the label lives on the
      // payment_method column; the code rides in notes for exact matching.
      payment_code: paymentCode,
      // Per-brand bulk state (present only when an eligible brand was in the
      // order) — why the prices are what they are, for the admin/invoice.
      ...(bulkSummary.length > 0 ? { brand_bulk: bulkSummary } : {}),
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
      payment_method: paymentMethodLabel,
      payment_status: 'Pending',
      order_status: 'Pending',
      notes: JSON.stringify(notes),
    }

    let { data, error } = await supabase
      .from('orders')
      .insert(insertPayload)
      .select('*')
      .single()

    // Pre-migration compatibility: the live orders table once had a
    // orders_payment_method_check constraint that ONLY accepted the exact
    // legacy string 'Cash On Delivery'. Until the payment-methods migration
    // (server/db/migration_add_payment_methods.sql) is applied, the canonical
    // 'Cash on Delivery' label is rejected by the check constraint — so a COD
    // order retries with the legacy label the constraint still accepts.
    // UPI orders cannot fall back (no legacy UPI value exists) and correctly
    // fail with a clear message until the migration is applied.
    if (error && paymentCode === 'cod' && /orders_payment_method_check/.test(error.message)) {
      // The saved row keeps the legacy label, but the notes already carry the
      // canonical code (payment_code: 'cod') so the admin chips still work.
      console.warn('[createOrder] payment_method check constraint rejected the canonical label — retrying with legacy label (pre-migration DB).')
      ;({ data, error } = await supabase
        .from('orders')
        .insert({ ...insertPayload, payment_method: 'Cash On Delivery' })
        .select('*')
        .single())
    }

    if (error && paymentCode !== 'cod' && /orders_payment_method_check/.test(error.message)) {
      // UPI order on a pre-migration DB: the old orders_payment_method_check
      // constraint has no UPI value at all, so there is no fallback label.
      // The payment-methods migration (server/db/migration_add_payment_methods.sql)
      // must be applied before UPI orders can be stored.
      console.error('[createOrder] UPI order rejected by orders_payment_method_check — the payment-methods migration has not been applied.')
      return res.status(503).json({
        error: 'UPI orders are temporarily unavailable. Please choose Cash on Delivery or try again shortly.',
      })
    }

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
        // Canonical payment code (cod | upi) for exact admin chip matching;
        // falls back to the display label for legacy orders.
        payment_code: notesInfo.payment_code || o.payment_method || '',
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
      payment_code: notesInfo.payment_code || data.payment_method || '',
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

    // --- Per-status timestamp recording (customer order-progress timeline) -
    // The orders table has no per-status timestamp columns, so each
    // transition time is appended to the order's existing `notes`
    // status_history JSONB — the same additive, zero-migration pattern used
    // for customer_name / items / brand_bulk. First write wins per step:
    // re-setting a status never rewrites the original transition time, and
    // every other notes field is preserved untouched. (The read-then-update
    // is not atomic — two concurrent status changes could lose one notes
    // write — acceptable for low-frequency admin actions; no optimistic
    // concurrency exists elsewhere either.)
    const { data: existing, error: readError } = await supabase
      .from('orders')
      .select('id, notes')
      .eq('id', id)
      .maybeSingle()

    if (readError) {
      console.error('updateOrderStatus read error:', readError.message || readError)
      console.error('updateOrderStatus read code:', readError.code)
      console.error('updateOrderStatus read hint:', readError.hint)
      return res.status(500).json({ error: 'Failed to update order status.' })
    }
    if (!existing) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    const mergedNotes = recordStatusTimestamp(parseOrderNotes(existing), matched)

    const { data, error } = await supabase
      .from('orders')
      .update({ order_status: matched, notes: stringifyOrderNotes(mergedNotes) })
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
      payment_code: notesInfo.payment_code || data.payment_method || '',
    }

    return res.json({ order: enriched })
  } catch (err) {
    console.error('updateOrderStatus error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// PATCH /api/admin/orders/:id/payment-status
// Protected. Staff-only payment confirmation. There is NO payment gateway:
// a staff member manually marks an order 'Paid' after actually receiving the
// payment (UPI transfer confirmation, cash received at delivery, etc.).
// Only Pending/Paid are accepted — nothing is ever auto-confirmed.
async function updatePaymentStatus(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body

    // Canonical values accepted by the live orders_payment_status_check
    // constraint (see utils/orderPayment.js). Case-insensitive; anything
    // else is rejected with a 400.
    const matched = resolvePaymentStatus(status)
    if (!matched) {
      return res.status(400).json({
        error: 'Invalid payment status. Must be one of: Pending, Paid.',
      })
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ payment_status: matched })
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('updatePaymentStatus error:', error.message || error)
      console.error('updatePaymentStatus code:', error.code)
      console.error('updatePaymentStatus hint:', error.hint)
      return res.status(500).json({ error: 'Failed to update payment status.' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Order not found.' })
    }

    // Same enrichment as every other admin order endpoint (direct columns
    // with fallback to notes parsing).
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
      payment_status: data.payment_status || 'Pending',
      payment_code: notesInfo.payment_code || data.payment_method || '',
    }

    return res.json({ order: enriched })
  } catch (err) {
    console.error('updatePaymentStatus error:', err)
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
  updatePaymentStatus,
  deleteOrder,
  getDashboardStats,
}

