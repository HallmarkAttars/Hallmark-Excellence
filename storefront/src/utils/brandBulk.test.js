// Brand-level bulk pricing — unit tests for storefront/src/utils/brandBulk.js
// (the pure helpers CartContext and the storefront pages use). No React, no
// API. The math mirrors the server util (brandBulkPricing.js).
//
// Run with:  npm test  (storefront)

import { describe, expect, it } from 'vitest'
import {
  isValidBulkRule,
  linePieces,
  lineUnitPieces,
  lineNormalPerPiece,
  lineBulkPricing,
  buildBrandBulk,
  buildBrandPieces,
  brandSavings,
  pieceBandRange,
  pieceWord,
  productPageBrandPieces,
} from './brandBulk'

const AREES = {
  id: 'brand-arees',
  name: 'Arees',
  bulk_enabled: true,
  standard_price: 45,
  bulk_unit_price: 42,
  bulk_min_qty: 70,
}

const DAHAB = {
  id: 'brand-dahab',
  name: 'Dahab',
  bulk_enabled: true,
  standard_price: 50,
  bulk_unit_price: 47,
  bulk_min_qty: 50,
}

describe('isValidBulkRule', () => {
  it('accepts a complete, valid rule', () => {
    expect(isValidBulkRule(AREES)).toBe(true)
  })
  it('rejects when bulk is disabled or partially configured', () => {
    expect(isValidBulkRule({ ...AREES, bulk_enabled: false })).toBe(false)
    expect(isValidBulkRule({ ...AREES, bulk_unit_price: undefined })).toBe(false)
    expect(isValidBulkRule({ ...AREES, standard_price: null })).toBe(false)
    expect(isValidBulkRule({ ...AREES, bulk_min_qty: 0 })).toBe(false)
  })
  it('rejects a bulk price that is not below the normal price', () => {
    expect(isValidBulkRule({ ...AREES, bulk_unit_price: 45 })).toBe(false)
    expect(isValidBulkRule({ ...AREES, bulk_unit_price: 50 })).toBe(false)
  })
  it('rejects non-whole unlock quantities', () => {
    expect(isValidBulkRule({ ...AREES, bulk_min_qty: 70.5 })).toBe(false)
  })
  it('treats null as absent', () => {
    expect(isValidBulkRule(null)).toBe(false)
  })
})

describe('linePieces', () => {
  it('counts Pieces variants as size × quantity', () => {
    expect(linePieces({ variant_id: 'v1', quantity_value: 100, quantity_unit: 'Pieces', quantity: 2 })).toBe(200)
  })
  it('prefers the explicit piece count for piece-based lines', () => {
    expect(linePieces({ variant_id: 'v1', quantity_value: 60, quantity_unit: 'Pieces', quantity: 1, pieces: 65 })).toBe(65)
  })
  it('counts variant-less lines as one piece per unit', () => {
    expect(linePieces({ quantity: 60 })).toBe(60)
  })
  it('counts non-Pieces variants as one piece per unit', () => {
    expect(linePieces({ variant_id: 'v1', quantity_value: 10, quantity_unit: 'ML', quantity: 3 })).toBe(3)
  })
  it('is defensive with missing data', () => {
    expect(linePieces({})).toBe(1)
    expect(linePieces(null)).toBe(0)
  })
})

describe('lineUnitPieces', () => {
  it('returns the size for pack-based Pieces lines', () => {
    expect(lineUnitPieces({ variant_id: 'v1', quantity_value: 100, quantity_unit: 'Pieces', quantity: 2 })).toBe(100)
  })
  it('returns 1 for explicit piece-based lines', () => {
    expect(lineUnitPieces({ variant_id: 'v1', quantity_value: 60, quantity_unit: 'Pieces', quantity: 1, pieces: 65 })).toBe(1)
  })
})

describe('lineNormalPerPiece', () => {
  it('uses the variant per-piece price for Pieces variants', () => {
    expect(lineNormalPerPiece({ variant_id: 'v1', quantity_unit: 'Pieces', variant_price_per_unit: 45 })).toBe(45)
  })
  it('derives it from total ÷ size when missing', () => {
    expect(lineNormalPerPiece({ variant_id: 'v1', quantity_unit: 'Pieces', quantity_value: 100, variant_total_price: 4500 })).toBe(45)
  })
  it('uses the variant total for non-Pieces units', () => {
    expect(lineNormalPerPiece({ variant_id: 'v1', quantity_unit: 'ML', variant_total_price: 150 })).toBe(150)
  })
  it('uses the product price for variant-less lines', () => {
    expect(lineNormalPerPiece({ price: 45 })).toBe(45)
  })

  it('derives total ÷ size when a legacy line stored the total as per-unit', () => {
    // Legacy carts may have variant_price_per_unit === the line TOTAL (no
    // per-piece value). A genuine per-piece price is below the total, so this
    // must derive ₹4500 ÷ 100 = ₹45 instead of inflating to ₹4500/piece.
    expect(
      lineNormalPerPiece({
        variant_id: 'v1',
        quantity_unit: 'Pieces',
        quantity_value: 100,
        variant_total_price: 4500,
        variant_price_per_unit: 4500,
      })
    ).toBe(45)
  })
})

