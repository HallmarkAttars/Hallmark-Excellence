// Attar product price sync — pure helpers used by Admin → Products → Add
// Product (admin/src/pages/ProductForm.jsx).
//
// When ADDING an Attar product with a brand selected, the default variant's
// Price Per Unit is auto-filled from that brand's Bulk Pricing normal price
// (brands.standard_price), so the admin never types the per-piece price again.
// Switching brands (AREES → DAHAB) immediately updates the price. A price the
// admin typed by hand is never clobbered, and EDIT mode never re-syncs —
// existing products keep their exact saved data.

// Whether the sync should run at all: only while ADDING a product, only for
// the Attar category, and only when the brand has a configured normal price.
export function shouldSyncAttarPrice({ isEdit, isAttarCategory, brandHasNormalPrice }) {
  return !isEdit && isAttarCategory && brandHasNormalPrice
}

// Variant Total Price = Quantity × Price Per Unit, rounded to 2 decimals to
// match the numeric(10,2) column. Returns '' while either input is
// missing/invalid so the read-only field never shows a fabricated number.
export function computeVariantTotal(quantity, perUnit) {
  const q = Number(quantity)
  const p = Number(perUnit)
  if (
    String(quantity ?? '').trim() === '' ||
    String(perUnit ?? '').trim() === '' ||
    !Number.isFinite(q) ||
    !Number.isFinite(p) ||
    q <= 0 ||
    p < 0
  ) {
    return ''
  }
  return Math.round(q * p * 100) / 100
}

// Returns the NEXT variants array with the DEFAULT variant's price_per_unit
// set to brandNormalPrice (and its total recomputed), or the SAME reference
// when nothing should change:
//   • no variants / no default variant        → unchanged
//   • already synced to this brand and the price is non-empty (a price the
//     admin typed by hand)                    → unchanged
// An EMPTY default price is always filled, and switching brands always
// overwrites (AREES ₹50 → DAHAB ₹45). Non-default variants are untouched.
export function applyAttarPriceSync({ variants, brandId, priceSyncedBrand, brandNormalPrice }) {
  if (!Array.isArray(variants) || variants.length === 0) return variants
  const target = variants.findIndex((v) => v.is_default)
  if (target === -1) return variants
  const brandChanged = priceSyncedBrand !== null && priceSyncedBrand !== brandId
  const priceEmpty = String(variants[target].price_per_unit ?? '').trim() === ''
  // Already synced to this brand and the price isn't empty → leave it
  // (including hand-typed prices).
  if (!brandChanged && !priceEmpty) return variants
  const next = variants.map((v, i) =>
    i === target ? { ...v, price_per_unit: String(brandNormalPrice) } : v
  )
  next[target] = {
    ...next[target],
    total_price: computeVariantTotal(next[target].quantity_value, next[target].price_per_unit),
  }
  return next
}
