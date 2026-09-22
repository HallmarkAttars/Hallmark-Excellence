import { describe, it, expect } from 'vitest'
import { isProductInStock, getStockStatus, normalizeStock } from './stock.js'

describe('server stock utility (Product-Level Availability)', () => {
  describe('isProductInStock', () => {
    it('returns true when is_in_stock is true', () => {
      expect(isProductInStock({ id: 'p1', is_in_stock: true })).toBe(true)
      expect(isProductInStock({ id: 'p1', is_in_stock: true, stock: 0 })).toBe(true)
    })

    it('returns false when is_in_stock is false', () => {
      expect(isProductInStock({ id: 'p2', is_in_stock: false })).toBe(false)
      expect(isProductInStock({ id: 'p2', is_in_stock: false, stock: 100 })).toBe(false)
    })

    it('falls back to stock > 0 for pre-migration records without is_in_stock', () => {
      expect(isProductInStock({ id: 'p3', stock: 10 })).toBe(true)
      expect(isProductInStock({ id: 'p4', stock: 0 })).toBe(false)
    })

    it('defaults to true for products with null/undefined stock and is_in_stock', () => {
      expect(isProductInStock({ id: 'p5' })).toBe(true)
      expect(isProductInStock(null)).toBe(false)
    })
  })

  describe('getStockStatus', () => {
    it('identifies Out of Stock (false or { is_in_stock: false })', () => {
      const resFalse = getStockStatus(false)
      expect(resFalse.status).toBe('out_of_stock')
      expect(resFalse.label).toBe('Out of Stock')
      expect(resFalse.inStock).toBe(false)
      expect(resFalse.isOutOfStock).toBe(true)

      const resObj = getStockStatus({ is_in_stock: false })
      expect(resObj.status).toBe('out_of_stock')
      expect(resObj.inStock).toBe(false)
    })

    it('identifies In Stock (true or { is_in_stock: true })', () => {
      const resTrue = getStockStatus(true)
      expect(resTrue.status).toBe('in_stock')
      expect(resTrue.label).toBe('In Stock')
      expect(resTrue.inStock).toBe(true)
      expect(resTrue.isOutOfStock).toBe(false)

      const resObj = getStockStatus({ is_in_stock: true })
      expect(resObj.status).toBe('in_stock')
      expect(resObj.inStock).toBe(true)
    })
  })

  describe('normalizeStock', () => {
    it('normalizes valid positive numbers to integer', () => {
      expect(normalizeStock(10)).toBe(10)
      expect(normalizeStock('25')).toBe(25)
      expect(normalizeStock(42.8)).toBe(42)
    })

    it('normalizes 0 and empty/null/undefined to 0', () => {
      expect(normalizeStock(0)).toBe(0)
      expect(normalizeStock('0')).toBe(0)
      expect(normalizeStock('')).toBe(0)
      expect(normalizeStock(null)).toBe(0)
      expect(normalizeStock(undefined)).toBe(0)
    })
  })
})
