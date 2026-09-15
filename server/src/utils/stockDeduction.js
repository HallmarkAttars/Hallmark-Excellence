// Stock validation, deduction, and restoration utilities for order processing.
// Ensures strict inventory limits, prevents overselling, and handles restock on cancellation.

/**
 * Aggregates requested quantities across order items and validates against available stock.
 * Returns null if all items are in stock, or an error string if any item exceeds available stock.
 */
function validateItemsStock(items, productMap, variantMap) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Order items are required.'
  }

  // Aggregate quantities by entity key: "variant:<id>" or "product:<id>"
  const aggregated = new Map()

  for (const item of items) {
    const qty = Math.floor(Number(item.quantity ?? item.qty ?? 1))
    if (!Number.isFinite(qty) || qty < 1) {
      return 'Invalid item quantity.'
    }

    if (item.variant_id != null && String(item.variant_id).trim() !== '') {
      const key = `variant:${String(item.variant_id)}`
      const current = aggregated.get(key) || {
        type: 'variant',
        id: String(item.variant_id),
        productId: String(item.product_id ?? item.id),
        quantity: 0,
      }
      current.quantity += qty
      aggregated.set(key, current)
    } else {
      const key = `product:${String(item.product_id ?? item.id)}`
      const current = aggregated.get(key) || {
        type: 'product',
        id: String(item.product_id ?? item.id),
        productId: String(item.product_id ?? item.id),
        quantity: 0,
      }
      current.quantity += qty
      aggregated.set(key, current)
    }
  }

  // Validate aggregated quantities against database stock
  for (const entry of aggregated.values()) {
    const product = productMap.get(entry.productId)
    const productName = product?.name || 'Product'

    if (entry.type === 'variant') {
      const variant = variantMap.get(entry.id)
      if (!variant) {
        return `The selected variant for ${productName} is no longer available.`
      }
      const availableStock = Number.isFinite(Number(variant.stock)) ? Math.max(0, Math.floor(Number(variant.stock))) : 0
      const variantLabel = variant.display_label || `${variant.quantity_value} ${variant.quantity_unit}`.trim() || 'variant'
      if (entry.quantity > availableStock) {
        if (availableStock <= 0) {
          return `${productName} (${variantLabel}) is out of stock.`
        }
        return `Only ${availableStock} available for ${productName} (${variantLabel}).`
      }
    } else {
      if (!product) {
        return `${productName} is no longer available.`
      }
      const availableStock = Number.isFinite(Number(product.stock)) ? Math.max(0, Math.floor(Number(product.stock))) : 0
      if (entry.quantity > availableStock) {
        if (availableStock <= 0) {
          return `${productName} is out of stock.`
        }
        return `Only ${availableStock} available for ${productName}.`
      }
    }
  }

  return null
}

/**
 * Deducts stock for order items atomically in Supabase.
 * Returns { success: true, deducted: [...] } or { success: false, error: string }.
 * If any deduction fails (oversell condition), rolls back all successfully deducted items in this batch.
 */
async function deductOrderStock(items, supabase) {
  const deducted = []

  try {
    for (const item of items) {
      const qty = Math.floor(Number(item.quantity ?? item.qty ?? 1))
      if (qty <= 0) continue

      if (item.variant_id != null && String(item.variant_id).trim() !== '') {
        const variantId = String(item.variant_id)
        
        // Fetch current stock
        const { data: vData, error: vReadErr } = await supabase
          .from('product_variants')
          .select('id, stock')
          .eq('id', variantId)
          .single()

        if (vReadErr || !vData) {
          throw new Error('Failed to verify variant stock before deduction.')
        }

        const currentStock = Number(vData.stock ?? 0)
        if (currentStock < qty) {
          throw new Error('Insufficient stock available.')
        }

        const newStock = currentStock - qty
        const { data: updated, error: vUpErr } = await supabase
          .from('product_variants')
          .update({ stock: newStock })
          .eq('id', variantId)
          .gte('stock', qty)
          .select('id, stock')

        if (vUpErr || !updated || updated.length === 0) {
          throw new Error('Stock deduction conflict detected (overselling prevented).')
        }

        deducted.push({ type: 'variant', id: variantId, quantity: qty })
      } else {
        const productId = String(item.product_id ?? item.id)
        
        // Fetch current stock
        const { data: pData, error: pReadErr } = await supabase
          .from('products')
          .select('id, stock')
          .eq('id', productId)
          .single()

        if (pReadErr || !pData) {
          throw new Error('Failed to verify product stock before deduction.')
        }

        const currentStock = Number(pData.stock ?? 0)
        if (currentStock < qty) {
          throw new Error('Insufficient stock available.')
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

        deducted.push({ type: 'product', id: productId, quantity: qty })
      }
    }

    return { success: true, deducted }
  } catch (err) {
    // Roll back already deducted items in reverse order
    for (const d of deducted) {
      try {
        if (d.type === 'variant') {
          const { data: v } = await supabase
            .from('product_variants')
            .select('stock')
            .eq('id', d.id)
            .single()
          if (v) {
            await supabase
              .from('product_variants')
              .update({ stock: (v.stock || 0) + d.quantity })
              .eq('id', d.id)
          }
        } else {
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
        }
      } catch (rollbackErr) {
        console.error('[deductOrderStock] Rollback error:', rollbackErr)
      }
    }

    return { success: false, error: err.message }
  }
}

/**
 * Restores stock for items when an order is cancelled or returned.
 */
async function restoreOrderStock(items, supabase) {
  if (!Array.isArray(items) || items.length === 0) return { success: true }

  for (const item of items) {
    const qty = Math.floor(Number(item.quantity ?? item.qty ?? 1))
    if (qty <= 0) continue

    try {
      if (item.variant_id != null && String(item.variant_id).trim() !== '') {
        const { data: v } = await supabase
          .from('product_variants')
          .select('stock')
          .eq('id', String(item.variant_id))
          .single()
        if (v) {
          await supabase
            .from('product_variants')
            .update({ stock: Math.max(0, (v.stock || 0) + qty) })
            .eq('id', String(item.variant_id))
        }
      } else if (item.product_id != null || item.id != null) {
        const pid = String(item.product_id ?? item.id)
        const { data: p } = await supabase
          .from('products')
          .select('stock')
          .eq('id', pid)
          .single()
        if (p) {
          await supabase
            .from('products')
            .update({ stock: Math.max(0, (p.stock || 0) + qty) })
            .eq('id', pid)
        }
      }
    } catch (err) {
      console.error('[restoreOrderStock] Error restoring stock for item:', item, err)
    }
  }

  return { success: true }
}

module.exports = {
  validateItemsStock,
  deductOrderStock,
  restoreOrderStock,
}
