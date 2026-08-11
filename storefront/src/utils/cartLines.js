// Cart line identity & merging (unit-tested in cartLines.test.js).
//
// The cart stores ONE line per logical product:
//   • BRAND lines (brand_id set) merge by PRODUCT ID alone — Pink Musk
//     60 Pieces + Pink Musk 100 Pieces become a single 160-piece row. The
//     pieces are what count for the brand-level bulk tally, and the two
//     bands are the same product.
//   • CATEGORY lines keep product id + variant id separate — a 12 ML and a
//     100 ML variant of a category product have their own prices and are
//     genuinely different selections, so they must stay separate rows.
//
// mergeCartLines is used BOTH when a line is added and when the cart is
// loaded from storage, so a legacy cart with duplicated rows (Pink Musk 60
// + Pink Musk 100) is normalized to a single 160-piece row without losing
// any quantity.

import { lineNormalPerPiece, linePieces, round2 } from './brandBulk'

// The stable identity used for merging and removal. Two lines with the same
// key are the same cart line and must never coexist as separate rows.
export function cartLineKey(item) {
  if (item.brand_id != null) return `p-${item.product_id}`
  return item.variant_id != null
    ? `${item.product_id}-v${item.variant_id}`
    : `${item.product_id}-`
}

// Combine duplicate lines (same cartLineKey) into one, adding quantities or
// piece counts. The first line's identity is kept; a duplicate's brand
// context is merged in so a legacy line picks up the freshest brand info.
//
// Piece-bearing lines (brand bulk lines): pieces add up, quantity stays 1,
// and the per-piece price stays the FIRST line's — merging 60 Pieces @ ₹45
// with 100 Pieces @ ₹42 must never silently reprice all 160 pieces at ₹42.
// The line's normal per-piece price is what the customer saw on the first
// addition.
//
// Quantity-based lines (category products / non-piece variants): quantities
// add up and the price refreshes to the most recently added selection.
// Whether a cart line can be stepper-adjusted by exact piece count: explicit
// piece-based lines (brand bulk adds — `pieces` stored on the line) always;
// legacy Pieces-unit single-unit lines too. Brand ML/Gram lines and category
// lines carry no explicit pieces and adjusting them would break the
// per-unit pricing invariant, so they are NOT piece-adjustable.
export function isPieceAdjustableLine(item) {
  if (item == null) return false
  if (item.pieces != null) return true
  const unit = String(item.quantity_unit ?? '').trim().toLowerCase()
  return unit === 'pieces' && Number(item.quantity ?? 1) === 1
}

// The next piece count for `delta` (+1 / −1) on a piece-adjustable line.
// Returns the UPDATED line (quantity 1, exact piece count, repriced from the
// stored per-piece price so the normal/bulk math stays consistent) or null
// when the line cannot be adjusted or the count would not change (floor 1).
export function adjustLinePieces(item, delta) {
  if (!isPieceAdjustableLine(item)) return null
  const current = item.pieces != null
    ? Math.floor(Number(item.pieces) || 0)
    : linePieces(item)
  const next = Math.max(1, current + Math.floor(Number(delta) || 0))
  if (next === current) return null
  const ppu = Number(item.variant_price_per_unit ?? lineNormalPerPiece(item))
  const total = Number.isFinite(ppu) && ppu > 0
    ? ppu * next
    : Number(item.selected_price ?? 0)
  const unit = String(item.quantity_unit || 'Pieces')
  return {
    ...item,
    pieces: next,
    quantity: 1,
    quantity_value: next,
    variant_label: `${next} ${unit}`.trim(),
    selected_price: total,
    variant_total_price: total,
  }
}

export function mergeCartLines(items) {
  const out = []
  for (const raw of items || []) {
    const item = raw
    const key = cartLineKey(item)
    const idx = out.findIndex((i) => cartLineKey(i) === key)
    if (idx === -1) {
      out.push(item)
      continue
    }

    const existing = out[idx]
    if (existing.pieces != null || item.pieces != null) {
      const existingPieces =
        existing.pieces != null ? Number(existing.pieces) || 0 : linePieces(existing)
      const addPieces = item.pieces != null ? Number(item.pieces) || 0 : linePieces(item)
      const combined = existingPieces + addPieces
      const unit = String(item.quantity_unit || 'Pieces')
      // Keep the FIRST line's per-piece price (see header comment) and price
      // the merged line from it — summing the two stored prices would
      // disagree with ppu × combined when the bands were priced differently
      // (60 @ ₹45 + 100 @ ₹42 must price 160 pieces at ₹7,200, not ₹6,900).
      const ppu = Number(existing.variant_price_per_unit ?? item.variant_price_per_unit)
      const mergedTotal = Number.isFinite(ppu) && ppu > 0
        ? round2(ppu * combined)
        : Number(existing.selected_price ?? 0) + Number(item.selected_price ?? 0)
      out[idx] = {
        ...existing,
        pieces: combined,
        quantity: 1,
        quantity_value: combined,
        variant_label: `${combined} ${unit}`.trim(),
        selected_price: mergedTotal,
        variant_total_price: mergedTotal,
        variant_price_per_unit: ppu || item.variant_price_per_unit,
        variant_is_default: existing.variant_is_default === true,
        brand_id: item.brand_id ?? existing.brand_id,
        brand_name: item.brand_name ?? existing.brand_name,
      }
      continue
    }

    out[idx] = {
      ...existing,
      quantity: Math.max(1, Number(existing.quantity ?? 1) + Number(item.quantity ?? 1)),
      // Refresh price/variant info on re-add — a legacy line must pick up the
      // current variant total price.
      selected_price: Number(item.selected_price ?? item.price ?? existing.selected_price ?? 0),
      variant_total_price: Number(
        item.variant_total_price ??
          item.selected_price ??
          existing.variant_total_price ??
          existing.selected_price ??
          0
      ),
      variant_price_per_unit:
        item.variant_price_per_unit ?? existing.variant_price_per_unit,
      variant_is_default: item.variant_is_default === true,
      brand_id: item.brand_id ?? existing.brand_id,
      brand_name: item.brand_name ?? existing.brand_name,
    }
  }
  return out
}
