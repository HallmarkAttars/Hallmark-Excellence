// Brand-level bulk pricing math — unit tests for
// server/src/utils/brandBulkPricing.js (the pure helpers the orders
// controller uses to apply brand bulk rates in createOrder). No Supabase,
// no I/O.
//
// Run with:  npm test  (server)

import { describe, expect, it } from 'vitest'
import {
  isValidBulkRule,
  linePieces,
  lineUnitPieces,
  lineNormalPerPiece,
  applyBrandBulk,
} from './brandBulkPricing.js'

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

// A normalized order item (the shape createOrder produces before bulk is
// applied).
function makeItem(overrides = {}) {
  return {
    product_id: 'p1',
    product_name: 'CR7',
    quantity: 1,
    unit_price: 4500,
    subtotal: 4500,
    normal_unit_price: 4500,
    normal_per_piece: 45,
    unit_pieces: 100,
    pieces: 100,
    brand_id: 'brand-arees',
    brand_name: 'Arees',
    variant_id: 'v1',
    variant_label: '100 Pieces',
    quantity_value: 100,
    quantity_unit: 'Pieces',
    variant_total_price: 4500,
    variant_price_per_unit: 45,
    ...overrides,
  }
}

describe('isValidBulkRule', () => {
  it('accepts a complete, valid rule', () => {
    expect(isValidBulkRule(AREES)).toBe(true)
  })

  it('rejects when bulk is disabled', () => {
    expect(isValidBulkRule({ ...AREES, bulk_enabled: false })).toBe(false)
  })

  it('rejects missing / non-positive values', () => {
    expect(isValidBulkRule({ ...AREES, standard_price: null })).toBe(false)
    expect(isValidBulkRule({ ...AREES, bulk_unit_price: null })).toBe(false)
    expect(isValidBulkRule({ ...AREES, bulk_min_qty: null })).toBe(false)
    expect(isValidBulkRule({ ...AREES, standard_price: 0 })).toBe(false)
    expect(isValidBulkRule({ ...AREES, bulk_unit_price: 0 })).toBe(false)
  })

  it('rejects a bulk price that is not below the normal price', () => {
    expect(isValidBulkRule({ ...AREES, bulk_unit_price: 45 })).toBe(false)
    expect(isValidBulkRule({ ...AREES, bulk_unit_price: 50 })).toBe(false)
  })

  it('rejects a non-whole or sub-1 unlock quantity', () => {
    expect(isValidBulkRule({ ...AREES, bulk_min_qty: 1.5 })).toBe(false)
    expect(isValidBulkRule({ ...AREES, bulk_min_qty: 0 })).toBe(false)
  })

  it('treats a partially configured rule as absent', () => {
    expect(isValidBulkRule({ ...AREES, bulk_unit_price: undefined })).toBe(false)
    expect(isValidBulkRule(null)).toBe(false)
  })
})

describe('linePieces', () => {
  it('counts Pieces-unit variants as size × quantity', () => {
    expect(linePieces({ variant_id: 'v1', quantity_value: 100, quantity_unit: 'Pieces', quantity: 2 })).toBe(200)
  })

  it('prefers an explicit piece-based count', () => {
    expect(linePieces({ variant_id: 'v1', quantity_value: 60, quantity_unit: 'Pieces', quantity: 1, pieces: 65 })).toBe(65)
  })

  it('counts variant-less products as one piece per unit', () => {
    expect(linePieces({ quantity: 30 })).toBe(30)
  })

  it('counts non-piece variants as one piece per unit', () => {
    expect(linePieces({ variant_id: 'v1', quantity_value: 10, quantity_unit: 'ML', quantity: 3 })).toBe(3)
  })

  it('handles missing quantity defensively', () => {
    expect(linePieces({ variant_id: 'v1', quantity_value: 100, quantity_unit: 'Pieces' })).toBe(100)
    expect(linePieces(null)).toBe(0)
  })
})

describe('lineUnitPieces', () => {
  it('returns the size per unit for pack-based Pieces lines', () => {
    expect(lineUnitPieces({ variant_id: 'v1', quantity_value: 100, quantity_unit: 'Pieces', quantity: 2 })).toBe(100)
  })

  it('returns 1 for explicit piece-based lines', () => {
    expect(lineUnitPieces({ variant_id: 'v1', quantity_value: 60, quantity_unit: 'Pieces', quantity: 1, pieces: 65 })).toBe(1)
  })

  it('returns 1 for variant-less lines', () => {
    expect(lineUnitPieces({ quantity: 5 })).toBe(1)
  })
})