describe('lineBulkPricing', () => {
  const pack100 = {
    variant_id: 'v1',
    quantity_value: 100,
    quantity_unit: 'Pieces',
    quantity: 1,
    variant_total_price: 4500,
    variant_price_per_unit: 45,
    selected_price: 4500,
  }

  it('charges the bulk rate per piece once the brand is unlocked', () => {
    const out = lineBulkPricing(pack100, { unlocked: true, bulkUnitPrice: 42 })
    expect(out).toMatchObject({ unitPrice: 4200, chargedPerPiece: 42, useBulk: true, linePieces: 100 })
  })

  it('keeps the normal rate before unlock', () => {
    const out = lineBulkPricing(pack100, { unlocked: false, bulkUnitPrice: 42 })
    expect(out).toMatchObject({ unitPrice: 4500, chargedPerPiece: 45, useBulk: false, linePieces: 100 })
  })

  it('defensive fallback: without a brand standardPrice the line own per-piece price is the normal (and bulk above it is never applied)', () => {
    // buildBrandBulk always supplies a valid standardPrice for rule-brands, so
    // this only guards the defensive path where the brand state lacks one.
    const cheap = { ...pack100, variant_price_per_unit: 40, selected_price: 4000, variant_total_price: 4000 }
    const out = lineBulkPricing(cheap, { unlocked: true, bulkUnitPrice: 42 })
    expect(out).toMatchObject({ unitPrice: 4000, chargedPerPiece: 40, useBulk: false })
  })

  it('prices exact piece-count lines per piece', () => {
    const pieceLine = {
      variant_id: 'v1',
      quantity_value: 65,
      quantity_unit: 'Pieces',
      quantity: 1,
      pieces: 65,
      variant_total_price: 2925,
      variant_price_per_unit: 45,
      selected_price: 2925,
    }
    const out = lineBulkPricing(pieceLine, { unlocked: true, bulkUnitPrice: 42 })
    expect(out).toMatchObject({ unitPrice: 2730, chargedPerPiece: 42, linePieces: 65 })
  })

  it('prices non-piece variant units at the bulk rate once unlocked (each unit = one piece)', () => {
    // 2 units of a 10 ML variant → 2 pieces. Unlocked: ₹42 per piece → line
    // total = 42 × 2 = 84, i.e. unit_price × quantity = 42 × 2.
    const ml = { variant_id: 'v1', quantity_value: 10, quantity_unit: 'ML', quantity: 2, variant_total_price: 50, selected_price: 50 }
    const out = lineBulkPricing(ml, { unlocked: true, bulkUnitPrice: 42 })
    expect(out).toMatchObject({ unitPrice: 42, chargedPerPiece: 42, linePieces: 2 })
    expect(out.unitPrice * 2).toBe(84)
  })

  // --- The BRAND rule is the source of truth for piece-priced lines --------
  // The product's own per-piece figure (₹45) is stale — the admin's brand
  // rule (standard ₹50 / bulk ₹47) is authoritative for EVERY piece-priced
  // line of that brand (the AREES cart bug).
  const staleLine = {
    ...pack100,
    variant_price_per_unit: 45,
    variant_total_price: 4500,
    selected_price: 4500,
  }

  it('uses the BRAND standard as the normal price for piece-priced lines (never the stale line price)', () => {
    const out = lineBulkPricing(staleLine, { unlocked: false, bulkUnitPrice: 47, standardPrice: 50 })
    expect(out).toMatchObject({
      unitPrice: 5000,
      normalUnitPrice: 5000,
      chargedPerPiece: 50,
      useBulk: false,
      linePieces: 100,
      isPiecePriced: true,
    })
  })

  it('applies the brand bulk rate to every piece-priced line once the brand unlocks, even above the line own price', () => {
    const out = lineBulkPricing(staleLine, { unlocked: true, bulkUnitPrice: 47, standardPrice: 50 })
    expect(out).toMatchObject({
      unitPrice: 4700,
      normalUnitPrice: 5000,
      chargedPerPiece: 47,
      useBulk: true,
      linePieces: 100,
      isPiecePriced: true,
    })
  })

  it('keeps ML/Gram lines on their own per-unit price even when the brand rule is present', () => {
    const ml = { variant_id: 'v1', quantity_value: 10, quantity_unit: 'ML', quantity: 2, variant_total_price: 50, selected_price: 50 }
    const out = lineBulkPricing(ml, { unlocked: false, bulkUnitPrice: 47, standardPrice: 50 })
    expect(out).toMatchObject({ unitPrice: 50, chargedPerPiece: 50, useBulk: false, isPiecePriced: false })
  })

  it('keeps variant-less lines on their own product price (brand rule never reprices packs)', () => {
    const plain = { quantity: 5, price: 45, selected_price: 45 }
    const out = lineBulkPricing(plain, { unlocked: true, bulkUnitPrice: 47, standardPrice: 50 })
    expect(out).toMatchObject({ unitPrice: 45, chargedPerPiece: 45, useBulk: false, isPiecePriced: false })
  })
})

