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
  isBrandBulkEnabled,
  brandBulkConfig,
  computeBrandBulkStatus,
  effectiveUnitPrice,
  resolvedUnitPrice,
  brandBulkDisplay,
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

// ============================================================================
// COMBINED BRAND BULK PRICING — brand-wide quantity discount (mix & match).
// ============================================================================
// Spec: discount unlocks when the TOTAL quantity across ALL products of the
// brand reaches the brand threshold (e.g. 91 pieces) — never per-product.

const areesBrand = { id: 'b1', name: 'Arees', bulk_enabled: true, bulk_unit_price: 2000, bulk_min_qty: 91 }
const dahabBrand = { id: 'b2', name: 'Dahab', bulk_enabled: true, bulk_unit_price: 1800, bulk_min_qty: 50 }
const offBrand = { id: 'b3', name: 'Off Brand', bulk_enabled: false, bulk_unit_price: 100, bulk_min_qty: 10 }
const brandsById = {
  b1: areesBrand,
  b2: dahabBrand,
  b3: offBrand,
}

const line = (brandId, quantity, over = {}) => ({
  product_id: `p-${brandId}-${Math.random()}`,
  brand_id: brandId,
  name: 'Attar',
  quantity,
  selected_price: 2500,
  ...over,
})

describe('isBrandBulkEnabled / brandBulkConfig', () => {
  it('accepts a valid admin-enabled brand config', () => {
    expect(isBrandBulkEnabled(areesBrand)).toBe(true)
    expect(brandBulkConfig(areesBrand)).toEqual({ bulkUnitPrice: 2000, bulkMinQty: 91 })
  })

  it('rejects a bulk-off brand, even with values set', () => {
    expect(isBrandBulkEnabled(offBrand)).toBe(false)
    expect(brandBulkConfig(offBrand)).toBeNull()
  })

  it('rejects missing/invalid configs', () => {
    expect(isBrandBulkEnabled(null)).toBe(false)
    expect(isBrandBulkEnabled({ bulk_enabled: true })).toBe(false)
    expect(isBrandBulkEnabled({ bulk_enabled: true, bulk_unit_price: 0, bulk_min_qty: 91 })).toBe(false)
    expect(isBrandBulkEnabled({ bulk_enabled: true, bulk_unit_price: 2000, bulk_min_qty: 1 })).toBe(false)
    expect(isBrandBulkEnabled({ bulk_enabled: true, bulk_unit_price: 2000, bulk_min_qty: 91.5 })).toBe(false)
  })
})

describe('computeBrandBulkStatus (combined quantity across all brand lines)', () => {
  it('sums quantities across DIFFERENT products of the same brand', () => {
    // 3 of product A + 88 of product B (different products) = 91 combined.
    const status = computeBrandBulkStatus(
      [line('b1', 3), line('b1', 88)],
      brandsById
    )
    expect(status.b1.totalQty).toBe(91)
    expect(status.b1.active).toBe(true)
  })

  it('stays inactive below the combined threshold', () => {
    const status = computeBrandBulkStatus([line('b1', 90)], brandsById)
    expect(status.b1.totalQty).toBe(90)
    expect(status.b1.active).toBe(false)
  })

  it('activates exactly at the threshold and above', () => {
    expect(computeBrandBulkStatus([line('b2', 50)], brandsById).b2.active).toBe(true)
    expect(computeBrandBulkStatus([line('b2', 60)], brandsById).b2.active).toBe(true)
  })

  it('never activates a brand whose own toggle is OFF', () => {
    const status = computeBrandBulkStatus([line('b3', 500)], brandsById)
    expect(status.b3.active).toBe(false)
  })

  it('only reports brands that are actually in the cart', () => {
    const status = computeBrandBulkStatus([line('b2', 10)], brandsById)
    expect(Object.keys(status)).toEqual(['b2'])
  })

  it('ignores lines without a brand or with an unknown brand', () => {
    const status = computeBrandBulkStatus([line('b1', 100), line(null, 100), line('nope', 100)], brandsById)
    expect(status.b1.active).toBe(true)
    expect(status.nope).toBeUndefined()
  })
})

