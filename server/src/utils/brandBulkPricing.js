// Brand-level bulk pricing math for ORDER CREATION (unit-tested in
// brandBulkPricing.test.js).
//
// Mirrors the storefront util (storefront/src/utils/brandBulk.js) so the
// price the customer sees in the cart is EXACTLY what the server charges.
//
// Model — one rule per brand (the brands table is the source of truth):
//   bulk_enabled    boolean   — master on/off
//   standard_price  numeric   — reference normal per-piece price (display)
//   bulk_tiers      jsonb     — ordered array of { minQuantity, price }:
//                               the HIGHEST tier whose minQuantity the
//                               order's combined pieces meet is applied
//                               (e.g. [{100, 43}, {150, 42}, {200, 40}])
//   bulk_unit_price numeric   — LEGACY single-tier price (first tier)
//   bulk_min_qty    int       — LEGACY single-tier threshold (first tier)
//
// A rule is VALID only when bulk_enabled = true AND standard_price > 0 AND
// there is at least one usable tier. Every tier price must be > 0 and below
// the standard price, and prices must never rise as quantity rises (a larger
// order can never cost more per piece). Partially configured rules are
// treated as absent — the feature stays hidden.
//
// Pieces contributed by one line:
//   - piece-based lines (customer picked an exact piece count): line.pieces
//   - "Pieces"-unit variants: quantity_value × quantity
//   - variant-less products / other units: quantity (each unit counts as one)
//
// When a brand's combined pieces reach a tier's minQuantity, EVERY
// piece-priced line of that brand is charged per piece at that tier's price
// (the highest applicable tier). The brand's standard_price is the
// authoritative normal per-piece price for those lines (product/variant rows
// may carry stale figures) — eligibility is brand-wide, never per-product,
// and the resolved price is identical for every line of the brand.

// Round monetary values to 2 decimals (orders table stores numeric(10,2)).
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

// Normalize a brand's stored bulk config into a SORTED array of tiers
// [{ minQuantity, price }] ascending by minQuantity. The `bulk_tiers` jsonb
// column is the source of truth; the legacy single-tier columns
// (bulk_min_qty / bulk_unit_price) are normalized into one tier so existing
// brands keep working untouched. Returns null when there is no usable tier.
function getBulkTiers(brand) {
  if (!brand) return null
  let tiers = null
  if (Array.isArray(brand.bulk_tiers) && brand.bulk_tiers.length > 0) {
    tiers = brand.bulk_tiers
      .map((t) => ({
        minQuantity: Number(t.minQuantity ?? t.min_qty),
        price: Number(t.price ?? t.bulk_price),
      }))
      .filter(
        (t) => Number.isInteger(t.minQuantity) && t.minQuantity >= 1 && Number.isFinite(t.price) && t.price > 0
      )
      .sort((a, b) => a.minQuantity - b.minQuantity)
    // De-duplicate by minQuantity (first wins).
    const seen = new Set()
    tiers = tiers.filter((t) => (seen.has(t.minQuantity) ? false : (seen.add(t.minQuantity), true)))
    if (tiers.length === 0) tiers = null
  }
  if (!tiers) {
    // Legacy single-tier columns → one tier.
    const min = Number(brand.bulk_min_qty)
    const price = Number(brand.bulk_unit_price)
    if (Number.isInteger(min) && min >= 1 && Number.isFinite(price) && price > 0) {
      tiers = [{ minQuantity: min, price }]
    }
  }
  return tiers
}

// The HIGHEST applicable bulk tier for a brand at `totalBrandQuantity`
// pieces — the largest minQuantity the total meets (100 pcs → the 100 tier,
// 150 pcs → the 150 tier, never the first tier found). Returns
// { minQuantity, price } or null when no tier applies (normal price).
function getApplicableBulkTier(brand, totalBrandQuantity) {
  const tiers = getBulkTiers(brand)
  if (!tiers) return null
  const pieces = Math.max(0, Math.floor(Number(totalBrandQuantity) || 0))
  let applicable = null
  for (const t of tiers) {
    if (pieces >= t.minQuantity) applicable = t
  }
  return applicable
}

// True when a brand row carries a complete, usable bulk-pricing rule.
function isValidBulkRule(brand) {
  if (!brand) return false
  const std = Number(brand.standard_price)
  if (!(brand.bulk_enabled === true && Number.isFinite(std) && std > 0)) return false
  const tiers = getBulkTiers(brand)
  if (!tiers) return false
  // Every tier must be a genuine discount below the standard price.
  if (!tiers.every((t) => t.price > 0 && t.price < std)) return false
  // Prices must never rise as quantity rises (100 → ₹40 then 150 → ₹45 is
  // invalid — a bigger order can never cost more per piece).
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].price > tiers[i - 1].price) return false
  }
  return true
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

