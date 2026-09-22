import { describe, it, expect } from 'vitest'
import { validateItemsStock, deductOrderStock, restoreOrderStock } from './stockDeduction.js'

describe('validateItemsStock (Product-Level Stock ON/OFF)', () => {
  const productMap = new Map([
    ['p1', { id: 'p1', name: 'Perfume Bottle', is_in_stock: true }],
    ['p2', { id: 'p2', name: 'Out of Stock Perfume', is_in_stock: false }],
    ['p3', { id: 'p3', name: 'Sumaiya', is_in_stock: true }],
    ['p4', { id: 'p4', name: 'Legacy Available Perfume', stock: 50 }],
    ['p5', { id: 'p5', name: 'Legacy Depleted Perfume', stock: 0 }],
  ])

  it('allows items when all products have is_in_stock: true', () => {
    const items = [
      { product_id: 'p1', quantity: 500 },
      { product_id: 'p3', variant_id: 'v1', pieces: 100, quantity: 10 },
      { product_id: 'p4', quantity: 25 },
    ]
    const err = validateItemsStock(items, productMap)
    expect(err).toBeNull()
  })

  it('rejects order with clear error message when product is_in_stock is false', () => {
    const items = [{ product_id: 'p2', quantity: 1 }]
    const err = validateItemsStock(items, productMap)
    expect(err).toBe('Out of Stock Perfume is currently out of stock.')
  })

  it('rejects order when legacy product has stock: 0 and no is_in_stock', () => {
    const items = [{ product_id: 'p5', quantity: 1 }]
    const err = validateItemsStock(items, productMap)
    expect(err).toBe('Legacy Depleted Perfume is currently out of stock.')
  })

  it('rejects when product is not in productMap', () => {
    const items = [{ product_id: 'unknown-id', quantity: 1 }]
    const err = validateItemsStock(items, productMap)
    expect(err).toBe('Product is no longer available.')
  })

  it('allows any large order quantity without numerical deduction restrictions while in stock', () => {
    const items = [{ product_id: 'p1', quantity: 50000 }]
    const err = validateItemsStock(items, productMap)
    expect(err).toBeNull()
  })

  it('deductOrderStock and restoreOrderStock succeed as safe no-ops without altering stock', async () => {
    const deductResult = await deductOrderStock()
    expect(deductResult.success).toBe(true)
    expect(deductResult.deducted).toEqual([])

    const restoreResult = await restoreOrderStock()
    expect(restoreResult.success).toBe(true)
  })
})
