import { describe, it, expect } from 'vitest'
import {
  LOW_STOCK_THRESHOLD,
  normalizeStock,
  getStockStatus,
  resolveCurrentStock,
} from './stock'

describe('storefront stock utils', () => {
  it('normalizes stock values', () => {
    expect(normalizeStock(10)).toBe(10)
    expect(normalizeStock('15')).toBe(15)
    expect(normalizeStock('0')).toBe(0)
    expect(normalizeStock(-5)).toBe(0)
    expect(normalizeStock(null)).toBe(0)
    expect(normalizeStock(undefined)).toBe(0)
    expect(normalizeStock('invalid')).toBe(0)
    expect(normalizeStock(12.7)).toBe(12)
  })

  it('determines stock status correctly', () => {
    expect(getStockStatus(null)).toBeNull()

    const outStatus = getStockStatus(0)
    expect(outStatus.status).toBe('out_of_stock')
    expect(outStatus.inStock).toBe(false)
    expect(outStatus.isOutOfStock).toBe(true)
    expect(outStatus.label).toBe('Out of Stock')

    const lowStatus = getStockStatus(5)
    expect(lowStatus.status).toBe('low_stock')
    expect(lowStatus.inStock).toBe(true)
    expect(lowStatus.isLowStock).toBe(true)
    expect(lowStatus.label).toBe('Only 5 available')

    const inStatus = getStockStatus(15)
    expect(inStatus.status).toBe('in_stock')
    expect(inStatus.inStock).toBe(true)
    expect(inStatus.isLowStock).toBe(false)
    expect(inStatus.label).toBe('In Stock')
  })

  it('resolves current stock for products with and without variants', () => {
    const singleProduct = { id: 1, stock: 50 }
    expect(resolveCurrentStock(singleProduct)).toBe(50)

    const variantProduct = {
      id: 2,
      stock: 100, // should be ignored in favor of variant stock
      variants: [
        { id: 10, stock: 25 },
        { id: 11, stock: 0 },
      ],
    }

    // When no variant is selected
    expect(resolveCurrentStock(variantProduct, null)).toBeNull()

    // When variant 10 is selected
    expect(resolveCurrentStock(variantProduct, variantProduct.variants[0])).toBe(25)

    // When variant 11 is selected
    expect(resolveCurrentStock(variantProduct, variantProduct.variants[1])).toBe(0)
  })
})
