// Centralized stock constants and helper functions for Admin Panel

export const LOW_STOCK_THRESHOLD = 10

export function normalizeStock(value) {
  if (value === '' || value == null) return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

export function getStockStatus(stock) {
  const n = normalizeStock(stock)
  if (n <= 0) {
    return {
      status: 'out_of_stock',
      label: 'Out of Stock',
      badgeClass: 'stock-badge-out',
      inStock: false,
      isLowStock: false,
      isOutOfStock: true,
    }
  }
  if (n <= LOW_STOCK_THRESHOLD) {
    return {
      status: 'low_stock',
      label: 'Low Stock',
      badgeClass: 'stock-badge-low',
      inStock: true,
      isLowStock: true,
      isOutOfStock: false,
    }
  }
  return {
    status: 'in_stock',
    label: 'In Stock',
    badgeClass: 'stock-badge-in',
    inStock: true,
    isLowStock: false,
    isOutOfStock: false,
  }
}

/**
 * Formats variant stock for collapsed mobile headers:
 * - In Stock (> 10): "Stock 250"
 * - Low Stock (1..10): "⚠ 8 left"
 * - Out of Stock (0): "OUT OF STOCK"
 */
export function formatVariantStockBadge(stock) {
  const n = normalizeStock(stock)
  if (n <= 0) {
    return 'OUT OF STOCK'
  }
  if (n <= LOW_STOCK_THRESHOLD) {
    return `⚠ ${n} left`
  }
  return `Stock ${n}`
}
