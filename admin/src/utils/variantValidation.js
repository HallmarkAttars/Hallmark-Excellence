// Pure validation for the admin variant editor (unit-tested in
// variantValidation.test.js).
//
// These rules mirror the server-side validation in
// server/src/controllers/products.controller.js exactly — the backend stays
// authoritative; this module catches mistakes in the admin form before the
// save round-trip:
//   quantity_value > 0
//   quantity_unit  in [ML, Gram, Pieces]
//   total_price    >= 0   (the amount paid for ONE selected variant)
//   price_per_unit >= 0   (informational display only)
//   exactly one default variant, no duplicate quantity+unit pairs

export const UNIT_OPTIONS = ['ML', 'Gram', 'Pieces']

// Human label for per-unit price displays: "₹45 / piece", "₹45 / ml",
// "₹45 / gram". The suffix ALWAYS comes from the variant's own unit — never
// hard-coded to "/ piece". Unknown units fall back to their lowercased form.
export function perUnitLabel(unit) {
  const u = String(unit ?? '').trim().toLowerCase()
  if (u === 'piece' || u === 'pieces') return 'piece'
  if (u === 'ml' || u === 'mls') return 'ml'
  if (u === 'gram' || u === 'grams') return 'gram'
  return u || 'unit'
}

// The variant driving a product's displayed price: the one flagged
// is_default, otherwise the first (the server sorts variants by quantity
// ascending). Shared by every admin product list/card so the PRICE column
// never shows the legacy product-level price while variants exist.
export function defaultVariantOf(product) {
  const vs = Array.isArray(product?.variants) ? product.variants : []
  return vs.find((v) => v.is_default) || vs[0] || null
}

// Per-unit display data for a product's PRICE column: the DEFAULT variant's
// Price Per Unit plus its display suffix (e.g. { perUnit: 45, unitLabel:
// 'piece' } for "₹45 / piece"). Returns null when the product has no
// variants — the caller then falls back to the legacy product-level price.
export function perUnitDisplay(product) {
  const dv = defaultVariantOf(product)
  if (!dv) return null
  return {
    perUnit: dv.price_per_unit ?? dv.price ?? 0,
    unitLabel: perUnitLabel(dv.quantity_unit),
  }
}

// Canonicalize a legacy saved unit into one of the three standard options
// (e.g. "GM" → "Gram") so old products save cleanly under the strict
// ML/Gram/Pieces rule. Unknown units are preserved as-is (they stay visible
// in the dropdown and are rejected by validation, matching the backend).
export function normalizeUnit(unit) {
  const u = String(unit ?? '').trim().toLowerCase()
  if (!u) return 'ML'
  if (u === 'ml' || u === 'mls' || u === 'milliliter' || u === 'milliliters') return 'ML'
  if (u === 'gram' || u === 'grams' || u === 'gm' || u === 'gms') return 'Gram'
  if (u === 'pieces' || u === 'piece' || u === 'pcs' || u === 'pc') return 'Pieces'
  return String(unit).trim()
}

// Validate the full variant list. Returns '' when valid, otherwise a
// user-facing error message. Variants are OPTIONAL — an empty list is valid.
export function validateVariants(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return ''

  const defaults = variants.filter((v) => v.is_default)
  if (defaults.length !== 1) {
    return 'Exactly one variant must be marked as default.'
  }

  // Duplicate quantity + unit check
  const seen = new Set()
  for (const v of variants) {
    const q = String(v.quantity_value ?? '').trim()
    const u = String(v.quantity_unit ?? '').trim()
    if (!q || !u) {
      return 'Each variant needs a Quantity and Unit.'
    }
    if (!UNIT_OPTIONS.includes(u)) {
      return 'Unit must be one of ML, Gram or Pieces.'
    }
    const numQ = Number(q)
    if (Number.isNaN(numQ) || numQ <= 0) {
      return 'Quantity must be a number greater than 0.'
    }
    if (v.total_price === '' || v.total_price == null || Number.isNaN(Number(v.total_price)) || Number(v.total_price) < 0) {
      return 'Variant Total Price must be a number >= 0.'
    }
    if (v.price_per_unit === '' || v.price_per_unit == null || Number.isNaN(Number(v.price_per_unit)) || Number(v.price_per_unit) < 0) {
      return 'Price Per Unit must be a number >= 0.'
    }
    const key = `${q.toUpperCase()}|${u.toUpperCase()}`
    if (seen.has(key)) {
      return 'Duplicate variant: Quantity + Unit combination already exists.'
    }
    seen.add(key)
  }
  return ''
}
