// ============================================================================
// Server order-line bulk pricing — unit tests for utils/orderPricing.js
//
// Mirrors the customer-facing rules the checkout controller charges by:
//   - Bulk config is PER VARIANT: the SELECTED variant's own bulk_enabled /
//     bulk_price / bulk_min_qty decide the discount for that line.
//   - Variant-less products keep using the product-level bulk fields.
//   - Normal ₹100 · Bulk ₹80 · Qty 100 (spec scenario)
//   - 1–99 pieces → ₹100/piece · 100+ pieces → ₹80/piece
//
// Run with:  npm test  (server)
// ============================================================================

import { describe, expect, it } from 'vitest'
import { applyBulkPricing, resolveBrandBulkPricing, brandBulkUnitPriceFor } from './orderPricing.js'

// Baseline: normal ₹100, bulk ₹80 at 100+ pieces.
const call = (over = {}) =>
  applyBulkPricing({
    normalUnitPrice: 100,
    quantity: 100,
    bulkEnabled: true,
    bulkPrice: 80,
    bulkMinQty: 100,
    ...over,
  })

describe('99/100 boundary (spec scenario: 100 normal / 80 bulk / 100 min)', () => {
  it('charges the normal price below the threshold', () => {
    expect(call({ quantity: 1 }).unitPrice).toBe(100)
    expect(call({ quantity: 50 }).unitPrice).toBe(100)
    expect(call({ quantity: 99 }).unitPrice).toBe(100)
    expect(call({ quantity: 99 }).bulkApplied).toBe(false)
  })

  it('unlocks the bulk price exactly at the threshold', () => {
    const r = call({ quantity: 100 })
    expect(r.unitPrice).toBe(80)
    expect(r.bulkApplied).toBe(true)
    expect(r.bulkPrice).toBe(80)
    expect(r.bulkMinQty).toBe(100)
  })

  it('stays on the bulk price above the threshold', () => {
    expect(call({ quantity: 101 }).unitPrice).toBe(80)
    expect(call({ quantity: 150 }).unitPrice).toBe(80)
  })

  it('reverts to the normal price when the quantity drops back below', () => {
    expect(call({ quantity: 99 }).unitPrice).toBe(100)
  })

  it('produces the exact charged line totals the spec demands', () => {
    expect(call({ quantity: 99 }).unitPrice * 99).toBe(9900)
    expect(call({ quantity: 100 }).unitPrice * 100).toBe(8000)
    expect(call({ quantity: 101 }).unitPrice * 101).toBe(8080)
  })
})

describe('per-variant config (the selected variant is the authority)', () => {
  it('applies the config passed for the line — no default-variant gate', () => {
    // The controller passes the SELECTED variant's own values, so this line
    // unlocks at its own threshold regardless of whether it is the default.
    expect(call({ quantity: 100, bulkMinQty: 100 }).bulkApplied).toBe(true)
  })

  it('prices each variant by ITS OWN threshold (50 ML: normal 220 / bulk 180 / min 50)', () => {
    const r49 = applyBulkPricing({ normalUnitPrice: 220, quantity: 49, bulkEnabled: true, bulkPrice: 180, bulkMinQty: 50 })
    expect(r49.unitPrice).toBe(220)
    expect(r49.bulkApplied).toBe(false)

    const r50 = applyBulkPricing({ normalUnitPrice: 220, quantity: 50, bulkEnabled: true, bulkPrice: 180, bulkMinQty: 50 })
    expect(r50.unitPrice).toBe(180)
    expect(r50.bulkApplied).toBe(true)
  })

  it('prices each variant by ITS OWN threshold (100 ML: normal 350 / bulk 290 / min 25)', () => {
    const r24 = applyBulkPricing({ normalUnitPrice: 350, quantity: 24, bulkEnabled: true, bulkPrice: 290, bulkMinQty: 25 })
    expect(r24.unitPrice).toBe(350)
    expect(r24.bulkApplied).toBe(false)

    const r25 = applyBulkPricing({ normalUnitPrice: 350, quantity: 25, bulkEnabled: true, bulkPrice: 290, bulkMinQty: 25 })
    expect(r25.unitPrice).toBe(290)
    expect(r25.bulkApplied).toBe(true)
  })

  it('never applies bulk to a variant whose own config is OFF', () => {
    const r = call({ quantity: 200, bulkEnabled: false })
    expect(r.unitPrice).toBe(100)
    expect(r.bulkApplied).toBe(false)
    expect(r.bulkPrice).toBeNull()
  })
})

