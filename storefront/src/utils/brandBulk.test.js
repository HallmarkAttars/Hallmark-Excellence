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

  it('never applies bulk when it is NOT below the line normal per-piece price', () => {
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
