// ============================================================================
// Bulk purchasing math — unit tests for storefront/src/utils/bulk.js
//
// Bulk pricing is now PER VARIANT: each size carries its own bulk_enabled /
// bulk_price / bulk_min_qty. The same helpers also accept a product object
// (variant-less products use product-level bulk fields).
//
// Spec test scenarios:
//   30 ML: normal 150 / bulk 120 / min 100
//   50 ML: normal 220 / bulk 180 / min 50
//   100 ML: normal 350 / bulk 290 / min 25
//
// Run with:  npm test  (storefront)
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
  isBulkEnabled,
  bulkPriceOf,
  bulkMinQtyOf,
  hasAnyBulk,
  isBulkApplicable,
  isBulkUnlocked,
  getEffectiveVariantPrice,
  applicableUnitPrice,
  bulkRemaining,
  bulkSavings,
} from './bulk'

// Spec test line: Normal ₹100 · Bulk ₹80 · Qty 100 · Bulk ON
const makeLine = (quantity, over = {}) => ({
  quantity,
  selected_price: 100,
  bulk_enabled: true,
  bulk_price: 80,
  bulk_min_qty: 100,
  ...over,
})

describe('isBulkEnabled', () => {
  it('accepts a valid admin-enabled config', () => {
    expect(isBulkEnabled({ bulk_enabled: true, bulk_price: 80, bulk_min_qty: 100 })).toBe(true)
  })

  it('rejects bulk OFF, even with stale values set', () => {
    expect(isBulkEnabled({ bulk_enabled: false, bulk_price: 80, bulk_min_qty: 100 })).toBe(false)
  })

  it('rejects a missing product', () => {
    expect(isBulkEnabled(null)).toBe(false)
    expect(isBulkEnabled(undefined)).toBe(false)
  })

  it('rejects a bulk quantity of 1', () => {
    expect(isBulkEnabled({ bulk_enabled: true, bulk_price: 80, bulk_min_qty: 1 })).toBe(false)
  })

  it('rejects a missing or non-positive bulk price', () => {
    expect(isBulkEnabled({ bulk_enabled: true, bulk_min_qty: 100 })).toBe(false)
    expect(isBulkEnabled({ bulk_enabled: true, bulk_price: 0, bulk_min_qty: 100 })).toBe(false)
    expect(isBulkEnabled({ bulk_enabled: true, bulk_price: -5, bulk_min_qty: 100 })).toBe(false)
  })

  it('rejects a non-integer bulk quantity', () => {
    expect(isBulkEnabled({ bulk_enabled: true, bulk_price: 80, bulk_min_qty: 100.5 })).toBe(false)
  })

  it('coerces string values returned by the database', () => {
    expect(isBulkEnabled({ bulk_enabled: true, bulk_price: '80', bulk_min_qty: '100' })).toBe(true)
  })

  it('bulkPriceOf / bulkMinQtyOf return null when bulk is not enabled', () => {
    expect(bulkPriceOf({ bulk_enabled: false })).toBeNull()
    expect(bulkMinQtyOf({ bulk_enabled: false })).toBeNull()
    expect(bulkPriceOf({ bulk_enabled: true, bulk_price: 80, bulk_min_qty: 100 })).toBe(80)
    expect(bulkMinQtyOf({ bulk_enabled: true, bulk_price: 80, bulk_min_qty: 100 })).toBe(100)
  })
})

describe('hasAnyBulk (product-level listing indicator)', () => {
  it('is true when the product itself has bulk (variant-less)', () => {
    expect(hasAnyBulk({ bulk_enabled: true, bulk_price: 80, bulk_min_qty: 100 })).toBe(true)
  })

  it('is true when ANY variant has bulk configured', () => {
    const product = {
      bulk_enabled: false,
      variants: [
        { bulk_enabled: false, price: 150 },
        { bulk_enabled: true, bulk_price: 120, bulk_min_qty: 100, price: 150 },
      ],
    }
    expect(hasAnyBulk(product)).toBe(true)
  })

  it('is false when no variant and no product has bulk', () => {
    expect(hasAnyBulk(null)).toBe(false)
    expect(hasAnyBulk({ bulk_enabled: false, variants: [] })).toBe(false)
    expect(hasAnyBulk({ bulk_enabled: false, variants: [{ bulk_enabled: false, price: 150 }] })).toBe(false)
  })
})