describe('config guards (invalid data can never discount)', () => {
  it('no bulk when purchasing is disabled', () => {
    expect(call({ bulkEnabled: false }).bulkApplied).toBe(false)
    expect(call({ bulkEnabled: false }).unitPrice).toBe(100)
  })

  it('no bulk when the minimum quantity is missing or not a whole number > 1', () => {
    expect(call({ bulkMinQty: undefined }).bulkApplied).toBe(false)
    expect(call({ bulkMinQty: 1 }).bulkApplied).toBe(false)
    expect(call({ bulkMinQty: 0 }).bulkApplied).toBe(false)
    expect(call({ bulkMinQty: 100.5 }).bulkApplied).toBe(false)
  })

  it('no bulk when the bulk price is missing, zero, negative or not below the normal price', () => {
    expect(call({ bulkPrice: undefined }).bulkApplied).toBe(false)
    expect(call({ bulkPrice: 0 }).bulkApplied).toBe(false)
    expect(call({ bulkPrice: -5 }).bulkApplied).toBe(false)
    expect(call({ bulkPrice: 100 }).bulkApplied).toBe(false) // equal → no discount
    expect(call({ bulkPrice: 120 }).bulkApplied).toBe(false) // above → no discount
  })

  it('never unlocks when bulk is enabled but the config is only partially set', () => {
    expect(applyBulkPricing({ normalUnitPrice: 100, quantity: 100, bulkEnabled: true })).toEqual({
      unitPrice: 100,
      bulkApplied: false,
      bulkPrice: null,
      bulkMinQty: null,
    })
  })
})

describe('input coercion (values from the database)', () => {
  it('coerces string prices/quantities returned by PostgREST', () => {
    const r = call({ bulkPrice: '80', bulkMinQty: '100' })
    expect(r.unitPrice).toBe(80)
    expect(r.bulkApplied).toBe(true)
  })

  it('coerces string normal prices', () => {
    expect(call({ normalUnitPrice: '100', quantity: 99 }).unitPrice).toBe(100)
  })
})

describe('multiple products price independently (per-line calls)', () => {
  it('applies each product/variant config without cross-talk', () => {
    // Variant A: normal 100 / bulk 80 / min 100 → bulk at 100
    const a = applyBulkPricing({ normalUnitPrice: 100, quantity: 100, bulkEnabled: true, bulkPrice: 80, bulkMinQty: 100 })
    // Variant B: normal 200 / bulk 150 / min 50 → normal at 20
    const b = applyBulkPricing({ normalUnitPrice: 200, quantity: 20, bulkEnabled: true, bulkPrice: 150, bulkMinQty: 50 })
    // Variant C: bulk OFF → normal at any quantity
    const c = applyBulkPricing({ normalUnitPrice: 200, quantity: 100, bulkEnabled: false, bulkPrice: 150, bulkMinQty: 50 })
    expect(a.unitPrice).toBe(80)
    expect(b.unitPrice).toBe(200)
    expect(c.unitPrice).toBe(200)
  })
})

// ============================================================================
// COMBINED BRAND BULK PRICING — brand-wide quantity discount.
// ============================================================================
// Brand-level combined bulk: quantities SUM across ALL of a brand's products
// in the order (mix & match). When the combined total reaches the brand's
// threshold, every line of that brand is priced at the brand bulk unit price.
//
// Spec example: brand bulk 91 pieces at ₹X/piece — 3× AREES product A + 88×
// product B = 91 combined → ALL 91 pieces at the brand bulk unit price.

const configs = (over = {}) => ({
  'brand-a': { bulk_enabled: true, bulk_unit_price: 80, bulk_min_qty: 91 },
  'brand-b': { bulk_enabled: false, bulk_unit_price: 50, bulk_min_qty: 10 },
  'brand-c': { bulk_enabled: true, bulk_unit_price: 60, bulk_min_qty: 5 },
  ...over,
})

