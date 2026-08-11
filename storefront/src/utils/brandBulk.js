// Brand-level bulk pricing math for the storefront (unit-tested in
// brandBulk.test.js).
//
// Mirrors the server util (server/src/utils/brandBulkPricing.js) so the
// price the customer sees in the cart is EXACTLY what the server charges.
//
// Model — one rule per brand (the brands table is the source of truth):
//   bulk_enabled    boolean   — master on/off
//   standard_price  numeric   — reference normal per-piece price (display)
//   bulk_unit_price numeric   — discounted per-piece price once unlocked
//   bulk_min_qty    int       — pieces needed ACROSS THE WHOLE BRAND in one
//                               cart (any mix of the brand's products) to
//                               unlock the bulk rate
//
// A rule is VALID only when bulk_enabled = true AND
// standard_price > bulk_unit_price > 0 AND bulk_min_qty is a whole number
// >= 1. Partially configured rules are treated as absent.
//
// Pieces contributed by one cart line:
//   - piece-based lines (exact piece count picked on the product page):
//     line.pieces
//   - "Pieces"-unit variants: quantity_value × quantity
//   - variant-less products / other units: quantity (each unit counts as one)
//
// When a brand's total pieces reach bulk_min_qty, EVERY piece-priced line of
// that brand is charged per piece at the brand's bulk_unit_price. The brand's
// standard_price is the authoritative normal per-piece price for those lines
// (product/variant rows may carry stale figures) and bulk_unit_price the
// discounted rate once unlocked — so eligibility is brand-wide, never
// per-product, and the resolved price is identical for every line of the
// brand.

// Round monetary values to 2 decimals (matches the orders table numeric(10,2)).
export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

// True when a brand row carries a complete, usable bulk-pricing rule.
export function isValidBulkRule(brand) {
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

// Total pieces one cart line contributes to its brand's tally.
export function linePieces(item) {
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
    // Non-piece units (ML / Gram): each unit counts as one piece so the
    // brand tally is never silently zero.
    return qty
  }

  // Variant-less products: one unit = one piece.
  return qty
}

// Pieces represented by ONE unit of the line (keeps the existing invariant:
// line total = unit_price × quantity).
export function lineUnitPieces(item) {
  if (item == null) return 1
  if (item.pieces != null && Number.isFinite(Number(item.pieces))) return 1
  const qty = Math.max(1, Math.floor(Number(item.quantity ?? item.qty ?? 1)))
  const total = linePieces(item)
  return Math.max(1, Math.round(total / qty))
}

