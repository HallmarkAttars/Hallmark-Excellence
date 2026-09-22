import { describe, it, expect } from 'vitest'
import { isProductInStock, getStockStatus, normalizeStock } from './stock'

describe('admin stock utilities (Product-Level Availability)', () => {
  describe('isProductInStock', () => {
    it('returns true when is_in_stock is true', () => {
      expect(isProductInStock({ id: 'p1', is_in_stock: true })).toBe(true)
      expect(isProductInStock({ id: 'p1', is_in_stock: true, stock: 0 })).toBe(true)
    })

    it('returns false when is_in_stock is false', () => {
      expect(isProductInStock({ id: 'p2', is_in_stock: false })).toBe(false)
      expect(isProductInStock({ id: 'p2', is_in_stock: false, stock: 100 })).toBe(false)
    })

    it('falls back to stock > 0 for pre-migration products', () => {
      expect(isProductInStock({ id: 'p3', stock: 10 })).toBe(true)
      expect(isProductInStock({ id: 'p4', stock: 0 })).toBe(false)
    })
  })

  describe('getStockStatus', () => {
    it('detects out of stock (false or 0 or { is_in_stock: false })', () => {
      const resBool = getStockStatus(false)
      expect(resBool.status).toBe('out_of_stock')
      expect(resBool.label).toBe('Out of Stock')
      expect(resBool.badgeClass).toBe('stock-badge-out')
      expect(resBool.isOutOfStock).toBe(true)

      const resObj = getStockStatus({ is_in_stock: false })
      expect(resObj.status).toBe('out_of_stock')
      expect(resObj.badgeText).toBe('🔴 Out of Stock')
    })

    it('detects in stock (true or 100 or { is_in_stock: true })', () => {
      const resBool = getStockStatus(true)
      expect(resBool.status).toBe('in_stock')
      expect(resBool.label).toBe('In Stock')
      expect(resBool.badgeClass).toBe('stock-badge-in')
      expect(resBool.inStock).toBe(true)

      const resObj = getStockStatus({ is_in_stock: true })
      expect(resObj.status).toBe('in_stock')
      expect(resObj.badgeText).toBe('🟢 In Stock')
    })
  })

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
})
