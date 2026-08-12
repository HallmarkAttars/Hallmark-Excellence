// Admin bulk price TIER helpers — unit tests for
// admin/src/utils/brandBulkTiers.js (normalization + save validation).
// Mirrors the storefront/server tier tests.
//
// Run with:  npm test  (admin)

import { describe, expect, it } from 'vitest'
import { getBulkTiers, validateTiers } from './brandBulkTiers'

const MULTI_BRAND = {
  id: 'brand-1',
  bulk_enabled: true,
  standard_price: 50,
  bulk_tiers: [
    { minQuantity: 100, price: 43 },
    { minQuantity: 200, price: 40 },
    { minQuantity: 150, price: 42 },
  ],
}

const LEGACY_BRAND = {
  id: 'brand-2',
  bulk_enabled: true,
  standard_price: 45,
  bulk_unit_price: 42,
  bulk_min_qty: 70,
}

describe('getBulkTiers', () => {
  it('parses, sorts and dedupes the stored tiers array', () => {
    expect(getBulkTiers(MULTI_BRAND)).toEqual([
      { minQuantity: 100, price: 43 },
      { minQuantity: 150, price: 42 },
      { minQuantity: 200, price: 40 },
    ])
  })

  it('normalizes the legacy single-tier columns into one tier', () => {
    expect(getBulkTiers(LEGACY_BRAND)).toEqual([{ minQuantity: 70, price: 42 }])
  })

  it('prefers bulk_tiers over the legacy columns', () => {
    expect(getBulkTiers({ ...LEGACY_BRAND, bulk_tiers: [{ minQuantity: 100, price: 43 }] })).toEqual([
      { minQuantity: 100, price: 43 },
    ])
  })

  it('returns null when there is no usable tier', () => {
    expect(getBulkTiers(null)).toBe(null)
    expect(getBulkTiers({})).toBe(null)
    expect(getBulkTiers({ bulk_min_qty: 0, bulk_unit_price: 42 })).toBe(null)
    expect(getBulkTiers({ bulk_tiers: [] })).toBe(null)
  })
})

describe('validateTiers (the save gate)', () => {
  it('accepts a valid multi-tier config', () => {
    expect(
      validateTiers(
        [
          { minQuantity: 100, price: 43 },
          { minQuantity: 150, price: 42 },
          { minQuantity: 200, price: 40 },
        ],
        50
      )
    ).toBe(null)
  })

  it('requires a valid normal price and at least one tier', () => {
    expect(validateTiers([], 50)).toMatch(/at least one/i)
    expect(validateTiers(null, 50)).toMatch(/at least one/i)
    expect(validateTiers([{ minQuantity: 100, price: 43 }], 0)).toMatch(/normal price/i)
    expect(validateTiers([{ minQuantity: 100, price: 43 }], 'x')).toMatch(/normal price/i)
  })

  it('rejects non-positive / non-whole minimum quantities', () => {
    expect(validateTiers([{ minQuantity: 0, price: 43 }], 50)).toMatch(/whole number/i)
    expect(validateTiers([{ minQuantity: 1.5, price: 43 }], 50)).toMatch(/whole number/i)
    expect(validateTiers([{ minQuantity: '', price: 43 }], 50)).toMatch(/whole number/i)
  })

  it('rejects non-positive bulk prices', () => {
    expect(validateTiers([{ minQuantity: 100, price: 0 }], 50)).toMatch(/positive number/i)
    expect(validateTiers([{ minQuantity: 100, price: '' }], 50)).toMatch(/positive number/i)
  })

  it('rejects a bulk price not below the normal price', () => {
    expect(validateTiers([{ minQuantity: 100, price: 50 }], 50)).toMatch(/less than the normal price/i)
    expect(validateTiers([{ minQuantity: 100, price: 60 }], 50)).toMatch(/less than the normal price/i)
  })

  it('rejects duplicated minimum quantities', () => {
    expect(
      validateTiers(
        [
          { minQuantity: 100, price: 43 },
          { minQuantity: 100, price: 40 },
        ],
        50
      )
    ).toMatch(/unique/i)
  })

  it('rejects a lower-quantity tier that discounts MORE than a later tier', () => {
    // 100 → ₹40 then 150 → ₹45: a bigger order would cost more per piece.
    expect(
      validateTiers(
        [
          { minQuantity: 100, price: 40 },
          { minQuantity: 150, price: 45 },
        ],
        50
      )
    ).toMatch(/never cost more/i)
  })

  it('allows equal tier prices (not more expensive = valid)', () => {
    expect(
      validateTiers(
        [
          { minQuantity: 100, price: 43 },
          { minQuantity: 150, price: 43 },
        ],
        50
      )
    ).toBe(null)
  })

  it('rejects unsorted minimum quantities with a clear message', () => {
    expect(
      validateTiers(
        [
          { minQuantity: 150, price: 42 },
          { minQuantity: 100, price: 43 },
        ],
        50
      )
    ).toMatch(/sorted ascending/i)
  })
})