// True when a normalized order line is PRICED PER PIECE against the brand's
// configured prices: Pieces-unit variants and exact piece-count lines.
// ML/Gram variant lines are pack-priced (their own total is the per-unit
// price) and variant-less products keep their product price — the brand rule
// never overrides those.
function isPiecePricedItem(item) {
  if (item == null) return false
  if (item.variant_id == null) return false
  return String(item.quantity_unit ?? '').trim().toLowerCase() === 'pieces'
}

// Apply bulk pricing to an array of NORMALIZED order items (each already
// carrying `quantity`, `unit_price`, `subtotal`, `normal_per_piece`,
// `unit_pieces`, `pieces`, `brand_id`, variant fields).
//
// brandRules: map of brand_id → brand row (with the bulk columns). Returns:
//   { items, brands }  — items with bulk pricing applied (new array of the
//                         same item objects, mutated in place), and a summary
//                         array of every eligible brand's state in this order.
//
// The BRAND rule is the source of truth for the brand's piece-priced lines:
// the normal per-piece price is the brand's configured standard_price (never
// the line's own stored figure, which may be stale) and, once the brand's
// combined pieces meet a tier, EVERY piece-priced line of that brand is
// charged per piece at the HIGHEST applicable tier's price.
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

    const totalPieces = totals[String(brand.id)] || 0
    const tiers = getBulkTiers(brand)
    const bulkMinQty = tiers ? tiers[0].minQuantity : 0
    const tier = getApplicableBulkTier(brand, totalPieces)
    const unlocked = tier != null
    const bulkPerPiece = tier ? tier.price : 0

    // The brand's standard price is the authoritative normal per-piece price
    // for the brand's piece-priced lines; the line's own figure is only a
    // defensive fallback (ML/Gram and variant-less lines keep their own).
    const standardPerPiece = Number(brand.standard_price)
    const brandStandardValid = Number.isFinite(standardPerPiece) && standardPerPiece > 0
    const ownNormalPerPiece = Number(item.normal_per_piece ?? lineNormalPerPiece(item))
    const normalPerPiece =
      isPiecePricedItem(item) && brandStandardValid
        ? standardPerPiece
        : ownNormalPerPiece

    // Keep the order snapshot on the brand-resolved normal price (locked or
    // unlocked) so invoices show the exact strike-through the customer saw in
    // the cart — including the per-unit field, so a stale product figure can
    // never ride along in the persisted order.
    if (normalPerPiece !== ownNormalPerPiece) {
      item.normal_per_piece = round2(normalPerPiece)
      item.normal_unit_price = round2(normalPerPiece * Number(item.unit_pieces ?? 1))
      item.variant_price_per_unit = round2(normalPerPiece)
    }

    // Bulk applies ONLY when a tier is unlocked and its rate is below the
    // resolved normal per-piece price (for piece-priced lines the resolved
    // normal is the brand standard, which is always above every tier rate for
    // a valid rule — so every piece-priced line of an unlocked brand gets the
    // applicable tier's rate).
    const useBulk = unlocked && bulkPerPiece > 0 && normalPerPiece > 0 && bulkPerPiece < normalPerPiece

    if (useBulk) {
      item.unit_price = round2(bulkPerPiece * Number(item.unit_pieces ?? 1))
      item.subtotal = round2(item.unit_price * Number(item.quantity ?? 1))
      item.bulk_active = true
      item.bulk_per_unit = round2(bulkPerPiece)
      item.bulk_min_qty = tier.minQuantity
      item.brand_total_pieces = totalPieces
    }
    return item
  })

  // Summary of every eligible brand in this order (presentation + admin view).
  const brands = []
  for (const id of Object.keys(totals)) {
    const brand = rules[id]
    if (!brand) continue
    const tiers = getBulkTiers(brand)
    const totalPieces = totals[id]
    const tier = getApplicableBulkTier(brand, totalPieces)
    brands.push({
      brand_id: id,
      brand_name: brand.name || null,
      total_pieces: totalPieces,
      bulk_min_qty: tiers ? tiers[0].minQuantity : 0,
      bulk_unit_price: tier ? tier.price : (tiers ? tiers[0].price : 0),
      unlocked: tier != null,
    })
  }

  return { items, brands }
}

module.exports = {
  round2,
  getBulkTiers,
  getApplicableBulkTier,
  isValidBulkRule,
  linePieces,
  lineUnitPieces,
  lineNormalPerPiece,
  applyBrandBulk,
}
