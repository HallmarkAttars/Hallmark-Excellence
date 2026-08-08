// ============================================================================
// Admin bulk-purchasing form validation — unit tests for utils/bulkValidation.js
//
// Covers the exact admin rules from the bulk-purchasing spec:
//   - Bulk OFF        → both values saved as null (never fake 0 / '' / 'null')
//   - Bulk Price      → required, numeric, > 0, LOWER than the normal price
//                       AND lower than every variant price
//   - Bulk Quantity   → required, whole number, > 1
//
// Run with:  npm test  (admin)
// ============================================================================

import { describe, expect, it } from 'vitest'
import { resolveBulkFields, resolveVariantBulkFields } from './bulkValidation'

// Valid baseline: Normal ₹100 · Bulk ₹80 · Qty 100 · no variants.
const ok = (over = {}) =>
  resolveBulkFields({
    bulk_enabled: true,
    bulk_price: 80,
    bulk_min_qty: 100,
    sellingPrice: 100,
    variants: [],
    ...over,
  })

describe('resolveBulkFields — bulk OFF', () => {
  it('saves null values with no error when disabled, even with junk fields set', () => {
    const r = resolveBulkFields({ bulk_enabled: false, bulk_price: '0', bulk_min_qty: '1', sellingPrice: 100 })
    expect(r).toEqual({ error: '', bulkEnabled: false, bulkPrice: null, bulkMinQty: null })
  })

  it('treats a missing toggle as OFF', () => {
    const r = resolveBulkFields({ sellingPrice: 100 })
    expect(r.error).toBe('')
    expect(r.bulkPrice).toBeNull()
    expect(r.bulkMinQty).toBeNull()
  })

  it('never writes fake values like 0, "" or "null"', () => {
    const r = resolveBulkFields({ bulk_enabled: false, bulk_price: 'null', bulk_min_qty: '0', sellingPrice: 100 })
    expect(r.bulkPrice).toBeNull()
    expect(r.bulkMinQty).toBeNull()
  })
})

describe('resolveBulkFields — bulk price', () => {
  it('rejects a missing bulk price', () => {
    const r = ok({ bulk_price: '' })
    expect(r.error).toMatch(/Bulk Price is required/)
    expect(r.bulkPrice).toBeNull()
  })

  it('rejects zero and negative bulk prices', () => {
    expect(ok({ bulk_price: 0 }).error).toMatch(/greater than 0/)
    expect(ok({ bulk_price: -5 }).error).toMatch(/greater than 0/)
  })

  it('rejects a bulk price equal to the normal price', () => {
    expect(ok({ bulk_price: 100 }).error).toMatch(/Bulk price must be lower than the normal price/)
  })

  it('rejects a bulk price above the normal price', () => {
    expect(ok({ bulk_price: 110 }).error).toMatch(/Bulk price must be lower/)
  })

  it('rejects a bulk price below normal but not below every variant price', () => {
    // Variant priced ₹85 → bulk ₹90 is a markup on that size → invalid.
    const r = ok({ bulk_price: 90, variants: [{ price: 85 }] })
    expect(r.error).toMatch(/Bulk price must be lower/)
    expect(r.error).toMatch(/lowest price is ₹85/)
  })

  it('accepts a bulk price below every variant price', () => {
    const r = ok({ bulk_price: 80, variants: [{ price: 85 }, { price: 100 }] })
    expect(r.error).toBe('')
    expect(r.bulkPrice).toBe(80)
  })
})

