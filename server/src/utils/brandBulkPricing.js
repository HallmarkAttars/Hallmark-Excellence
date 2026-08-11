// Brand-level bulk pricing math for ORDER CREATION (unit-tested in
// brandBulkPricing.test.js).
//
// Mirrors the storefront util (storefront/src/utils/brandBulk.js) so the
// price the customer sees in the cart is EXACTLY what the server charges.
//
// Model — one rule per brand (the brands table is the source of truth):
//   bulk_enabled    boolean   — master on/off
//   standard_price  numeric   — reference normal per-piece price (display)
//   bulk_unit_price numeric   — discounted per-piece price once unlocked
//   bulk_min_qty    int       — pieces needed ACROSS THE WHOLE BRAND in one
//                               order (any mix of the brand's products) to
//                               unlock the bulk rate
//
// A rule is VALID only when bulk_enabled = true AND
// standard_price > bulk_unit_price > 0 AND bulk_min_qty is a whole number
// >= 1. Partially configured rules are treated as absent — the feature stays
// hidden.
//
// Pieces contributed by one line:
//   - piece-based lines (customer picked an exact piece count): line.pieces
//   - "Pieces"-unit variants: quantity_value × quantity
//   - variant-less products / other units: quantity (each unit counts as one)
//
// When a brand's total pieces reach bulk_min_qty, EVERY line of that brand is
// charged per piece at the brand's bulk_unit_price — but only when that is
// cheaper than the line's own normal per-piece price (a genuine discount).

// Round monetary values to 2 decimals (orders table stores numeric(10,2)).
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

// True when a brand row carries a complete, usable bulk-pricing rule.
function isValidBulkRule(brand) {
  if (!brand) return false
  const std = Number(brand.standard_price)
  const bulk = Number(brand.bulk_unit_price)
  const min = Number(brand.bulk_min_qty)
  return (
    brand.bulk_enabled === true &&
    Number.isFinite(std) && std > 0 &&
    Number.isFinite(bulk) && bulk > 0 && bulk < std &&
    Number.isInteger(min) && min >= 1
  )
}

// Total pieces one cart/order line contributes to its brand's tally.
// Accepts both the client-shaped item and the normalized order item.
function linePieces(item) {
  if (item == null) return 0

  // Explicit piece-based line (exact piece count chosen on the product page).
  if (item.pieces != null) {
    const p = Math.floor(Number(item.pieces))
    if (Number.isFinite(p) && p >= 1) return p
  }

  const qty = Math.max(1, Math.floor(Number(item.quantity ?? item.qty ?? 1)))

  if (item.variant_id != null) {
    const unit = String(item.quantity_unit ?? '').trim().toLowerCase()
    if (unit === 'pieces') {
      const val = Math.floor(Number(item.quantity_value))
      if (Number.isFinite(val) && val >= 1) return val * qty
    }
    // Non-piece units (ML / Gram): each unit counts as one piece toward the
    // brand total so the tally is never silently zero.
    return qty
  }

  // Variant-less products: one unit = one piece.
  return qty
}

// Pieces represented by ONE unit of the line (used to keep the existing
// invariant: line total = unit_price × quantity).
function lineUnitPieces(item) {
  if (item == null) return 1
  // Piece-based line: the whole line is one unit of `pieces` pieces.
  if (item.pieces != null && Number.isFinite(Number(item.pieces))) return 1
  const qty = Math.max(1, Math.floor(Number(item.quantity ?? item.qty ?? 1)))
  const total = linePieces(item)
  return Math.max(1, Math.round(total / qty))
}

