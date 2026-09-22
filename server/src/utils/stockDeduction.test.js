import { describe, it, expect } from 'vitest'
import { validateItemsStock } from './stockDeduction.js'

describe('validateItemsStock (Product-Level Stock)', () => {
  const productMap = new Map([
    ['p1', { id: 'p1', name: 'Perfume Bottle', stock: 100 }],
    ['p2', { id: 'p2', name: 'Out of Stock Perfume', stock: 0 }],
    ['p3', { id: 'p3', name: 'Sumaiya', stock: 50 }],
  ])

  const variantMap = new Map([
    ['v1', { id: 'v1', product_id: 'p3', display_label: '6 Pieces', quantity_value: 6, quantity_unit: 'Pieces' }],
    ['v2', { id: 'v2', product_id: 'p3', display_label: '12 Pieces', quantity_value: 12, quantity_unit: 'Pieces' }],
    ['v3', { id: 'v3', product_id: 'p3', display_label: '24 Pieces', quantity_value: 24, quantity_unit: 'Pieces' }],
  ])

  it('allows items when overall product stock is sufficient', () => {
    const items = [
      { product_id: 'p1', quantity: 5 },
      { product_id: 'p3', variant_id: 'v1', pieces: 6, quantity: 1 },
      { product_id: 'p3', variant_id: 'v2', pieces: 12, quantity: 1 },
    ]
    const err = validateItemsStock(items, productMap, variantMap)
    expect(err).toBeNull()
  })

  it('rejects when requested quantity exceeds product stock (no variants)', () => {
    const items = [{ product_id: 'p1', quantity: 101 }]
    const err = validateItemsStock(items, productMap, variantMap)
    expect(err).toBe('Only 100 available for Perfume Bottle.')
  })

  it('rejects when product is out of stock (stock = 0)', () => {
    const items = [{ product_id: 'p2', quantity: 1 }]
    const err = validateItemsStock(items, productMap, variantMap)
    expect(err).toBe('Out of Stock Perfume is out of stock.')
  })

  it('aggregates multiple different variants of the same product against product stock', () => {
    // Sumaiya stock = 50. Total requested: 24 + 24 + 6 = 54 > 50
    const items = [
      { product_id: 'p3', variant_id: 'v3', pieces: 24, quantity: 1 },
      { product_id: 'p3', variant_id: 'v3', pieces: 24, quantity: 1 },
      { product_id: 'p3', variant_id: 'v1', pieces: 6, quantity: 1 },
    ]
    const err = validateItemsStock(items, productMap, variantMap)
    expect(err).toBe('Only 50 available for Sumaiya.')
  })

  it('allows exact product stock quantity across variants', () => {
    // Sumaiya stock = 50. Total requested: 24 + 12 + 12 + 2 = 50
    const items = [
      { product_id: 'p3', variant_id: 'v3', pieces: 24, quantity: 1 },
      { product_id: 'p3', variant_id: 'v2', pieces: 12, quantity: 1 },
      { product_id: 'p3', variant_id: 'v2', pieces: 12, quantity: 1 },
      { product_id: 'p3', variant_id: 'v1', pieces: 2, quantity: 1 },
    ]
    const err = validateItemsStock(items, productMap, variantMap)
    expect(err).toBeNull()
  })

  it('correctly handles pack size when explicit pieces is not set', () => {
    // 4 packs of "12 Pieces" = 48 pieces <= 50 stock -> allowed
    const itemsAllowed = [{ product_id: 'p3', variant_id: 'v2', quantity: 4 }]
    expect(validateItemsStock(itemsAllowed, productMap, variantMap)).toBeNull()

    // 5 packs of "12 Pieces" = 60 pieces > 50 stock -> rejected
    const itemsRejected = [{ product_id: 'p3', variant_id: 'v2', quantity: 5 }]
    expect(validateItemsStock(itemsRejected, productMap, variantMap)).toBe('Only 50 available for Sumaiya.')
  })
})