describe('buildBrandBulk', () => {
  const line = (productId, brandId, pieces, pricePerPiece) => ({
    product_id: productId,
    brand_id: brandId,
    quantity: 1,
    pieces,
    quantity_value: pieces,
    quantity_unit: 'Pieces',
    variant_id: `v-${productId}`,
    variant_total_price: pricePerPiece * pieces,
    variant_price_per_unit: pricePerPiece,
    selected_price: pricePerPiece * pieces,
  })

  it('totals pieces per brand independently', () => {
    const items = [
      line('p1', 'brand-arees', 30, 45),
      line('p2', 'brand-arees', 20, 45),
      line('p3', 'brand-arees', 20, 45),
      line('p4', 'brand-dahab', 20, 50),
    ]
    const bulk = buildBrandBulk(items, [AREES, DAHAB])
    expect(bulk['brand-arees']).toMatchObject({ totalPieces: 70, bulkMinQty: 70, unlocked: true, remaining: 0 })
    expect(bulk['brand-dahab']).toMatchObject({ totalPieces: 20, bulkMinQty: 50, unlocked: false, remaining: 30 })
  })

  it('never combines quantities between brands', () => {
    const items = [line('p1', 'brand-arees', 40, 45), line('p4', 'brand-dahab', 30, 50)]
    const bulk = buildBrandBulk(items, [AREES, DAHAB])
    expect(bulk['brand-arees'].unlocked).toBe(false)
    expect(bulk['brand-dahab'].unlocked).toBe(false)
  })

  it('ignores brands without a valid rule and lines without a brand', () => {
    const items = [
      line('p1', 'brand-arees', 70, 45),
      { product_id: 'cat', brand_id: null, quantity: 5 },
      line('p9', 'unknown-brand', 70, 45),
    ]
    const bulk = buildBrandBulk(items, [AREES])
    expect(Object.keys(bulk)).toEqual(['brand-arees'])
  })

  it('returns an empty map for an empty cart', () => {
    expect(buildBrandBulk([], [AREES])).toEqual({})
  })
})

describe('buildBrandPieces', () => {
  it('tallies pieces for every branded line regardless of rules', () => {
    const items = [
      { brand_id: 'brand-arees', quantity: 1, pieces: 30 },
      { brand_id: 'brand-arees', quantity: 1, pieces: 40 },
      { brand_id: 'brand-dahab', quantity: 10 },
    ]
    expect(buildBrandPieces(items)).toEqual({ 'brand-arees': 70, 'brand-dahab': 10 })
  })
})

describe('productPageBrandPieces (no double-counting)', () => {
  it('previews cart + selection while the selection is NOT yet in the cart', () => {
    expect(productPageBrandPieces(0, 60, false)).toBe(60) // TEST 1 before add
    expect(productPageBrandPieces(30, 60, false)).toBe(90) // TEST 2 before add
    expect(productPageBrandPieces(50, 20, false)).toBe(70) // TEST 3 before add
    expect(productPageBrandPieces(90, 60, false)).toBe(150) // TEST 5 preview
  })

  it('uses ONLY the cart total once the selection is in the cart (never adds it again)', () => {
    expect(productPageBrandPieces(60, 60, true)).toBe(60) // TEST 1 after add — NOT 120
    expect(productPageBrandPieces(90, 60, true)).toBe(90) // TEST 2 after add — NOT 150
    expect(productPageBrandPieces(70, 20, true)).toBe(70) // TEST 3 after add — NOT 90
    expect(productPageBrandPieces(90, 30, true)).toBe(90) // TEST 4 after add — bulk active
    expect(productPageBrandPieces(150, 60, true)).toBe(150) // TEST 5 after add — NOT 210
  })

  it('uses ONLY the cart total once the selection is in the cart (never adds it again)', () => {
    expect(productPageBrandPieces(60, 60, true)).toBe(60) // TEST 1 after add — NOT 120
    expect(productPageBrandPieces(90, 60, true)).toBe(90) // TEST 2 after add — NOT 150
    expect(productPageBrandPieces(70, 20, true)).toBe(70) // TEST 3 after add — NOT 90
    expect(productPageBrandPieces(90, 30, true)).toBe(90) // TEST 4 after add — bulk active
    expect(productPageBrandPieces(150, 60, true)).toBe(150) // TEST 5 after add — NOT 210
  })

  it('defends against missing/garbage input', () => {
    expect(productPageBrandPieces(undefined, undefined, false)).toBe(0)
    expect(productPageBrandPieces(null, 'abc', false)).toBe(0)
    expect(productPageBrandPieces('30', '60', false)).toBe(90)
    expect(productPageBrandPieces(-5, 60, false)).toBe(60)
  })
})

