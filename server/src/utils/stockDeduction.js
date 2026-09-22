// Stock validation, deduction, and restoration utilities for order processing.
// Ensures strict inventory limits, prevents overselling, and handles restock on cancellation.
// Single source of truth is products.stock.

/**
 * Helper to determine the total units/pieces requested by an item.
 */
function getItemRequestedQuantity(item, variantMap) {
  if (item.pieces != null && Number.isFinite(Number(item.pieces)) && Number(item.pieces) > 0) {
    return Math.floor(Number(item.pieces))
  }
  const baseQty = Math.floor(Number(item.quantity ?? item.qty ?? 1))
  if (!Number.isFinite(baseQty) || baseQty < 1) return 0

  if (item.variant_id != null && variantMap && variantMap.has(String(item.variant_id))) {
    const v = variantMap.get(String(item.variant_id))
    const isPieces = String(v?.quantity_unit || '').trim().toLowerCase() === 'pieces'
    const size = Number(v?.quantity_value)
    if (isPieces && Number.isFinite(size) && size > 0) {
      return baseQty * Math.floor(size)
    }
  }

  return baseQty
}

/**
 * Aggregates requested quantities across order items by product_id and validates against products.stock.
 * Returns null if all items are in stock, or an error string if any item exceeds available stock.
 */
function validateItemsStock(items, productMap, variantMap) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Order items are required.'
  }

  // Aggregate quantities by product ID
  const productQuantities = new Map()

  for (const item of items) {
    const qty = getItemRequestedQuantity(item, variantMap)
    if (qty < 1) {
      return 'Invalid item quantity.'
    }

    const productId = String(item.product_id ?? item.id ?? '')
    if (!productId) {
      return 'Every order item must include a product_id.'
    }

    const currentTotal = productQuantities.get(productId) || 0
    productQuantities.set(productId, currentTotal + qty)
  }

  // Validate aggregated quantities against product database stock
  for (const [productId, requestedQty] of productQuantities.entries()) {
    const product = productMap.get(productId)
    const productName = product?.name || 'Product'

    if (!product) {
      return `${productName} is no longer available.`
    }

    const availableStock = Number.isFinite(Number(product.stock))
      ? Math.max(0, Math.floor(Number(product.stock)))
      : 0

    if (requestedQty > availableStock) {
      if (availableStock <= 0) {
        return `${productName} is out of stock.`
      }
      return `Only ${availableStock} available for ${productName}.`
    }
  }

  return null
}

/**
 * Deducts stock for order items atomically in Supabase against products.stock.
 * Aggregates multiple items of the same product to deduct stock in a single atomic update per product.
 * Returns { success: true, deducted: [...] } or { success: false, error: string }.
 * If any deduction fails (oversell condition), rolls back all successfully deducted items in this batch.
 */
async function deductOrderStock(items, supabase) {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, deducted: [] }
  }

  // Aggregate total quantities per product_id
  const productTotals = new Map()
  for (const item of items) {
    const qty = item.pieces != null && Number.isFinite(Number(item.pieces)) && Number(item.pieces) > 0
      ? Math.floor(Number(item.pieces))
      : Math.floor(Number(item.quantity ?? item.qty ?? 1))
    if (qty <= 0) continue

    const productId = String(item.product_id ?? item.id ?? '')
    if (!productId) continue

    const current = productTotals.get(productId) || 0
    productTotals.set(productId, current + qty)
  }

  const deducted = []

  try {
    for (const [productId, qty] of productTotals.entries()) {
      // Fetch current product stock
      const { data: pData, error: pReadErr } = await supabase
        .from('products')
        .select('id, name, stock')
        .eq('id', productId)
        .single()

      if (pReadErr || !pData) {
        throw new Error('Failed to verify product stock before deduction.')
      }

      const currentStock = Number(pData.stock ?? 0)
      if (currentStock < qty) {
        throw new Error(`Insufficient stock available for ${pData.name || 'product'}.`)
      }

      const newStock = currentStock - qty
      const { data: updated, error: pUpErr } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId)
        .gte('stock', qty)
        .select('id, stock')

      if (pUpErr || !updated || updated.length === 0) {
        throw new Error('Stock deduction conflict detected (overselling prevented).')
      }

      deducted.push({ id: productId, quantity: qty })
    }

    return { success: true, deducted }
  } catch (err) {
    // Roll back already deducted products in reverse order
    for (const d of deducted) {
      try {
        const { data: p } = await supabase
          .from('products')
          .select('stock')
          .eq('id', d.id)
          .single()
        if (p) {
          await supabase
            .from('products')
            .update({ stock: (p.stock || 0) + d.quantity })
            .eq('id', d.id)
        }
      } catch (rollbackErr) {
        console.error('[deductOrderStock] Rollback error:', rollbackErr)
      }
    }

    return { success: false, error: err.message }
  }
}

/**
 * Restores stock for items when an order is cancelled or returned against products.stock.
 * Aggregates quantities to restore each product stock cleanly.
 */
async function restoreOrderStock(items, supabase) {
  if (!Array.isArray(items) || items.length === 0) return { success: true }

  const productTotals = new Map()
  for (const item of items) {
    const qty = item.pieces != null && Number.isFinite(Number(item.pieces)) && Number(item.pieces) > 0
      ? Math.floor(Number(item.pieces))
      : Math.floor(Number(item.quantity ?? item.qty ?? 1))
    if (qty <= 0) continue

    const productId = String(item.product_id ?? item.id ?? '')
    if (!productId) continue

    const current = productTotals.get(productId) || 0
    productTotals.set(productId, current + qty)
  }

  for (const [productId, qty] of productTotals.entries()) {
    try {
      const { data: p } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single()
      if (p) {
        await supabase
          .from('products')
          .update({ stock: Math.max(0, (p.stock || 0) + qty) })
          .eq('id', productId)
      }
    } catch (err) {
      console.error('[restoreOrderStock] Error restoring stock for product:', productId, err)
    }
  }

  return { success: true }
}

module.exports = {
  validateItemsStock,
  deductOrderStock,
  restoreOrderStock,
}

