// Attar product price sync — unit tests for
// admin/src/utils/attarPriceSync.js (the Admin → Add Product Attar brand
// price auto-fill logic, extracted from ProductForm.jsx as pure helpers).
//
// Run with:  npm test  (admin)

import { describe, expect, it } from 'vitest'
import {
  applyAttarPriceSync,
  computeVariantTotal,
  shouldSyncAttarPrice,
} from './attarPriceSync'

const variant = (overrides = {}) => ({
  quantity_value: '100',
  quantity_unit: 'Pieces',
  total_price: '',
  price_per_unit: '',
  is_default: false,
  ...overrides,
})

const AREES = 'brand-arees'
const DAHAB = 'brand-dahab'

describe('shouldSyncAttarPrice — when the auto-fill is allowed', () => {
  it('syncs only while ADDING an Attar product with a brand normal price', () => {
    expect(
      shouldSyncAttarPrice({ isEdit: false, isAttarCategory: true, brandHasNormalPrice: true })
    ).toBe(true)
  })

  it('never syncs in edit mode — saved prices are preserved', () => {
    expect(
      shouldSyncAttarPrice({ isEdit: true, isAttarCategory: true, brandHasNormalPrice: true })
    ).toBe(false)
  })

  it('never syncs non-Attar categories (Bottles, Caps, Equipment, … untouched)', () => {
    expect(
      shouldSyncAttarPrice({ isEdit: false, isAttarCategory: false, brandHasNormalPrice: true })
    ).toBe(false)
  })

  it('never syncs a brand without a configured normal price', () => {
    expect(
      shouldSyncAttarPrice({ isEdit: false, isAttarCategory: true, brandHasNormalPrice: false })
    ).toBe(false)
  })
})

describe('computeVariantTotal — Quantity × Price Per Unit', () => {
  it('computes the variant total', () => {
    expect(computeVariantTotal(100, 50)).toBe(5000)
    expect(computeVariantTotal('60', '45')).toBe(2700)
  })

  it('returns "" while either input is missing or invalid', () => {
    expect(computeVariantTotal('', '45')).toBe('')
    expect(computeVariantTotal('60', '')).toBe('')
    expect(computeVariantTotal('abc', '45')).toBe('')
    expect(computeVariantTotal('60', 'x')).toBe('')
    expect(computeVariantTotal('0', '45')).toBe('')
    expect(computeVariantTotal('-5', '45')).toBe('')
  })

  it('allows a 0 price per unit (legit zero-cost variant)', () => {
    expect(computeVariantTotal('60', '0')).toBe(0)
  })

  it('rounds to 2 decimals to match numeric(10,2)', () => {
    expect(computeVariantTotal('0.5', '10')).toBe(5)
    expect(computeVariantTotal('10', '5.555')).toBeCloseTo(55.55, 2)
  })
})

describe('applyAttarPriceSync — the price auto-fill itself', () => {
  it('fills the empty default variant price on first sync and recomputes the total', () => {
    const variants = [variant({ quantity_value: '100', is_default: true }), variant({ quantity_value: '60' })]
    const next = applyAttarPriceSync({ variants, brandId: AREES, priceSyncedBrand: null, brandNormalPrice: 50 })
    expect(next[0].price_per_unit).toBe('50')
    expect(next[0].total_price).toBe(5000)
    // Non-default variants are never touched.
    expect(next[1]).toBe(variants[1])
  })

  it('returns the same reference when there are no variants or no default variant', () => {
    const empty = []
    expect(applyAttarPriceSync({ variants: empty, brandId: AREES, priceSyncedBrand: null, brandNormalPrice: 50 })).toBe(empty)
    const noDefault = [variant()]
    expect(applyAttarPriceSync({ variants: noDefault, brandId: AREES, priceSyncedBrand: null, brandNormalPrice: 50 })).toBe(noDefault)
  })

  it('never clobbers a hand-typed price once synced to the same brand', () => {
    const variants = [variant({ price_per_unit: '45', is_default: true })]
    const next = applyAttarPriceSync({ variants, brandId: AREES, priceSyncedBrand: AREES, brandNormalPrice: 50 })
    expect(next).toBe(variants) // same reference — nothing rewritten
    expect(variants[0].price_per_unit).toBe('45')
  })

  it('updates the price when the brand changes (AREES ₹50 → DAHAB ₹45)', () => {
    const variants = [variant({ price_per_unit: '50', total_price: '5000', is_default: true })]
    const next = applyAttarPriceSync({ variants, brandId: DAHAB, priceSyncedBrand: AREES, brandNormalPrice: 45 })
    expect(next[0].price_per_unit).toBe('45')
    expect(next[0].total_price).toBe(4500)
  })

  it('refills a price the admin emptied, even when already synced to that brand', () => {
    const variants = [variant({ price_per_unit: '', is_default: true })]
    const next = applyAttarPriceSync({ variants, brandId: AREES, priceSyncedBrand: AREES, brandNormalPrice: 50 })
    expect(next[0].price_per_unit).toBe('50')
  })

  it('leaves total_price "" when the quantity is still missing', () => {
    const variants = [variant({ quantity_value: '', is_default: true })]
    const next = applyAttarPriceSync({ variants, brandId: AREES, priceSyncedBrand: null, brandNormalPrice: 50 })
    expect(next[0].price_per_unit).toBe('50')
    expect(next[0].total_price).toBe('')
  })
})