describe('effectiveUnitPrice (brand bulk takes precedence when active)', () => {
  it('prices every line of an active brand at the brand bulk price', () => {
    const status = computeBrandBulkStatus([line('b1', 91)], brandsById)
    expect(effectiveUnitPrice(line('b1', 91), status)).toBe(2000)
  })

  it('keeps normal pricing when the combined total is below the threshold', () => {
    const status = computeBrandBulkStatus([line('b1', 90)], brandsById)
    expect(effectiveUnitPrice(line('b1', 90), status)).toBe(2500)
  })

  it('lets per-product bulk apply when brand bulk is NOT active (unchanged behaviour)', () => {
    const status = computeBrandBulkStatus([line('b3', 100)], brandsById)
    // b3 brand bulk off → per-product bulk on the line still applies.
    const item = line('b3', 100, { bulk_enabled: true, bulk_price: 2000, bulk_min_qty: 50 })
    expect(effectiveUnitPrice(item, status)).toBe(2000)
  })

  it('brand bulk OVERRIDES per-product bulk when both are active', () => {
    const status = computeBrandBulkStatus([line('b1', 91)], brandsById)
    // Line has its own (cheaper?) bulk config but brand bulk wins.
    const item = line('b1', 91, { bulk_enabled: true, bulk_price: 2100, bulk_min_qty: 50 })
    expect(effectiveUnitPrice(item, status)).toBe(2000)
  })

  it('never discounts a line to a brand price at/above its own normal price', () => {
    const status = computeBrandBulkStatus([line('b1', 91)], brandsById)
    expect(effectiveUnitPrice(line('b1', 91, { selected_price: 2000 }), status)).toBe(2000)
    expect(effectiveUnitPrice(line('b1', 91, { selected_price: 1900 }), status)).toBe(1900)
  })

  it('drops the discount immediately when quantity falls below the threshold', () => {
    const status = computeBrandBulkStatus([line('b1', 90)], brandsById)
    expect(effectiveUnitPrice(line('b1', 90), status)).toBe(2500)
  })

  it('mixed cart: only the active brand gets the discount', () => {
    const status = computeBrandBulkStatus([line('b1', 91), line('b2', 10)], brandsById)
    expect(effectiveUnitPrice(line('b1', 91), status)).toBe(2000)
    expect(effectiveUnitPrice(line('b2', 10), status)).toBe(2500)
  })

  it('returns 0 for a missing line', () => {
    expect(effectiveUnitPrice(null, {})).toBe(0)
  })
})

describe('resolvedUnitPrice (order-summary lines)', () => {
  it('prefers a pre-resolved unit_price (checkout snapshot)', () => {
    expect(resolvedUnitPrice({ unit_price: 2000, quantity: 5 })).toBe(2000)
    expect(resolvedUnitPrice({ unit_price: 0, quantity: 5 })).toBe(0)
  })

  it('falls back to the pure per-line math when no unit_price is set', () => {
    expect(resolvedUnitPrice(makeLine(99))).toBe(100)
    expect(resolvedUnitPrice(makeLine(100))).toBe(80)
  })

  it('handles missing/empty lines safely', () => {
    expect(resolvedUnitPrice(null)).toBe(0)
    expect(resolvedUnitPrice({})).toBe(0)
  })
})

describe('brandBulkDisplay (display guard — what is shown matches what is charged)', () => {
  // Status entries shaped exactly like computeBrandBulkStatus output.
  const activeArees = { name: 'Arees', bulk_enabled: true, bulkUnitPrice: 2000, bulkMinQty: 91, totalQty: 91, active: true }
  const inactiveArees = { ...activeArees, active: false, totalQty: 50 }

  it('shows the brand bulk price when the brand is active AND it is a genuine discount', () => {
    expect(brandBulkDisplay(activeArees, 2500)).toEqual({ active: true, displayPrice: 2000 })
  })

  it('keeps the product price when the product is CHEAPER than the brand bulk price', () => {
    // Headline guard: a ₹1,500 product under a ₹2,000 brand bulk must keep
    // ₹1,500 — never display ₹2,000 (the cart charges ₹1,500 for it too).
    expect(brandBulkDisplay(activeArees, 1500)).toEqual({ active: false, displayPrice: 1500 })
  })

  it('keeps the product price when the brand bulk price EQUALS it (no genuine discount)', () => {
    // Strict `<` guard: equal prices never claim "Bulk Applied".
    expect(brandBulkDisplay(activeArees, 2000)).toEqual({ active: false, displayPrice: 2000 })
  })

  it('keeps normal pricing when the brand is NOT active (below threshold)', () => {
    expect(brandBulkDisplay(inactiveArees, 2500)).toEqual({ active: false, displayPrice: 2500 })
  })

  it('keeps normal pricing when there is no status entry (unbranded / brand not in cart)', () => {
    expect(brandBulkDisplay(null, 2500)).toEqual({ active: false, displayPrice: 2500 })
    expect(brandBulkDisplay(undefined, 2500)).toEqual({ active: false, displayPrice: 2500 })
  })

  it('never activates on a missing or non-finite bulk unit price', () => {
    expect(brandBulkDisplay({ ...activeArees, bulkUnitPrice: null }, 2500)).toEqual({ active: false, displayPrice: 2500 })
    expect(brandBulkDisplay({ ...activeArees, bulkUnitPrice: 'oops' }, 2500)).toEqual({ active: false, displayPrice: 2500 })
  })

  it('coerces string prices from the database', () => {
    expect(brandBulkDisplay(activeArees, '2500')).toEqual({ active: true, displayPrice: 2000 })
  })

  it('integrates with computeBrandBulkStatus: real derived status drives the display', () => {
    // 91 Arees pieces (any products) → active → display shows the brand price.
    const status = computeBrandBulkStatus([line('b1', 91)], brandsById)
    expect(brandBulkDisplay(status.b1, 2500)).toEqual({ active: true, displayPrice: 2000 })
    // 90 pieces → still inactive → display keeps the normal price.
    const below = computeBrandBulkStatus([line('b1', 90)], brandsById)
    expect(brandBulkDisplay(below.b1, 2500)).toEqual({ active: false, displayPrice: 2500 })
  })

  it('a missing/NaN product price never claims bulk', () => {
    const r = brandBulkDisplay(activeArees, undefined)
    expect(r.active).toBe(false)
    expect(Number.isNaN(r.displayPrice)).toBe(true)
  })
})