// The line's own normal per-piece price (what one piece costs without bulk):
//   - "Pieces"-unit variant: price_per_unit (fallback total / size)
//   - non-piece variants: the variant TOTAL per unit (each unit = one piece)
//   - variant-less products: the product price
function lineNormalPerPiece(item) {
  if (item == null) return 0
  if (item.variant_id != null) {
    const unit = String(item.quantity_unit ?? '').trim().toLowerCase()
    const total = Number(item.variant_total_price ?? item.selected_price ?? item.price ?? 0)
    if (unit === 'pieces') {
      const ppu = Number(item.variant_price_per_unit)
      const val = Math.floor(Number(item.quantity_value))
      const ppuIsValid = Number.isFinite(ppu) && ppu > 0
      // Trust price_per_unit when it is a genuine per-piece figure (below the
      // line total) or when the line has no total at all (ppu is all we
      // have). Otherwise derive total ÷ size so legacy lines that stored the
      // total as "per unit" never inflate pricing.
      if (ppuIsValid && (total <= 0 || ppu < total)) return ppu
      if (Number.isFinite(val) && val > 0 && Number.isFinite(total) && total > 0) {
        return round2(total / val)
      }
      if (ppuIsValid) return ppu
      return Number.isFinite(total) ? total : 0
    }
    return Number.isFinite(total) ? total : 0
  }
  const p = Number(item.selected_price ?? item.price ?? 0)
  return Number.isFinite(p) ? p : 0
}

// Apply bulk pricing to an array of NORMALIZED order items (each already
// carrying `quantity`, `unit_price`, `subtotal`, `normal_per_piece`,
// `unit_pieces`, `pieces`, `brand_id`, variant fields).
//
// brandRules: map of brand_id → brand row (with the bulk columns). Returns:
//   { items, brands }  — items with bulk pricing applied (new array of the
//                         same item objects, mutated in place), and a summary
//                         array of every eligible brand's state in this order.
function applyBrandBulk(normalizedItems, brandRules) {
  const rules = {}
  for (const brand of Object.values(brandRules || {})) {
    if (isValidBulkRule(brand)) rules[String(brand.id)] = brand
  }

  // Pass 1 — total pieces per eligible brand across the WHOLE order.
  const totals = {}
  for (const item of normalizedItems) {
    if (item.brand_id == null) continue
    const id = String(item.brand_id)
    if (!rules[id]) continue
    totals[id] = (totals[id] || 0) + Number(item.pieces ?? linePieces(item))
  }

  const items = normalizedItems.map((item) => {
    if (item.brand_id == null) return item
    const brand = rules[String(item.brand_id)]
    if (!brand) return item

    const bulkMinQty = Math.floor(Number(brand.bulk_min_qty))
    const bulkPerPiece = Number(brand.bulk_unit_price)
    const totalPieces = totals[String(brand.id)] || 0
    const unlocked = totalPieces >= bulkMinQty

    // Apply ONLY when unlocked and the bulk rate is a genuine discount below
    // this line's own normal per-piece price. Otherwise the normal price
    // stays — never a price increase.
    const normalPerPiece = Number(item.normal_per_piece ?? lineNormalPerPiece(item))
    const useBulk = unlocked && bulkPerPiece > 0 && bulkPerPiece < normalPerPiece

    if (useBulk) {
      item.unit_price = round2(bulkPerPiece * Number(item.unit_pieces ?? 1))
      item.subtotal = round2(item.unit_price * Number(item.quantity ?? 1))
      item.bulk_active = true
      item.bulk_per_unit = round2(bulkPerPiece)
      item.bulk_min_qty = bulkMinQty
      item.brand_total_pieces = totalPieces
    }
    return item
  })

  // Summary of every eligible brand in this order (presentation + admin view).
  const brands = []
  for (const id of Object.keys(totals)) {
    const brand = rules[id]
    if (!brand) continue
    const bulkMinQty = Math.floor(Number(brand.bulk_min_qty))
    const totalPieces = totals[id]
    brands.push({
      brand_id: id,
      brand_name: brand.name || null,
      total_pieces: totalPieces,
      bulk_min_qty: bulkMinQty,
      unlocked: totalPieces >= bulkMinQty,
    })
  }

  return { items, brands }
}

module.exports = {
  round2,
  isValidBulkRule,
  linePieces,
  lineUnitPieces,
  lineNormalPerPiece,
  applyBrandBulk,
}