describe('pieceBandRange', () => {
  // 60 / 100 / 150 Pieces bands — the spec's canonical example.
  const variants = [
    { id: 'v60', quantity_value: 60, quantity_unit: 'Pieces' },
    { id: 'v100', quantity_value: 100, quantity_unit: 'Pieces' },
    { id: 'v150', quantity_value: 150, quantity_unit: 'Pieces' },
    { id: 'v10ml', quantity_value: 10, quantity_unit: 'ML' },
  ]

  it('starts a band at its own minimum (60 → min 60, next at 100)', () => {
    const r = pieceBandRange(variants, 'v60')
    expect(r).toMatchObject({ min: 60, max: 99 })
    expect(r.next.id).toBe('v100')
  })

  it('second band: min 100, max 149, next at 150', () => {
    const r = pieceBandRange(variants, 'v100')
    expect(r).toMatchObject({ min: 100, max: 149 })
    expect(r.next.id).toBe('v150')
  })

  it('last band has no upper bound and no next', () => {
    const r = pieceBandRange(variants, 'v150')
    expect(r).toMatchObject({ min: 150, max: null, next: null })
  })

  it('non-Pieces bands (ML/Gram) and unknown ids return null', () => {
    expect(pieceBandRange(variants, 'v10ml')).toBe(null)
    expect(pieceBandRange(variants, 'nope')).toBe(null)
    expect(pieceBandRange([], 'x')).toBe(null)
  })

  it('sorts bands ascending regardless of input order', () => {
    const shuffled = [variants[2], variants[0], variants[1]]
    const r = pieceBandRange(shuffled, 'v60')
    expect(r).toMatchObject({ min: 60, max: 99 })
    expect(r.next.id).toBe('v100')
  })

  it('keeps the range valid even with degenerate (missing) quantity values', () => {
    const r = pieceBandRange([{ id: 'v0', quantity_unit: 'Pieces' }], 'v0')
    expect(r).toMatchObject({ min: 1, max: null, next: null })
  })
})

describe('brandSavings (the exact figures the cart banner shows)', () => {
  it('computes ₹3 / piece × 160 pieces = ₹480 from the configured prices', () => {
    expect(
      brandSavings({ standardPrice: 45, bulkUnitPrice: 42, totalPieces: 160 })
    ).toEqual({ savingsPerPiece: 3, savings: 480 })
  })

  it('scales with the brand total, not any per-line figure', () => {
    expect(
      brandSavings({ standardPrice: 50, bulkUnitPrice: 47, totalPieces: 90 })
    ).toEqual({ savingsPerPiece: 3, savings: 270 })
  })

  it('is zero for locked/partially unlocked quantities only when pieces are zero, otherwise still per-piece', () => {
    // The banner only SHOWS savings when unlocked, but the helper itself is
    // purely totalPieces × per-piece — 89 pieces would save ₹267 at ₹3/piece.
    expect(
      brandSavings({ standardPrice: 45, bulkUnitPrice: 42, totalPieces: 89 })
    ).toEqual({ savingsPerPiece: 3, savings: 267 })
  })

  it('never goes negative with degenerate data', () => {
    expect(
      brandSavings({ standardPrice: 42, bulkUnitPrice: 45, totalPieces: 10 }).savingsPerPiece
    ).toBe(0)
    expect(brandSavings(null)).toEqual({ savingsPerPiece: 0, savings: 0 })
    expect(brandSavings({ standardPrice: 45, bulkUnitPrice: 42 })).toEqual({
      savingsPerPiece: 3,
      savings: 0,
    })
  })
})

describe('pieceWord', () => {
  it('singular for exactly one', () => {
    expect(pieceWord(1)).toBe('piece')
  })
  it('plural otherwise', () => {
    expect(pieceWord(0)).toBe('pieces')
    expect(pieceWord(2)).toBe('pieces')
    expect(pieceWord(70)).toBe('pieces')
  })
})
