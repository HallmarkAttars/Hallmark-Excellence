// Centralized stock constants and helper functions
// Shared across server operations for stock status and normalization.

const LOW_STOCK_THRESHOLD = 10

function normalizeStock(value) {
  if (value === '' || value == null) return 0
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

function getStockStatus(stock) {
  const n = normalizeStock(stock)
  if (n <= 0) {
    return {
      status: 'out_of_stock',
      label: 'Out of Stock',
      inStock: false,
      isLowStock: false,
      isOutOfStock: true,
    }
  }
  if (n <= LOW_STOCK_THRESHOLD) {
    return {
      status: 'low_stock',
      label: 'Low Stock',
      inStock: true,
      isLowStock: true,
      isOutOfStock: false,
    }
  }
  return {
    status: 'in_stock',
    label: 'In Stock',
    inStock: true,
    isLowStock: false,
    isOutOfStock: false,
  }
}

module.exports = {
  LOW_STOCK_THRESHOLD,
  normalizeStock,
  getStockStatus,
}
