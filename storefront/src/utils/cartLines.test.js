// Cart line identity & merging — unit tests for storefront/src/utils/cartLines.js
//
// Run with:  npm test  (storefront)

import { describe, expect, it } from 'vitest'
import { adjustLinePieces, cartLineKey, isPieceAdjustableLine, mergeCartLines } from './cartLines'

// A brand (piece-based) cart line.
const brandLine = (productId, pieces, { pricePerPiece = 45, brandId = 'brand-arees' } = {}) => ({
  product_id: productId,
  brand_id: brandId,
  name: productId,
  quantity: 1,
  pieces,
  quantity_value: pieces,
  quantity_unit: 'Pieces',
  variant_id: `v-${productId}`,
  variant_total_price: pricePerPiece * pieces,
  variant_price_per_unit: pricePerPiece,
  selected_price: pricePerPiece * pieces,
})

// A category (variant) line.
const catLine = (productId, variantId, qty, price) => ({
  product_id: productId,
  brand_id: null,
  name: productId,
  quantity: qty,
  variant_id: variantId,
  variant_label: '12 ML',
  quantity_value: 12,
  quantity_unit: 'ML',
  variant_total_price: price,
  variant_price_per_unit: price,
  selected_price: price,
})

describe('cartLineKey', () => {
  it('merges brand lines by product id alone (ignores variant/band)', () => {
    expect(cartLineKey(brandLine('pink-musk', 60))).toBe('p-pink-musk')
    expect(cartLineKey(brandLine('pink-musk', 100))).toBe('p-pink-musk')
  })

  it('keeps different brand products separate', () => {
    expect(cartLineKey(brandLine('pink-musk', 60))).not.toBe(
      cartLineKey(brandLine('red-rose', 30))
    )
  })

  it('keeps category lines keyed by product + variant', () => {
    expect(cartLineKey(catLine('oil-1', 'ml12', 1, 150))).toBe('oil-1-vml12')
    expect(cartLineKey(catLine('oil-1', 'ml100', 1, 800))).not.toBe(
      cartLineKey(catLine('oil-1', 'ml12', 1, 150))
    )
  })

  it('keys variant-less category lines by product id alone', () => {
    expect(cartLineKey({ product_id: 'cat', brand_id: null, quantity: 1 })).toBe('cat-')
  })
})

describe('mergeCartLines — brand lines', () => {
  it('combines the same product added at two piece bands into ONE row (TEST 1 & 2)', () => {
    const merged = mergeCartLines([brandLine('pink-musk', 60), brandLine('pink-musk', 100)])
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      product_id: 'pink-musk',
      pieces: 160,
      quantity: 1,
      quantity_value: 160,
      variant_label: '160 Pieces',
    })
  })

  it('keeps the FIRST band\'s per-piece price when bands differ', () => {
    const first = brandLine('pink-musk', 60, { pricePerPiece: 45 })
    const second = brandLine('pink-musk', 100, { pricePerPiece: 42 })
    const merged = mergeCartLines([first, second])
    expect(merged).toHaveLength(1)
    expect(merged[0].variant_price_per_unit).toBe(45)
    expect(merged[0].pieces).toBe(160)
    // The merged line is priced from the KEPT per-piece price: 45 × 160 =
    // ₹7,200 — never the sum of the two stored prices (₹6,900).
    expect(merged[0].selected_price).toBe(45 * 160)
    expect(merged[0].variant_total_price).toBe(45 * 160)
  })

  it('keeps DIFFERENT products of the same brand as separate rows (TEST 3)', () => {
    const merged = mergeCartLines([
      brandLine('pink-musk', 60),
      brandLine('red-rose', 30),
    ])
    expect(merged).toHaveLength(2)
    expect(merged.map((i) => i.product_id).sort()).toEqual(['pink-musk', 'red-rose'])
  })

  it('never merges quantities between different brands (TEST 4)', () => {
    const merged = mergeCartLines([
      brandLine('pink-musk', 60, { brandId: 'brand-arees' }),
      brandLine('dahab-rose', 60, { brandId: 'brand-dahab' }),
    ])
    expect(merged).toHaveLength(2)
    expect(merged[0].brand_id).toBe('brand-arees')
    expect(merged[1].brand_id).toBe('brand-dahab')
  })

  it('combines a legacy pack line with a piece line without losing pieces', () => {
    const legacyPack = {
      product_id: 'pink-musk',
      brand_id: 'brand-arees',
      quantity: 2,
      quantity_value: 60,
      quantity_unit: 'Pieces',
      variant_id: 'v-pink-musk',
      variant_total_price: 5400,
      selected_price: 5400,
    }
    const merged = mergeCartLines([legacyPack, brandLine('pink-musk', 60)])
    expect(merged).toHaveLength(1)
    expect(merged[0].pieces).toBe(180) // 60×2 pack + 60 pieces
  })
})

