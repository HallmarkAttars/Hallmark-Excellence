// Shared bulk-purchasing helpers — ONE source of truth for the storefront.
//
// Bulk purchasing is OPTIONAL and configured PER VARIANT (admin enables it on
// individual sizes). A product WITHOUT variants keeps using the product-level
// bulk fields (legacy). Every helper reads the SAME field names
// (bulk_enabled / bulk_price / bulk_min_qty) off whichever object carries
// them — a variant or a product — so there is no scattered field-name mapping.
//
// A variant has bulk purchasing ONLY when its bulk_enabled === true AND the
// configured price/quantity are real and valid. When bulk is not enabled,
// every helper behaves as "no bulk", so the normal experience stays unchanged.

// Is this object (variant OR product) configured for bulk purchasing?
// (Toggle ON + valid bulk price + integer bulk quantity > 1.)
export function isBulkEnabled(entity) {
  if (!entity || entity.bulk_enabled !== true) return false
  const price = Number(entity.bulk_price)
  const qty = Number(entity.bulk_min_qty)
  return Number.isFinite(price) && price > 0 && Number.isInteger(qty) && qty > 1
}

export function bulkPriceOf(entity) {
  return isBulkEnabled(entity) ? Number(entity.bulk_price) : null
}

export function bulkMinQtyOf(entity) {
  return isBulkEnabled(entity) ? Number(entity.bulk_min_qty) : null
}

// Does this PRODUCT have bulk pricing available at all — either its own
// product-level config (variant-less products) or on ANY of its variants?
// Used for subtle listing indicators ("Bulk Price Available") and the bulk
// filter on Shop / brand pages — never for showing a specific price.
export function hasAnyBulk(product) {
  if (!product) return false
  if (isBulkEnabled(product)) return true
  return Array.isArray(product.variants) && product.variants.some(isBulkEnabled)
}

// Can bulk pricing apply to this cart line AT ALL? A line is bulk-applicable
// when it carries a valid bulk config — which the cart copies from the exact
// variant (or product) the customer selected at add time. There is no default
// variant gate: each variant's own config decides.
export function isBulkApplicable(item) {
  return isBulkEnabled(item)
}

// Is a cart line's quantity at/above its bulk threshold? Delegates to the ONE
// shared pricing function: unlocked when the effective price at this quantity
// is the bulk price (which getEffectiveVariantPrice only returns when the
// config is valid AND the bulk price is genuinely below the normal price — an
// invalid config can never discount the customer by mistake).
export function isBulkUnlocked(item, quantityOverride) {
  if (!isBulkApplicable(item)) return false
  const quantity =
    quantityOverride != null
      ? Number(quantityOverride)
      : Number(item.quantity ?? item.qty ?? 1)
  const normal = Number(item.selected_price ?? item.price ?? 0)
  return getEffectiveVariantPrice(item, quantity) < normal
}

// ---- THE one reusable pricing function ------------------------------------
// Effective unit price for a variant (or product-like object with a normal
// price) at a given quantity:
//   bulk enabled + valid config + quantity >= bulk_min_qty  → bulk price
//   otherwise                                                → normal price
// Used consistently across Product Detail, Cart, Checkout and the server's
// order snapshot. Mirrors the server-side order math (orderPricing.js).
export function getEffectiveVariantPrice(variant, quantity) {
  const normal = Number(variant?.price ?? variant?.selected_price ?? 0)
  if (!isBulkEnabled(variant)) return normal
  const qty = Number(variant.bulk_min_qty)
  const price = Number(variant.bulk_price)
  if (!(Number.isFinite(price) && price > 0 && price < normal)) return normal
  return Number(quantity ?? 1) >= qty ? price : normal
}

// Applicable unit price for a cart line — bulk price once unlocked, otherwise
// the normal selected price. A missing line resolves to 0 so callers never
// surface ₹NaN. Delegates to getEffectiveVariantPrice — the ONE shared pricing
// function — so Detail/Cart/Checkout all use the same math.
export function applicableUnitPrice(item) {
  if (!item) return 0
  return getEffectiveVariantPrice(item, item.quantity ?? item.qty ?? 1)
}

// Pieces still needed before the bulk price unlocks (0 when unlocked).
// Accepts an optional explicit quantity (used by the product detail page).
export function bulkRemaining(item, quantityOverride) {
  if (!item || item.bulk_enabled !== true) return 0
  const qty = Number(item.bulk_min_qty)
  const quantity =
    quantityOverride != null
      ? Number(quantityOverride)
      : Number(item.quantity ?? item.qty ?? 1)
  if (!Number.isInteger(qty) || qty < 2) return 0
  return Math.max(0, qty - quantity)
}

// Total saved once bulk pricing is applied on this line.
export function bulkSavings(item) {
  if (!isBulkUnlocked(item)) return 0
  const normal = Number(item.selected_price ?? item.price ?? 0)
  const bulk = Number(item.bulk_price)
  const quantity = Number(item.quantity ?? item.qty ?? 1)
  return Math.max(0, (normal - bulk) * quantity)
}
