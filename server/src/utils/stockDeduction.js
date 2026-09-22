// Product availability validation and order execution utilities.
// Architecture: Product-Level Stock ON/OFF Availability System.
// Stock belongs ONLY to the product (is_in_stock).
// There is NO numerical stock consumption or deduction.

const { isProductInStock } = require('./stock')

/**
 * Validates availability for all items in an order before creation.
 * Returns null if all products are available (In Stock),
 * or an error string if any product is out of stock.
 */
function validateItemsStock(items, productMap) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Order items are required.'
  }

  for (const item of items) {
    const productId = String(item.product_id ?? item.id ?? '')
    if (!productId) {
      return 'Every order item must include a product_id.'
    }

    const product = productMap.get(productId)
    const productName = product?.name || 'Product'

    if (!product) {
      return `${productName} is no longer available.`
    }

    if (!isProductInStock(product)) {
      return `${productName} is currently out of stock.`
    }
  }

  return null
}

/**
 * Deducts stock for order items.
 * Under the Product-Level ON/OFF Availability model, stock is effectively
 * unlimited until toggled OFF by the admin. No numerical stock deduction is performed.
 * Returns { success: true, deducted: [] }.
 */
async function deductOrderStock() {
  return { success: true, deducted: [] }
}

/**
 * Restores stock for order items when an order is cancelled or returned.
 * Under the Product-Level ON/OFF Availability model, no numerical stock deduction
 * occurred, so no numerical restoration is needed.
 * Returns { success: true }.
 */
async function restoreOrderStock() {
  return { success: true }
}

module.exports = {
  validateItemsStock,
  deductOrderStock,
  restoreOrderStock,
}
