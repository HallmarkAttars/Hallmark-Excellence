// Pure pricing math for the variant pricing model (unit-tested in
// variantPricing.test.js).
//
// The cart charges the SELECTED VARIANT'S TOTAL price × the customer's
// quantity — never the price-per-unit and never a product-level price.
// The server re-validates everything from the database at checkout; these
// helpers mirror the SAME math for the storefront UI so what the customer
// sees is exactly what they will be charged.

import { getDefaultVariant, getDisplayPrice, getVariantPrice } from './productPricing'

/**
 * Resolves the unit price for a cart line using the strict priority:
 * 1. Explicitly selected variant price (item.variant_total_price, item.variant?.total_price, item.variant?.price, item.variant_price, or item.selected_price)
 * 2. Variant found by variant_id (searched in item.variants or item.product?.variants)
 * 3. Default active variant price (from item.variants or item.product?.variants)
 * 4. Product-level price (item.price or item.product?.price)
 */
export function lineUnitPrice(item) {
  if (item == null || typeof item !== 'object') return 0

  // If this item already has a resolved positive unit_price (e.g. bulk price or snapshot):
  if (item.unit_price != null && Number(item.unit_price) > 0) {
    return Number(item.unit_price)
  }

  // Priority 1: Explicitly selected variant price
  const variantTotalPrice = Number(item.variant_total_price)
  if (Number.isFinite(variantTotalPrice) && variantTotalPrice > 0) {
    return variantTotalPrice
  }

  const nestedVariantPrice = Number(item.variant?.total_price ?? item.variant?.price)
  if (Number.isFinite(nestedVariantPrice) && nestedVariantPrice > 0) {
    return nestedVariantPrice
  }

  const variantPrice = Number(item.variant_price)
  if (Number.isFinite(variantPrice) && variantPrice > 0) {
    return variantPrice
  }

  const variantId = item.variant_id ?? item.variant?.id

  // If variant_id is present and selected_price > 0, that was the selected variant price when added
  if (variantId != null && item.selected_price != null && Number(item.selected_price) > 0) {
    return Number(item.selected_price)
  }

  // Priority 2: Variant found by variant_id in item.variants or item.product.variants
  const variants = Array.isArray(item.variants)
    ? item.variants
    : (Array.isArray(item.product?.variants) ? item.product.variants : null)

  if (variants && variantId != null) {
    const found = variants.find((v) => v && String(v.id) === String(variantId))
    const foundPrice = Number(found?.total_price ?? found?.price ?? 0)
    if (Number.isFinite(foundPrice) && foundPrice > 0) {
      return foundPrice
    }
  }

  // If selected_price is already a valid non-zero price:
  if (item.selected_price != null && Number(item.selected_price) > 0) {
    return Number(item.selected_price)
  }

  // Priority 3: Default active variant price
  const defaultVar =
    getDefaultVariant(item) ||
    (item.product ? getDefaultVariant(item.product) : null)

  if (defaultVar) {
    const defPrice = Number(defaultVar.total_price ?? defaultVar.price ?? 0)
    if (Number.isFinite(defPrice) && defPrice > 0) {
      return defPrice
    }
  }

  // Priority 4: Product-level price
  const productPrice = Number(item.price ?? item.product?.price ?? 0)
  if (Number.isFinite(productPrice) && productPrice > 0) {
    return productPrice
  }

  // Fallback to any remaining non-negative price field, otherwise 0
  const fallback = Number(item.selected_price ?? item.price ?? 0)
  return Number.isFinite(fallback) && fallback >= 0 ? fallback : 0
}

// The customer-chosen quantity, floored to a whole number >= 1 (how many
// units/packs of the selected variant they want).
export function lineQuantity(item) {
  const q = Number(item?.quantity ?? item?.qty ?? 1)
  return Number.isFinite(q) && q >= 1 ? Math.floor(q) : 1
}

// Line total = variant total price × quantity.
export function lineTotal(item) {
  return lineUnitPrice(item) * lineQuantity(item)
}

// Cart total = sum of every line total.
export function cartTotal(items) {
  return (Array.isArray(items) ? items : []).reduce((sum, i) => sum + lineTotal(i), 0)
}

export { getDefaultVariant, getDisplayPrice, getVariantPrice }