describe('applicableUnitPrice (spec scenario: 100 normal / 80 bulk / 100 min)', () => {
  it('charges the normal price below the threshold', () => {
    expect(applicableUnitPrice(makeLine(1))).toBe(100)
    expect(applicableUnitPrice(makeLine(50))).toBe(100)
    expect(applicableUnitPrice(makeLine(99))).toBe(100)
  })

  it('switches to the bulk price at and above the threshold', () => {
    expect(applicableUnitPrice(makeLine(100))).toBe(80)
    expect(applicableUnitPrice(makeLine(101))).toBe(80)
    expect(applicableUnitPrice(makeLine(150))).toBe(80)
  })

  it('reverts to the normal price when the quantity drops back below', () => {
    expect(applicableUnitPrice(makeLine(99))).toBe(100)
  })

  it('returns 0 for a missing/empty line instead of NaN', () => {
    expect(applicableUnitPrice(null)).toBe(0)
    expect(applicableUnitPrice({})).toBe(0)
  })
})

describe('bulkRemaining', () => {
  it('reports how many more pieces are needed', () => {
    expect(bulkRemaining(makeLine(50))).toBe(50)
    expect(bulkRemaining(makeLine(90))).toBe(10)
    expect(bulkRemaining(makeLine(99))).toBe(1)
  })

  it('reports 0 at and beyond the threshold', () => {
    expect(bulkRemaining(makeLine(100))).toBe(0)
    expect(bulkRemaining(makeLine(101))).toBe(0)
  })

  it('accepts an explicit quantity (product-detail path)', () => {
    const product = { bulk_enabled: true, bulk_price: 80, bulk_min_qty: 100 }
    expect(bulkRemaining(product, 80)).toBe(20)
    expect(bulkRemaining(product, 100)).toBe(0)
  })

  it('returns 0 for non-bulk lines', () => {
    expect(bulkRemaining({ quantity: 50, bulk_enabled: false })).toBe(0)
  })
})

describe('isBulkUnlocked', () => {
  it('unlocks only at the configured quantity', () => {
    expect(isBulkUnlocked(makeLine(99))).toBe(false)
    expect(isBulkUnlocked(makeLine(100))).toBe(true)
  })

  it('never unlocks when the bulk price is not below the normal price', () => {
    expect(isBulkUnlocked(makeLine(100, { bulk_price: 100 }))).toBe(false)
    expect(isBulkUnlocked(makeLine(100, { bulk_price: 120 }))).toBe(false)
  })

  it('never unlocks for a bulk-OFF line, regardless of quantity', () => {
    expect(isBulkUnlocked(makeLine(100, { bulk_enabled: false }))).toBe(false)
  })

  it('respects an explicit quantity override', () => {
    const item = { quantity: 1, selected_price: 100, bulk_enabled: true, bulk_price: 80, bulk_min_qty: 100 }
    expect(isBulkUnlocked(item, 99)).toBe(false)
    expect(isBulkUnlocked(item, 100)).toBe(true)
  })
})

describe('bulkSavings', () => {
  it('saves (normal − bulk) × quantity once unlocked', () => {
    expect(bulkSavings(makeLine(100))).toBe(2000)
    expect(bulkSavings(makeLine(200))).toBe(4000)
  })

  it('saves nothing below the threshold', () => {
    expect(bulkSavings(makeLine(99))).toBe(0)
  })

  it('saves nothing when bulk is off or invalid', () => {
    expect(bulkSavings(makeLine(100, { bulk_enabled: false }))).toBe(0)
    expect(bulkSavings(makeLine(100, { bulk_price: 120 }))).toBe(0)
  })
})

describe('line totals (unit price × quantity)', () => {
  it('matches the spec checkout math', () => {
    expect(applicableUnitPrice(makeLine(50)) * 50).toBe(5000)
    expect(applicableUnitPrice(makeLine(99)) * 99).toBe(9900)
    expect(applicableUnitPrice(makeLine(100)) * 100).toBe(8000)
    expect(applicableUnitPrice(makeLine(101)) * 101).toBe(8080)
    expect(applicableUnitPrice(makeLine(200)) * 200).toBe(16000)
  })
})

