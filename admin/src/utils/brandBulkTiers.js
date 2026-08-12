// Admin-side bulk price TIER normalization + validation.
//
// Mirrors the storefront util (storefront/src/utils/brandBulk.js) and the
// server util (server/src/utils/brandBulkPricing.js): a brand's rule is
// stored as `bulk_tiers` (jsonb array of { minQuantity, price }) with the
// legacy single-tier columns (bulk_min_qty / bulk_unit_price) normalized
// into one tier here, so existing single-tier brands keep working untouched.

// Normalize a brand's stored config into a SORTED array of tiers
// [{ minQuantity, price }] ascending by minQuantity, or null when there is
// no usable tier. Legacy single-tier columns become one tier.
export function getBulkTiers(brand) {
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
    const seen = new Set()
    tiers = tiers.filter((t) => (seen.has(t.minQuantity) ? false : (seen.add(t.minQuantity), true)))
    if (tiers.length === 0) tiers = null
  }
  if (!tiers) {
    const min = Number(brand.bulk_min_qty)
    const price = Number(brand.bulk_unit_price)
    if (Number.isInteger(min) && min >= 1 && Number.isFinite(price) && price > 0) {
      tiers = [{ minQuantity: min, price }]
    }
  }
  return tiers
}

// Validate a set of tiers against the normal price. Returns an error string
// or null when valid. `tiers` is an array of { minQuantity, price } (raw
// form inputs or parsed numbers). The array should be sorted ascending by
// minQuantity before calling (the page sorts before saving).
export function validateTiers(tiers, standardPrice) {
  const std = Number(standardPrice)
  if (!Number.isFinite(std) || std <= 0) {
    return 'Normal price must be a number greater than 0.'
  }
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return 'Add at least one bulk price tier.'
  }
  const seen = new Set()
  let prevMin = -Infinity
  let prevPrice = Infinity
  for (let i = 0; i < tiers.length; i++) {
    const raw = tiers[i] || {}
    const minQuantity = Number(raw.minQuantity ?? raw.min_qty)
    const price = Number(raw.price ?? raw.bulk_price)
    if (raw.minQuantity === '' || raw.minQuantity == null || !Number.isInteger(minQuantity) || minQuantity < 1) {
      return `Tier ${i + 1}: minimum quantity must be a positive whole number.`
    }
    if (raw.price === '' || raw.price == null || !Number.isFinite(price) || price <= 0) {
      return `Tier ${i + 1}: bulk price must be a positive number.`
    }
    if (price >= std) {
      return `Tier ${i + 1}: bulk price must be less than the normal price.`
    }
    if (seen.has(minQuantity)) {
      return 'Tier minimum quantities must be unique.'
    }
    seen.add(minQuantity)
    if (minQuantity <= prevMin) {
      return 'Tier minimum quantities must be sorted ascending.'
    }
    prevMin = minQuantity
    if (price > prevPrice) {
      return 'A larger order can never cost more per piece — later tiers must not raise the price.'
    }
    prevPrice = price
  }
  return null
}