describe('resolveBrandBulkPricing', () => {
  it('unlocks a brand only when the COMBINED quantity reaches its threshold', () => {
    const r = resolveBrandBulkPricing({
      brandTotals: { 'brand-a': 91 }, // e.g. 3 of one product + 88 of another
      brandConfigs: configs(),
    })
    expect(r['brand-a']).toEqual({ bulkUnitPrice: 80, bulkMinQty: 91, totalQty: 91 })
  })

  it('sums quantities across ALL of the brand lines, not any single product', () => {
    const r = resolveBrandBulkPricing({
      brandTotals: { 'brand-a': 50, 'brand-b': 9 },
      brandConfigs: configs(),
    })
    // brand-a: 50 of product A + 41 of product B combined → 91 → active
    expect(resolveBrandBulkPricing({
      brandTotals: { 'brand-a': 50 },
      brandConfigs: configs(),
    })['brand-a']).toBeUndefined()
    expect(r['brand-b']).toBeUndefined() // bulk OFF on brand-b
  })

  it('keeps a brand below its threshold at normal pricing', () => {
    const r = resolveBrandBulkPricing({ brandTotals: { 'brand-a': 90 }, brandConfigs: configs() })
    expect(r).toEqual({})
  })

  it('activates exactly at the threshold and above', () => {
    expect(resolveBrandBulkPricing({ brandTotals: { 'brand-a': 91 }, brandConfigs: configs() })['brand-a']).toBeDefined()
    expect(resolveBrandBulkPricing({ brandTotals: { 'brand-a': 150 }, brandConfigs: configs() })['brand-a']).toBeDefined()
  })

  it('ignores brands with bulk disabled', () => {
    const r = resolveBrandBulkPricing({ brandTotals: { 'brand-b': 500 }, brandConfigs: configs() })
    expect(r).toEqual({})
  })

  it('never activates on a partially-configured brand', () => {
    const r = resolveBrandBulkPricing({
      brandTotals: { 'brand-x': 100 },
      brandConfigs: { 'brand-x': { bulk_enabled: true, bulk_unit_price: null, bulk_min_qty: 91 } },
    })
    expect(r).toEqual({})
  })

  it('requires a whole-number threshold > 1 and a positive bulk price', () => {
    expect(resolveBrandBulkPricing({ brandTotals: { a: 10 }, brandConfigs: { a: { bulk_enabled: true, bulk_unit_price: 80, bulk_min_qty: 1 } } })).toEqual({})
    expect(resolveBrandBulkPricing({ brandTotals: { a: 10 }, brandConfigs: { a: { bulk_enabled: true, bulk_unit_price: 80, bulk_min_qty: 10.5 } } })).toEqual({})
    expect(resolveBrandBulkPricing({ brandTotals: { a: 10 }, brandConfigs: { a: { bulk_enabled: true, bulk_unit_price: 0, bulk_min_qty: 5 } } })).toEqual({})
    expect(resolveBrandBulkPricing({ brandTotals: { a: 10 }, brandConfigs: { a: { bulk_enabled: true, bulk_unit_price: -5, bulk_min_qty: 5 } } })).toEqual({})
  })

  it('coerces string values returned by PostgREST', () => {
    const r = resolveBrandBulkPricing({
      brandTotals: { a: '91' },
      brandConfigs: { a: { bulk_enabled: true, bulk_unit_price: '80', bulk_min_qty: '91' } },
    })
    expect(r.a.bulkUnitPrice).toBe(80)
    expect(r.a.totalQty).toBe(91)
  })

  it('handles empty inputs safely', () => {
    expect(resolveBrandBulkPricing({})).toEqual({})
    expect(resolveBrandBulkPricing({ brandTotals: null, brandConfigs: null })).toEqual({})
  })
})

describe('brandBulkUnitPriceFor (brand bulk takes precedence when active)', () => {
  const active = resolveBrandBulkPricing({ brandTotals: { 'brand-a': 91, 'brand-b': 5 }, brandConfigs: configs() })

  it('returns the brand price for a line of an active brand', () => {
    expect(brandBulkUnitPriceFor(100, 'brand-a', active)).toBe(80)
  })

  it('returns null for lines of brands without an active discount', () => {
    expect(brandBulkUnitPriceFor(100, 'brand-b', active)).toBeNull() // bulk off
    expect(brandBulkUnitPriceFor(100, 'zzz', active)).toBeNull() // unknown brand
    expect(brandBulkUnitPriceFor(100, null, active)).toBeNull() // no brand_id
  })

  it('never discounts a line to a price at/above its own normal price', () => {
    // Brand price 80 is not below a normal price of 80 → no discount on that line.
    expect(brandBulkUnitPriceFor(80, 'brand-a', active)).toBeNull()
    expect(brandBulkUnitPriceFor(70, 'brand-a', active)).toBeNull()
  })

  it('does not apply when the active map is missing or the brand id mismatches', () => {
    expect(brandBulkUnitPriceFor(100, 'brand-a', {})).toBeNull()
    expect(brandBulkUnitPriceFor(100, undefined, active)).toBeNull()
  })
})
