// Centralized stock helpers and status resolvers for Storefront

export const LOW_STOCK_THRESHOLD = 10

export function normalizeStock(value) {
  if (value === '' || value == null) return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

export function getStockStatus(stock) {
  if (stock == null) return null
  const n = normalizeStock(stock)
  if (n <= 0) {
    return {
      status: 'out_of_stock',
      label: 'Out of Stock',
      badgeClass: 'out-of-stock',
      inStock: false,
      isLowStock: false,
      isOutOfStock: true,
      available: 0,
    }
  }
  if (n <= LOW_STOCK_THRESHOLD) {
    return {
      status: 'low_stock',
      label: `Only ${n} available`,
      badgeClass: 'low-stock',
      inStock: true,
      isLowStock: true,
      isOutOfStock: false,
      available: n,
    }
  }
  return {
    status: 'in_stock',
    label: 'In Stock',
    badgeClass: 'in-stock',
    inStock: true,
    isLowStock: false,
    isOutOfStock: false,
    available: n,
  }
}

/**
 * Resolves current stock for a product & optional selected variant:
 * - If product has variants: returns selectedVariant.stock (or null if no variant selected)
 * - If product has NO variants: returns product.stock
 */
export function resolveCurrentStock(product, selectedVariant = null) {
  if (!product) return null
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0
  if (hasVariants) {
    if (!selectedVariant) return null
    return normalizeStock(selectedVariant.stock)
  }
  return normalizeStock(product.stock)
}
