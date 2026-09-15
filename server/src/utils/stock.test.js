import { describe, it, expect } from 'vitest'
import { LOW_STOCK_THRESHOLD, normalizeStock, getStockStatus } from './stock.js'

describe('server stock utility', () => {
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

    it('normalizes negative numbers and invalid strings to 0', () => {
      expect(normalizeStock(-5)).toBe(0)
      expect(normalizeStock('-10')).toBe(0)
      expect(normalizeStock('invalid')).toBe(0)
      expect(normalizeStock(NaN)).toBe(0)
    })
  })

  describe('getStockStatus', () => {
    it('identifies Out of Stock (stock = 0)', () => {
      const res = getStockStatus(0)
      expect(res.status).toBe('out_of_stock')
      expect(res.label).toBe('Out of Stock')
      expect(res.inStock).toBe(false)
      expect(res.isOutOfStock).toBe(true)
    })

    it('identifies Low Stock (1 <= stock <= LOW_STOCK_THRESHOLD)', () => {
      const res1 = getStockStatus(1)
      expect(res1.status).toBe('low_stock')
      expect(res1.label).toBe('Low Stock')
      expect(res1.inStock).toBe(true)
      expect(res1.isLowStock).toBe(true)

      const resThreshold = getStockStatus(LOW_STOCK_THRESHOLD)
      expect(resThreshold.status).toBe('low_stock')
      expect(resThreshold.label).toBe('Low Stock')
      expect(resThreshold.inStock).toBe(true)
      expect(resThreshold.isLowStock).toBe(true)
    })

    it('identifies In Stock (stock > LOW_STOCK_THRESHOLD)', () => {
      const res = getStockStatus(LOW_STOCK_THRESHOLD + 1)
      expect(res.status).toBe('in_stock')
      expect(res.label).toBe('In Stock')
      expect(res.inStock).toBe(true)
      expect(res.isLowStock).toBe(false)
      expect(res.isOutOfStock).toBe(false)
    })
  })
})