describe('lineNormalPerPiece', () => {
  it('uses the variant price-per-unit for Pieces variants', () => {
    expect(lineNormalPerPiece({ variant_id: 'v1', quantity_unit: 'Pieces', variant_price_per_unit: 45 })).toBe(45)
  })

  it('derives it from total ÷ size when price-per-unit is missing', () => {
    expect(lineNormalPerPiece({ variant_id: 'v1', quantity_unit: 'Pieces', quantity_value: 100, variant_total_price: 4500 })).toBe(45)
  })

  it('uses the variant total for non-piece units (one unit = one piece)', () => {
    expect(lineNormalPerPiece({ variant_id: 'v1', quantity_unit: 'ML', variant_total_price: 150 })).toBe(150)
  })

  it('uses the product price for variant-less lines', () => {
    expect(lineNormalPerPiece({ price: 45 })).toBe(45)
  })

  it('derives total ÷ size when a legacy line stored the total as per-unit', () => {
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

describe('applyBrandBulk', () => {
  it('charges every line of an unlocked brand at the bulk per-piece rate', () => {
    // 30 + 20 + 20 AREES pieces = 70 ≥ 70 → unlocked. Each line is charged
    // ₹42/piece. 100-piece variant → ₹4,200 per unit.
    const items = [
      makeItem({ product_id: 'p1', quantity: 1, unit_pieces: 30, pieces: 30, unit_price: 1350, subtotal: 1350 }),
      makeItem({ product_id: 'p2', quantity: 1, unit_pieces: 20, pieces: 20, unit_price: 900, subtotal: 900 }),
      makeItem({ product_id: 'p3', quantity: 1, unit_pieces: 20, pieces: 20, unit_price: 900, subtotal: 900 }),
    ]
    const { items: out } = applyBrandBulk(items, { 'brand-arees': AREES })

    expect(out[0]).toMatchObject({ unit_price: 1260, subtotal: 1260, bulk_active: true, bulk_per_unit: 42 })
    expect(out[1]).toMatchObject({ unit_price: 840, subtotal: 840, bulk_active: true })
    expect(out[2]).toMatchObject({ unit_price: 840, subtotal: 840, bulk_active: true })
  })

  it('keeps normal prices when the brand total is below the threshold', () => {
    const items = [makeItem({ quantity: 1, unit_pieces: 60, pieces: 60, unit_price: 2700, subtotal: 2700 })]
    const { items: out } = applyBrandBulk(items, { 'brand-arees': AREES })

    expect(out[0]).toMatchObject({ unit_price: 2700, subtotal: 2700 })
    expect(out[0].bulk_active).toBeUndefined()
  })

  it('never combines quantities between brands', () => {
    // AREES 40 + DAHAB 30 = 70 — but the 70-piece threshold is per brand, so
    // NEITHER brand unlocks.
    const arees = [makeItem({ product_id: 'p1', quantity: 1, unit_pieces: 40, pieces: 40, unit_price: 1800, subtotal: 1800 })]
    const dahab = [
      makeItem({
        product_id: 'p4',
        brand_id: 'brand-dahab',
        brand_name: 'Dahab',
        quantity: 1,
        unit_pieces: 30,
        pieces: 30,
        unit_price: 1500,
        subtotal: 1500,
      }),
    ]
    const { items: out } = applyBrandBulk([...arees, ...dahab], { 'brand-arees': AREES, 'brand-dahab': DAHAB })

    expect(out[0].bulk_active).toBeUndefined()
    expect(out[1].bulk_active).toBeUndefined()
  })

  it('unlocks each brand independently', () => {
    const arees = [makeItem({ quantity: 1, unit_pieces: 70, pieces: 70, unit_price: 3150, subtotal: 3150 })]
    const dahab = [
      makeItem({
        product_id: 'p4',
        brand_id: 'brand-dahab',
        brand_name: 'Dahab',
        quantity: 1,
        unit_pieces: 20,
        pieces: 20,
        unit_price: 1000,
        subtotal: 1000,
      }),
    ]
    const { items: out } = applyBrandBulk([...arees, ...dahab], { 'brand-arees': AREES, 'brand-dahab': DAHAB })

    expect(out[0]).toMatchObject({ bulk_active: true, unit_price: 2940, subtotal: 2940 })
    expect(out[1].bulk_active).toBeUndefined()
  })

  it('applies the brand bulk rate once unlocked even when the line own per-piece price is below it (brand rule is authoritative)', () => {
    // The line's own normal_per_piece (₹40) is stale — the brand's standard
    // (₹45) is the authoritative normal for piece-priced lines, so the ₹42
    // bulk rate applies on unlock.
    const items = [makeItem({ quantity: 1, unit_pieces: 70, pieces: 70, normal_per_piece: 40, unit_price: 2800, subtotal: 2800 })]
    const { items: out } = applyBrandBulk(items, { 'brand-arees': AREES })

    expect(out[0]).toMatchObject({
      unit_price: 2940,
      subtotal: 2940,
      bulk_active: true,
      bulk_per_unit: 42,
      normal_per_piece: 45,
      normal_unit_price: 3150,
    })
  })

  it('resolves the BRAND standard into the snapshot for locked piece-priced lines (never the stale line price)', () => {
    // 60 < 70 → locked. The snapshot normal per piece must be the brand's
    // standard (₹45), not the line's own ₹40.
    const items = [makeItem({ quantity: 1, unit_pieces: 60, pieces: 60, normal_per_piece: 40, unit_price: 2400, subtotal: 2400 })]
    const { items: out } = applyBrandBulk(items, { 'brand-arees': AREES })

    expect(out[0]).toMatchObject({ unit_price: 2400, subtotal: 2400, normal_per_piece: 45, normal_unit_price: 2700 })
    expect(out[0].bulk_active).toBeUndefined()
  })

  it('writes the brand-resolved per-piece price into variant_price_per_unit so snapshots never carry a stale figure', () => {
    const highStd = { ...AREES, standard_price: 50, bulk_unit_price: 47 }
    const items = [makeItem({ quantity: 1, unit_pieces: 70, pieces: 70, normal_per_piece: 45, unit_price: 3150, subtotal: 3150, variant_price_per_unit: 45 })]
    const { items: out } = applyBrandBulk(items, { 'brand-arees': highStd })

    expect(out[0]).toMatchObject({
      unit_price: 3290,
      subtotal: 3290,
      bulk_active: true,
      normal_per_piece: 50,
      variant_price_per_unit: 50,
    })
  })

  it('never re-prices ML/Gram or variant-less lines from the brand rule', () => {
    const ml = makeItem({
      quantity: 1,
      quantity_value: 150,
      quantity_unit: 'ML',
      unit_pieces: 1,
      pieces: 1,
      normal_per_piece: 6300,
      unit_price: 6300,
      subtotal: 6300,
      normal_unit_price: 6300,
    })
    const { items: out } = applyBrandBulk([ml], { 'brand-arees': AREES })
    // 1 piece < 70 → locked, and even the normal reference must stay the
    // line's own price (₹6,300), never the brand standard.
    expect(out[0]).toMatchObject({ unit_price: 6300, subtotal: 6300, normal_per_piece: 6300 })
    expect(out[0].bulk_active).toBeUndefined()
  })

  it('reports the per-brand summary', () => {
    const items = [
      makeItem({ product_id: 'p1', quantity: 1, unit_pieces: 70, pieces: 70, unit_price: 3150, subtotal: 3150 }),
    ]
    const { items: out, brands } = applyBrandBulk(items, { 'brand-arees': AREES, 'brand-dahab': DAHAB })

    expect(brands).toEqual([
      { brand_id: 'brand-arees', brand_name: 'Arees', total_pieces: 70, bulk_min_qty: 70, unlocked: true },
    ])
    expect(out[0].brand_total_pieces).toBe(70)
  })

  it('leaves items without a brand untouched', () => {
    const items = [makeItem({ brand_id: null, brand_name: null })]
    const { items: out, brands } = applyBrandBulk(items, { 'brand-arees': AREES })
    expect(out[0].unit_price).toBe(4500)
    expect(brands).toEqual([])
  })

  it('handles a missing rules map gracefully', () => {
    const items = [makeItem()]
    const { items: out, brands } = applyBrandBulk(items, null)
    expect(out[0].unit_price).toBe(4500)
    expect(brands).toEqual([])
  })
})