// The line's own normal per-piece price (what one piece costs without bulk):
//   - "Pieces"-unit variant: price_per_unit (fallback total ÷ size)
//   - non-piece variants: the variant TOTAL per unit (each unit = one piece)
//   - variant-less products: the product price
export function lineNormalPerPiece(item) {
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

// True when a line is PRICED PER PIECE against the brand's configured
// prices: Pieces-unit variants and exact piece-count lines. ML/Gram variant
// lines are pack-priced (their own total is the per-unit price) and
// variant-less products keep their product price — the brand rule never
// overrides those, so a 150 ML bottle can never be repriced at the brand's
// per-piece rate.
function isPiecePricedLine(item) {
  if (item == null) return false
  if (item.variant_id == null) return false
  return String(item.quantity_unit ?? '').trim().toLowerCase() === 'pieces'
}

// Effective per-line pricing for one item given its brand's bulk state.
//
// The BRAND rule is the source of truth for the brand's piece-priced lines:
// the normal per-piece price is the brand's configured standard_price (never
// the line's own stored figure, which can be stale — e.g. product variants
// still priced at ₹45 while the admin's brand rule says ₹50), and once the
// brand unlocks, EVERY piece-priced line of that brand is charged per piece
// at the brand's bulk_unit_price. ML/Gram and variant-less lines keep their
// own pricing.
//
// Returns:
//   {
//     unitPrice,        // amount per ONE unit of the line (bulk-aware) —
//                       // line total stays unit_price × quantity
//     normalUnitPrice,  // the same figure without bulk (strike-through)
//     chargedPerPiece,  // per-piece price actually charged
//     useBulk,          // bulk rate applied to this line
//     linePieces,       // total pieces this line represents
//     isPiecePriced,    // line priced per piece from the brand rule
//   }
export function lineBulkPricing(item, bulkState) {
  const quantity = Math.max(1, Math.floor(Number(item?.quantity ?? item?.qty ?? 1)))
  const pieces = linePieces(item)
  const isPiecePriced = isPiecePricedLine(item)
  const ownNormalPerPiece = lineNormalPerPiece(item)
  // The brand's standard price is authoritative for piece-priced lines of a
  // brand that has a valid rule. Without a standard (defensive fallback) the
  // line's own per-piece price is used.
  const standardPerPiece = Number(bulkState?.standardPrice)
  const brandStandardIsValid = Number.isFinite(standardPerPiece) && standardPerPiece > 0
  const normalPerPiece =
    isPiecePriced && brandStandardIsValid ? standardPerPiece : ownNormalPerPiece
  const bulkPerPiece = Number(bulkState?.bulkUnitPrice)
  const useBulk = Boolean(
    bulkState?.unlocked === true &&
    Number.isFinite(bulkPerPiece) && bulkPerPiece > 0 &&
    normalPerPiece > 0 && bulkPerPiece < normalPerPiece
  )
  const chargedPerPiece = useBulk ? bulkPerPiece : normalPerPiece
  const perLineUnit = quantity >= 1 ? pieces / quantity : pieces
  return {
    unitPrice: round2(chargedPerPiece * perLineUnit),
    normalUnitPrice: round2(normalPerPiece * perLineUnit),
    chargedPerPiece,
    useBulk,
    linePieces: pieces,
    isPiecePriced,
  }
}

// Build the per-brand bulk state for a cart: brand_id → {
//   brandId, brand, name, totalPieces, bulkMinQty, unlocked, remaining,
//   standardPrice, bulkUnitPrice
// }. Only brands that (a) have a valid rule AND (b) have at least one line
// in the cart appear — brands are never combined with each other.
export function buildBrandBulk(items, brands) {
  const rules = {}
  for (const b of brands || []) {
    if (isValidBulkRule(b)) rules[String(b.id)] = b
  }

  const totals = {}
  for (const it of items || []) {
    if (it.brand_id == null) continue
    const id = String(it.brand_id)
    if (!rules[id]) continue
    totals[id] = totals[id] || { brand: rules[id], totalPieces: 0 }
    totals[id].totalPieces += linePieces(it)
  }

  const map = {}
  for (const id of Object.keys(totals)) {
    const { brand, totalPieces } = totals[id]
    const bulkMinQty = Math.floor(Number(brand.bulk_min_qty))
    map[id] = {
      brandId: id,
      brand,
      name: brand.name || 'Brand',
      totalPieces,
      bulkMinQty,
      unlocked: totalPieces >= bulkMinQty,
      remaining: Math.max(0, bulkMinQty - totalPieces),
      standardPrice: Number(brand.standard_price),
      bulkUnitPrice: Number(brand.bulk_unit_price),
    }
  }
  return map
}

// brand_id → total pieces in the cart (every brand, not only bulk-eligible
// ones) — used by the brand page / product page progress displays.
export function buildBrandPieces(items) {
  const map = {}
  for (const it of items || []) {
    if (it.brand_id == null) continue
    const id = String(it.brand_id)
    map[id] = (map[id] || 0) + linePieces(it)
  }
  return map
}

// The brand's bulk SAVINGS exactly as the cart banner shows them, derived
// from the CONFIGURED brand prices: per piece it is standard − bulk
// (e.g. ₹45 − ₹42 = ₹3), and the total is the brand's total pieces × that
// per-piece saving (160 × ₹3 = ₹480). Never derived from individual line
// prices and never a made-up percentage — so the figure can't drift into
// odd values like ₹1.13 / piece.
export function brandSavings(brandState) {
  const std = Number(brandState?.standardPrice)
  const bulk = Number(brandState?.bulkUnitPrice)
  const perPiece =
    Number.isFinite(std) && Number.isFinite(bulk) && std > bulk ? std - bulk : 0
  const piecesRaw = Number(brandState?.totalPieces)
  const pieces = Number.isFinite(piecesRaw)
    ? Math.max(0, Math.floor(piecesRaw || 0))
    : 0
  return { savingsPerPiece: perPiece, savings: pieces * perPiece }
}

// Brand total pieces shown on the PRODUCT DETAIL page.
//
// The page previews the brand total as cart pieces + the current selection
// (so the unlock state updates live as the customer changes quantity), BUT
// once the selection has actually been ADDED to the cart the cart already
// includes those pieces — adding them again would double-count.
// `selectionAlreadyInCart` must be true exactly when the current selection is
// already in the cart; then the cart total is the single source of truth.
export function productPageBrandPieces(cartPieces, selectionPieces, selectionAlreadyInCart) {
  const cart = Math.max(0, Math.floor(Number(cartPieces) || 0))
  const selection = Math.max(0, Math.floor(Number(selectionPieces) || 0))
  return selectionAlreadyInCart === true ? cart : cart + selection
}

// "1 piece" / "5 pieces" — the singular/plural label used by the bulk
// messages ("Add 1 more AREES piece to unlock bulk pricing").
export function pieceWord(n) {
  return Number(n) === 1 ? 'piece' : 'pieces'
}

// The allowed piece-count range for a selected "Pieces" band among a
// product's variants (sorted by quantity_value ascending). Selecting a band
// ALWAYS starts the quantity at its minimum — the previous quantity, cart
// quantities, brand totals and bulk thresholds never influence it.
//
// Returns null when the selected variant is not a Pieces band (ML/Gram or
// category products keep their pack-based control):
//   { min, next, max }
//   min  — the band's own quantity_value (never below 1)
//   max  — one below the NEXT band's quantity_value (null for the last band)
//   next — the following band (or null) — selected automatically at the edge
export function pieceBandRange(variants, selectedVariantId) {
  const bands = (Array.isArray(variants) ? variants : [])
    .filter((v) => String(v.quantity_unit ?? '').trim().toLowerCase() === 'pieces')
    .sort((a, b) => Number(a.quantity_value) - Number(b.quantity_value))
  const idx = bands.findIndex((v) => String(v.id) === String(selectedVariantId))
  if (idx === -1) return null
  const band = bands[idx]
  const next = bands[idx + 1] || null
  const min = Math.max(1, Math.floor(Number(band.quantity_value) || 1))
  return {
    min,
    next,
    max: next ? Math.max(min, Math.floor(Number(next.quantity_value)) - 1) : null,
  }
}
