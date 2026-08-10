// Variant pricing math — unit tests for storefront/src/utils/variantPricing.js
//
// The core rule under test: a cart line is priced at the selected variant's
// TOTAL price × quantity (never price-per-unit, never product-level price).
//
// Run with:  npm test  (storefront)

import { describe, it, expect } from 'vitest'
import { lineUnitPrice, lineQuantity, lineTotal, cartTotal } from './variantPricing'

// A "10 ML Testers"-style cart line (acceptance-test product).
const testersLine = (totalPrice, qty) => ({
  product_id: 'p-testers',
  name: 'Testers',
  quantity: qty,
  selected_price: totalPrice,
  variant_id: 'v-1000',
  variant_label: '1000 Pieces',
  quantity_value: 1000,
  quantity_unit: 'Pieces',
  variant_total_price: totalPrice,
  variant_price_per_unit: 7.5,
})

describe('lineUnitPrice — the variant TOTAL price is authoritative', () => {
  it('uses the resolved unit_price when present (checkout snapshot)', () => {
    expect(lineUnitPrice({ unit_price: 7500, selected_price: 100 })).toBe(7500)
  })

  it('falls back to selected_price (the variant total price)', () => {
    expect(lineUnitPrice({ selected_price: 7500, price: 10 })).toBe(7500)
  })

  it('falls back to the product price for variant-less lines', () => {
    expect(lineUnitPrice({ price: 1499 })).toBe(1499)
  })

  it('never returns NaN for missing/invalid prices', () => {
    expect(lineUnitPrice({})).toBe(0)
    expect(lineUnitPrice(null)).toBe(0)
    expect(lineUnitPrice({ selected_price: 'not-a-number' })).toBe(0)
  })
})

describe('lineQuantity — how many units of the selected variant', () => {
  it('reads quantity and clamps missing values to 1', () => {
    expect(lineQuantity({ quantity: 2 })).toBe(2)
    expect(lineQuantity({ qty: 3 })).toBe(3)
    expect(lineQuantity({})).toBe(1)
    expect(lineQuantity({ quantity: 0 })).toBe(1)
    expect(lineQuantity({ quantity: -4 })).toBe(1)
  })

  it('floors fractional quantities to whole units', () => {
    expect(lineQuantity({ quantity: 2.7 })).toBe(2)
  })
})

describe('lineTotal — variant total price × quantity (acceptance math)', () => {
  it('100 Pieces × quantity 1 = ₹1000', () => {
    expect(lineTotal(testersLine(1000, 1))).toBe(1000)
  })

  it('100 Pieces × quantity 2 = ₹2000', () => {
    expect(lineTotal(testersLine(1000, 2))).toBe(2000)
  })

  it('1000 Pieces × quantity 1 = ₹7500', () => {
    expect(lineTotal(testersLine(7500, 1))).toBe(7500)
  })

  it('1000 Pieces × quantity 2 = ₹15000', () => {
    expect(lineTotal(testersLine(7500, 2))).toBe(15000)
  })

  it('500 Pieces × quantity 3 = ₹12000', () => {
    expect(lineTotal(testersLine(4000, 3))).toBe(12000)
  })

  it('never charges the price-per-unit (₹7.50 × 2 ≠ ₹15000)', () => {
    const line = testersLine(7500, 2)
    expect(lineTotal(line)).toBe(15000)
    expect(lineTotal(line)).not.toBe(7.5 * 2)
  })

  it('never charges a product-level price when a variant is selected', () => {
    const line = testersLine(7500, 1)
    line.product_price = 10 // product-level price, must be ignored
    expect(lineTotal(line)).toBe(7500)
  })

  it('prices a missing quantity as 1 unit', () => {
    expect(lineTotal({ selected_price: 1000 })).toBe(1000)
  })
})

describe('cartTotal — the order total is the sum of line totals', () => {
  it('sums variant total prices × quantities across lines', () => {
    const cart = [
      testersLine(1000, 2),  // ₹2000
      testersLine(7500, 2),  // ₹15000
    ]
    expect(cartTotal(cart)).toBe(17000)
  })

  it('mixes variant and variant-less lines correctly', () => {
    const cart = [
      testersLine(4000, 1),                        // 500 Pieces × 1 = ₹4000
      { name: 'Royal Oud', price: 2499, quantity: 2 }, // variant-less ₹2499 × 2
    ]
    expect(cartTotal(cart)).toBe(4000 + 4998)
  })

  it('handles empty carts', () => {
    expect(cartTotal([])).toBe(0)
    expect(cartTotal(null)).toBe(0)
    expect(cartTotal(undefined)).toBe(0)
  })
})