describe('resolveBulkFields — bulk quantity', () => {
  it('rejects a missing bulk quantity', () => {
    expect(ok({ bulk_min_qty: '' }).error).toMatch(/Bulk Purchase Quantity is required/)
  })

  it('rejects zero', () => {
    expect(ok({ bulk_min_qty: 0 }).error).toMatch(/whole number greater than 1/)
  })

  it('rejects quantity 1 (must be greater than 1)', () => {
    expect(ok({ bulk_min_qty: 1 }).error).toMatch(/whole number greater than 1/)
  })

  it('rejects non-integer quantities', () => {
    expect(ok({ bulk_min_qty: 2.5 }).error).toMatch(/whole number greater than 1/)
  })

  it('accepts quantity 2', () => {
    const r = ok({ bulk_min_qty: 2 })
    expect(r.error).toBe('')
    expect(r.bulkMinQty).toBe(2)
  })
})

describe('resolveVariantBulkFields — per-variant bulk (each size its own config)', () => {
  // Valid baseline variant: normal ₹150 · Bulk ₹120 · Qty 100.
  const vok = (over = {}) =>
    resolveVariantBulkFields({
      bulk_enabled: true,
      bulk_price: 120,
      bulk_min_qty: 100,
      normalPrice: 150,
      ...over,
    })

  it('returns null values with no error when bulk is OFF for that variant', () => {
    expect(resolveVariantBulkFields({ bulk_enabled: false, bulk_price: '120', bulk_min_qty: '100', normalPrice: 150 })).toEqual({
      error: '',
      bulkEnabled: false,
      bulkPrice: null,
      bulkMinQty: null,
    })
  })

  it('accepts the spec scenario (150 / 120 / 100)', () => {
    expect(vok()).toEqual({ error: '', bulkEnabled: true, bulkPrice: 120, bulkMinQty: 100 })
  })

  it('rejects a missing bulk price when enabled', () => {
    expect(vok({ bulk_price: '' }).error).toMatch(/Bulk Price is required/)
  })

  it('rejects zero/negative bulk price when enabled', () => {
    expect(vok({ bulk_price: 0 }).error).toMatch(/greater than 0/)
    expect(vok({ bulk_price: -5 }).error).toMatch(/greater than 0/)
  })

  it('rejects quantity 1 or non-integer quantities when enabled', () => {
    expect(vok({ bulk_min_qty: 1 }).error).toMatch(/whole number greater than 1/)
    expect(vok({ bulk_min_qty: 2.5 }).error).toMatch(/whole number greater than 1/)
  })

  it('rejects a bulk price >= THIS variant normal price', () => {
    expect(vok({ bulk_price: 150 }).error).toMatch(/lower than this variant/)
    expect(vok({ bulk_price: 160 }).error).toMatch(/lower than this variant/)
  })

  it('accepts a bulk price below this variant price', () => {
    expect(vok({ bulk_price: 120 }).error).toBe('')
    expect(vok({ bulk_price: 149.99 }).error).toBe('')
  })

  it('coerces string inputs from the form fields', () => {
    expect(vok({ bulk_price: '120', bulk_min_qty: '100' })).toEqual({
      error: '',
      bulkEnabled: true,
      bulkPrice: 120,
      bulkMinQty: 100,
    })
  })
})

describe('resolveBulkFields — valid configs', () => {
  it('returns parsed numbers for the spec scenario', () => {
    expect(ok()).toEqual({ error: '', bulkEnabled: true, bulkPrice: 80, bulkMinQty: 100 })
  })

  it('coerces string inputs coming from the form fields', () => {
    expect(ok({ bulk_price: '80', bulk_min_qty: '100' })).toEqual({
      error: '',
      bulkEnabled: true,
      bulkPrice: 80,
      bulkMinQty: 100,
    })
  })

  it('accepts decimal bulk prices (step 0.01)', () => {
    expect(ok({ bulk_price: 79.5 }).bulkPrice).toBe(79.5)
  })

  it('still validates against variants when the default variant is the cheapest', () => {
    // Default variant ₹100, cheaper variant ₹85 — bulk ₹80 is below both.
    const r = ok({ bulk_price: 80, sellingPrice: 100, variants: [{ price: 85 }, { price: 100 }] })
    expect(r.error).toBe('')
  })
})
