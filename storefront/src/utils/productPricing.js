// Centralized product pricing helpers for Storefront.
// Business Rules:
// 1. Main product cards/lists: DO NOT DISPLAY ANY PRICE.
// 2. Quick View: Shows default active variant price initially, updates on variant selection.
// 3. Product Detail: Automatically selects default active variant and displays its price.
// 4. Products without variants: Quick View and Product Detail use product.price.
// 5. Add to Cart: Uses selected variant's actual price.

/**
 * Returns the default active variant for a product.
 * Finds active variants (active !== false and price > 0).
 * Prioritizes variant with is_default === true, falling back to first active variant.
 */
export function getDefaultVariant(product) {
  const activeVariants =
    Array.isArray(product?.variants)
      ? product.variants.filter(
          (variant) =>
            variant &&
            variant.active !== false &&
            Number(variant.price ?? variant.total_price ?? 0) > 0
        )
      : []

  return (
    activeVariants.find((variant) => variant.is_default === true) ||
    activeVariants[0] ||
    null
  )
}

/**
 * Returns the display price for a product.
 * Uses default active variant price if available, otherwise product.price.
 */
export function getDisplayPrice(product) {
  const defaultVariant = getDefaultVariant(product)

  if (defaultVariant) {
    return Number(defaultVariant.price ?? defaultVariant.total_price ?? 0)
  }

  return Number(product?.price) || 0
}

/**
 * Returns the price for a specific variant.
 */
export function getVariantPrice(variant) {
  if (!variant) return 0
  const price = Number(variant.total_price ?? variant.price ?? 0)
  return Number.isFinite(price) ? price : 0
}
