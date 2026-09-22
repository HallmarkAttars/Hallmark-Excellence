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
 * Resolves current stock for a product:
 * Stock belongs strictly to the product (products.stock) as the single source of truth.
 * Variants represent packaging/quantity/pricing options and do not have individual stock.
 */
export function resolveCurrentStock(product) {
  if (!product) return null
  return normalizeStock(product.stock)
}

