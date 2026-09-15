import { describe, it, expect } from 'vitest'
import { validateItemsStock } from './stockDeduction.js'

describe('validateItemsStock', () => {
  const productMap = new Map([
    ['p1', { id: 'p1', name: 'Perfume Bottle', stock: 100 }],
    ['p2', { id: 'p2', name: 'Out of Stock Perfume', stock: 0 }],
    ['p3', { id: 'p3', name: 'Musk Product', stock: 50 }],
  ])

  const variantMap = new Map([
    ['v1', { id: 'v1', product_id: 'p3', display_label: '6ml', stock: 100 }],
    ['v2', { id: 'v2', product_id: 'p3', display_label: '12ml', stock: 10 }],
    ['v3', { id: 'v3', product_id: 'p3', display_label: '24ml', stock: 0 }],
  ])

  it('allows items when stock is sufficient', () => {
    const items = [
      { product_id: 'p1', quantity: 5 },
      { product_id: 'p3', variant_id: 'v1', quantity: 10 },
      { product_id: 'p3', variant_id: 'v2', quantity: 10 },
    ]
    const err = validateItemsStock(items, productMap, variantMap)
    expect(err).toBeNull()
  })

  it('rejects when requested quantity exceeds product stock (no variants)', () => {
    const items = [{ product_id: 'p1', quantity: 101 }]
    const err = validateItemsStock(items, productMap, variantMap)
    expect(err).toBe('Only 100 available for Perfume Bottle.')
  })

  it('rejects when product without variants is out of stock', () => {
    const items = [{ product_id: 'p2', quantity: 1 }]
    const err = validateItemsStock(items, productMap, variantMap)
    expect(err).toBe('Out of Stock Perfume is out of stock.')
  })

  it('rejects when requested quantity exceeds variant stock', () => {
    const items = [{ product_id: 'p3', variant_id: 'v2', quantity: 11 }]
    const err = validateItemsStock(items, productMap, variantMap)
    expect(err).toBe('Only 10 available for Musk Product (12ml).')
  })

  it('rejects when variant is out of stock', () => {
    const items = [{ product_id: 'p3', variant_id: 'v3', quantity: 1 }]
    const err = validateItemsStock(items, productMap, variantMap)
    expect(err).toBe('Musk Product (24ml) is out of stock.')
  })

  it('aggregates multiple lines with the same variant and checks combined quantity', () => {
    const items = [
      { product_id: 'p3', variant_id: 'v2', quantity: 6 },
      { product_id: 'p3', variant_id: 'v2', quantity: 5 }, // 6 + 5 = 11 > 10
    ]
    const err = validateItemsStock(items, productMap, variantMap)
    expect(err).toBe('Only 10 available for Musk Product (12ml).')
  })
})
