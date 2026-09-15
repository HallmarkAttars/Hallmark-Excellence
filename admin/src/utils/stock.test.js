import { describe, it, expect } from 'vitest'
import { LOW_STOCK_THRESHOLD, normalizeStock, getStockStatus, formatVariantStockBadge } from './stock'

describe('admin stock utilities', () => {
  describe('normalizeStock', () => {
    it('handles numbers and strings', () => {
      expect(normalizeStock(250)).toBe(250)
      expect(normalizeStock('100')).toBe(100)
      expect(normalizeStock(0)).toBe(0)
      expect(normalizeStock('')).toBe(0)
      expect(normalizeStock(null)).toBe(0)
      expect(normalizeStock(-5)).toBe(0)
    })
  })

  describe('getStockStatus', () => {
    it('detects out of stock (0)', () => {
      const res = getStockStatus(0)
      expect(res.status).toBe('out_of_stock')
      expect(res.label).toBe('Out of Stock')
      expect(res.badgeClass).toBe('stock-badge-out')
      expect(res.isOutOfStock).toBe(true)
    })

    it('detects low stock (1..10)', () => {
      const res = getStockStatus(8)
      expect(res.status).toBe('low_stock')
      expect(res.label).toBe('Low Stock')
      expect(res.badgeClass).toBe('stock-badge-low')
      expect(res.isLowStock).toBe(true)

      const res10 = getStockStatus(10)
      expect(res10.status).toBe('low_stock')
    })

    it('detects in stock (> 10)', () => {
      const res = getStockStatus(250)
      expect(res.status).toBe('in_stock')
      expect(res.label).toBe('In Stock')
      expect(res.badgeClass).toBe('stock-badge-in')
      expect(res.inStock).toBe(true)
    })
  })

  describe('formatVariantStockBadge', () => {
    it('formats normal in stock', () => {
      expect(formatVariantStockBadge(250)).toBe('Stock 250')
    })

    it('formats low stock with warning icon', () => {
      expect(formatVariantStockBadge(8)).toBe('⚠ 8 left')
      expect(formatVariantStockBadge(1)).toBe('⚠ 1 left')
    })

    it('formats out of stock', () => {
      expect(formatVariantStockBadge(0)).toBe('OUT OF STOCK')
    })
  })
})
