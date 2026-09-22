import { describe, it, expect } from 'vitest'
import {
  isProductInStock,
  normalizeStock,
  getStockStatus,
  resolveCurrentStock,
} from './stock'

describe('storefront stock utils (Product-Level Availability)', () => {
  it('normalizes stock values safely', () => {
    expect(normalizeStock(10)).toBe(10)
    expect(normalizeStock('15')).toBe(15)
    expect(normalizeStock('0')).toBe(0)
    expect(normalizeStock(-5)).toBe(0)
    expect(normalizeStock(null)).toBe(0)
    expect(normalizeStock(undefined)).toBe(0)
  })

  it('determines boolean product availability correctly', () => {
    expect(isProductInStock({ id: 1, is_in_stock: true })).toBe(true)
    expect(isProductInStock({ id: 2, is_in_stock: false })).toBe(false)
    // Legacy fallback
    expect(isProductInStock({ id: 3, stock: 50 })).toBe(true)
    expect(isProductInStock({ id: 4, stock: 0 })).toBe(false)
  })

  it('determines stock status without low stock or numerical text', () => {
    expect(getStockStatus(null)).toBeNull()

    const outStatus = getStockStatus(false)
    expect(outStatus.status).toBe('out_of_stock')
    expect(outStatus.inStock).toBe(false)
    expect(outStatus.isOutOfStock).toBe(true)
    expect(outStatus.label).toBe('Out of Stock')
    expect(outStatus.badgeText).toBe('🔴 Out of Stock')

    const inStatus = getStockStatus(true)
    expect(inStatus.status).toBe('in_stock')
    expect(inStatus.inStock).toBe(true)
    expect(inStatus.isOutOfStock).toBe(false)
    expect(inStatus.label).toBe('In Stock')
    expect(inStatus.badgeText).toBe('🟢 In Stock')
  })

  it('resolves product availability for products with and without variants', () => {
    const singleProduct = { id: 1, is_in_stock: true }
    expect(resolveCurrentStock(singleProduct)).toBe(true)

    const outProduct = { id: 2, is_in_stock: false }
    expect(resolveCurrentStock(outProduct)).toBe(false)

    const variantProduct = {
      id: 3,
      is_in_stock: true,
      variants: [
        { id: 10, display_label: '6 Pieces' },
        { id: 11, display_label: '12 Pieces' },
      ],
    }

    expect(resolveCurrentStock(variantProduct)).toBe(true)
  })
})