describe('mergeCartLines — category lines', () => {
  it('combines the same variant (same product + variant) into one row', () => {
    const merged = mergeCartLines([catLine('oil-1', 'ml12', 2, 150), catLine('oil-1', 'ml12', 3, 150)])
    expect(merged).toHaveLength(1)
    expect(merged[0].quantity).toBe(5)
  })

  it('keeps different variants of a category product separate', () => {
    const merged = mergeCartLines([catLine('oil-1', 'ml12', 1, 150), catLine('oil-1', 'ml100', 1, 800)])
    expect(merged).toHaveLength(2)
  })
})

describe('isPieceAdjustableLine / adjustLinePieces (cart stepper)', () => {
  it('adjusts an explicit piece line by ±1 and reprices from its per-piece price', () => {
    const line = brandLine('pink-musk', 160)
    const up = adjustLinePieces(line, 1)
    expect(up).toMatchObject({ pieces: 161, quantity: 1, variant_label: '161 Pieces' })
    expect(up.variant_price_per_unit).toBe(45)
    expect(up.selected_price).toBe(45 * 161)
    const down = adjustLinePieces(line, -1)
    expect(down).toMatchObject({ pieces: 159, selected_price: 45 * 159 })
  })

  it('floors at 1 piece and returns null when nothing would change', () => {
    expect(adjustLinePieces(brandLine('pink-musk', 1), -1)).toBeNull()
    expect(adjustLinePieces(brandLine('pink-musk', 160), 0)).toBeNull()
  })

  it('is NOT adjustable for brand ML/Gram lines (raw line has no pieces)', () => {
    const ml = { product_id: 'p', brand_id: 'brand-arees', quantity: 2, quantity_value: 10, quantity_unit: 'ML', variant_total_price: 150, selected_price: 150 }
    expect(isPieceAdjustableLine(ml)).toBe(false)
    expect(adjustLinePieces(ml, 1)).toBeNull()
  })

  it('is NOT adjustable for category lines', () => {
    const cat = { product_id: 'oil', brand_id: null, quantity: 3, variant_id: 'ml12', quantity_unit: 'ML' }
    expect(isPieceAdjustableLine(cat)).toBe(false)
    expect(adjustLinePieces(cat, 1)).toBeNull()
  })

  it('treats a legacy Pieces-unit single-unit line as adjustable (no explicit pieces)', () => {
    const legacy = { product_id: 'p', brand_id: 'brand-arees', quantity: 1, quantity_value: 60, quantity_unit: 'Pieces', variant_id: 'v-legacy', variant_total_price: 2700, variant_price_per_unit: 45, selected_price: 2700 }
    expect(isPieceAdjustableLine(legacy)).toBe(true)
    expect(adjustLinePieces(legacy, 1)).toMatchObject({ pieces: 61, quantity: 1 })
  })

  it('is defensive with degenerate input', () => {
    expect(isPieceAdjustableLine(null)).toBe(false)
    expect(adjustLinePieces(null, 1)).toBeNull()
  })
})

describe('mergeCartLines — load normalization', () => {
  it('normalizes a legacy duplicated cart (Pink Musk 60 + Pink Musk 100 → 160)', () => {
    const stored = [
      { product_id: 'pink-musk', brand_id: 'brand-arees', name: 'Pink Musk', quantity: 1, pieces: 60, quantity_value: 60, quantity_unit: 'Pieces', selected_price: 2700 },
      { product_id: 'pink-musk', brand_id: 'brand-arees', name: 'Pink Musk', quantity: 1, pieces: 100, quantity_value: 100, quantity_unit: 'Pieces', selected_price: 4500 },
    ]
    const merged = mergeCartLines(stored)
    expect(merged).toHaveLength(1)
    expect(merged[0].pieces).toBe(160)
    expect(merged[0].quantity).toBe(1)
  })

  it('leaves an already-clean cart untouched', () => {
    const cart = [brandLine('pink-musk', 60), brandLine('red-rose', 30)]
    const merged = mergeCartLines(cart)
    expect(merged).toHaveLength(2)
  })

  it('tolerates null/undefined inputs', () => {
    expect(mergeCartLines(null)).toEqual([])
    expect(mergeCartLines([])).toEqual([])
  })
})