describe('getEffectiveVariantPrice (the one shared pricing function)', () => {
  // Variant: normal 150 / bulk 120 / min 100
  const v30 = { price: 150, bulk_enabled: true, bulk_price: 120, bulk_min_qty: 100 }

  it('returns the normal price below the variant threshold', () => {
    expect(getEffectiveVariantPrice(v30, 1)).toBe(150)
    expect(getEffectiveVariantPrice(v30, 50)).toBe(150)
    expect(getEffectiveVariantPrice(v30, 99)).toBe(150)
  })

  it('returns the bulk price at and above the variant threshold', () => {
    expect(getEffectiveVariantPrice(v30, 100)).toBe(120)
    expect(getEffectiveVariantPrice(v30, 150)).toBe(120)
  })

  it('uses each variant’s OWN threshold (50 ML: min 50)', () => {
    const v50 = { price: 220, bulk_enabled: true, bulk_price: 180, bulk_min_qty: 50 }
    expect(getEffectiveVariantPrice(v50, 49)).toBe(220)
    expect(getEffectiveVariantPrice(v50, 50)).toBe(180)
  })

  it('uses each variant’s OWN threshold (100 ML: min 25)', () => {
    const v100 = { price: 350, bulk_enabled: true, bulk_price: 290, bulk_min_qty: 25 }
    expect(getEffectiveVariantPrice(v100, 24)).toBe(350)
    expect(getEffectiveVariantPrice(v100, 25)).toBe(290)
  })

  it('returns the normal price when bulk is OFF on that variant', () => {
    expect(getEffectiveVariantPrice({ price: 220, bulk_enabled: false, bulk_price: 180, bulk_min_qty: 50 }, 50)).toBe(220)
  })

  it('accepts a cart line shape (selected_price) too', () => {
    expect(getEffectiveVariantPrice({ selected_price: 150, bulk_enabled: true, bulk_price: 120, bulk_min_qty: 100 }, 100)).toBe(120)
  })

  it('handles a missing/empty entity safely', () => {
    expect(getEffectiveVariantPrice(null, 10)).toBe(0)
    expect(getEffectiveVariantPrice({}, 10)).toBe(0)
  })
})

describe('per-variant bulk (the selected variant is the authority)', () => {
  it('isBulkApplicable: any line carrying a valid bulk config applies — no default-variant gate', () => {
    // Variant-less line → applicable
    expect(isBulkApplicable(makeLine(1))).toBe(true)
    // A variant line with its OWN bulk config → applicable (even if not default)
    expect(isBulkApplicable(makeLine(1, { variant_id: 'v50', bulk_enabled: true, bulk_price: 180, bulk_min_qty: 50 }))).toBe(true)
    // Bulk-OFF line → not applicable
    expect(isBulkApplicable(makeLine(1, { bulk_enabled: false }))).toBe(false)
  })

  it('unlocks each variant line at its OWN threshold', () => {
    const v50 = makeLine(49, { variant_id: 'v50', selected_price: 220, bulk_price: 180, bulk_min_qty: 50 })
    expect(isBulkUnlocked(v50)).toBe(false)
    expect(applicableUnitPrice(v50)).toBe(220)

    const v50unlocked = makeLine(50, { variant_id: 'v50', selected_price: 220, bulk_price: 180, bulk_min_qty: 50 })
    expect(isBulkUnlocked(v50unlocked)).toBe(true)
    expect(applicableUnitPrice(v50unlocked)).toBe(180)
  })
})

describe('multiple products price independently', () => {
  it('applies each product/variant own bulk config', () => {
    // Product A: normal 100 / bulk 80 / min 100 — cart qty 100 → bulk
    expect(
      applicableUnitPrice({ quantity: 100, selected_price: 100, bulk_enabled: true, bulk_price: 80, bulk_min_qty: 100 })
    ).toBe(80)
    // Product B: normal 200 / bulk 150 / min 50 — cart qty 20 → normal
    expect(
      applicableUnitPrice({ quantity: 20, selected_price: 200, bulk_enabled: true, bulk_price: 150, bulk_min_qty: 50 })
    ).toBe(200)
    // Product C: bulk OFF — cart qty 100 → normal
    expect(
      applicableUnitPrice({ quantity: 100, selected_price: 200, bulk_enabled: false })
    ).toBe(200)
  })
})
