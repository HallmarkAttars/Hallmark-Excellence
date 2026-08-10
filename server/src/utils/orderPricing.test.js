// ============================================================================
// Server order-line pricing — unit tests for utils/orderPricing.js
//
// Only COMBINED BRAND bulk pricing remains in the product system
// (per-product/per-variant bulk purchasing and pack purchases were removed).
// Brand-level combined bulk: quantities SUM across ALL of a brand's products
// in the order (mix & match). When the combined total reaches the brand's
// threshold, every line of that brand is priced at the brand bulk unit price.
//
// Spec example: brand bulk 91 pieces at ₹X/piece — 3× AREES product A + 88×
// product B = 91 combined → ALL 91 pieces at the brand bulk unit price.
//
// Run with:  npm test  (server)
// ============================================================================

import { describe, expect, it } from 'vitest'
import { resolveBrandBulkPricing, brandBulkUnitPriceFor } from './orderPricing.js'

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

describe('brandBulkUnitPriceFor (brand bulk applies when active)', () => {
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
