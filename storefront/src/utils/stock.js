// Centralized product availability helpers and status resolvers for Storefront.
// Architecture: ONE PRODUCT -> ONE AVAILABILITY STATUS (is_in_stock).
// All variants follow this single product availability status.
// There is NO low stock or numerical quantity.

export function isProductInStock(product) {
  if (!product) return false
  if (product.is_in_stock !== undefined && product.is_in_stock !== null) {
    return Boolean(product.is_in_stock)
  }
  if (product.stock !== undefined && product.stock !== null) {
    return Number(product.stock) > 0
  }
  return true
}

export function getStockStatus(productOrIsInStock) {
  if (productOrIsInStock == null) return null

  const inStock = typeof productOrIsInStock === 'object'
    ? isProductInStock(productOrIsInStock)
    : (typeof productOrIsInStock === 'boolean'
        ? productOrIsInStock
        : (typeof productOrIsInStock === 'string' && productOrIsInStock.toLowerCase() === 'true'
            ? true
            : (Number(productOrIsInStock) > 0)))

  if (!inStock) {
    return {
      status: 'out_of_stock',
      label: 'Out of Stock',
      badgeClass: 'out-of-stock',
      inStock: false,
      isOutOfStock: true,
      badgeText: '🔴 Out of Stock',
    }
  }

  return {
    status: 'in_stock',
    label: 'In Stock',
    badgeClass: 'in-stock',
    inStock: true,
    isOutOfStock: false,
    badgeText: '🟢 In Stock',
  }
}

/**
 * Resolves current stock state for a product.
 * Returns true if in stock, false if out of stock.
 */
export function resolveCurrentStock(product) {
  if (!product) return false
  return isProductInStock(product)
}

// Kept for backward compatibility with existing tests/callers
export function normalizeStock(value) {
  if (value === '' || value == null) return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}
