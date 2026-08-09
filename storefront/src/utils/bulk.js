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

// ============================================================================
// COMBINED BRAND BULK PRICING
// ----------------------------------------------------------------------------
// A SEPARATE feature from the per-product / per-variant bulk above. Discount
// is based on the TOTAL quantity across ALL products of one brand in the cart
// (mix & match), not any single product's quantity. It is a DERIVED
// calculation — nothing is stored — so it recomputes automatically whenever
// the cart items or the brand data change.
//
// Brand data comes from the brands table (bulk_enabled / bulk_unit_price /
// bulk_min_qty / standard_price). When a brand's combined bulk is ACTIVE, its
// bulk unit price takes precedence over a line's own per-product bulk.
// ============================================================================

// Is this brand configured for combined bulk pricing at all?
// (Toggle ON + valid bulk price + integer threshold > 1.)
export function isBrandBulkEnabled(brand) {
  if (!brand || brand.bulk_enabled !== true) return false
  const price = Number(brand.bulk_unit_price)
  const qty = Number(brand.bulk_min_qty)
  return Number.isFinite(price) && price > 0 && Number.isInteger(qty) && qty > 1
}

// Valid brand bulk config, or null. Mirrors isBrandBulkEnabled but returns
// the parsed numbers so callers don't re-parse them.
export function brandBulkConfig(brand) {
  if (!isBrandBulkEnabled(brand)) return null
  return {
    bulkUnitPrice: Number(brand.bulk_unit_price),
    bulkMinQty: Number(brand.bulk_min_qty),
  }
}

// Compute the live combined-bulk status for every brand present in the cart.
//
//   items      — cart lines (must carry brand_id; quantity is read live)
//   brandsById — { [brand_id]: brand row } (fresh from the brands API)
//
// Returns { [brand_id]: { name, bulk_enabled, bulkUnitPrice, bulkMinQty,
// totalQty, active } } for every brand that has at least one cart line.
// `active` is true ONLY when the brand is configured AND its combined
// quantity across ALL lines reaches its threshold.
export function computeBrandBulkStatus(items, brandsById) {
  const byId = brandsById || {}
  const totals = {}
  const meta = {}

  for (const item of items || []) {
    if (item.brand_id == null) continue
    const bid = String(item.brand_id)
    const brand = byId[bid]
    if (!brand) continue
    const qty = Number(item.quantity ?? item.qty ?? 1)
    totals[bid] = (totals[bid] || 0) + qty
    if (!meta[bid]) {
      meta[bid] = {
        name: brand.name ?? null,
        bulk_enabled: brand.bulk_enabled === true,
        bulkUnitPrice: brand.bulk_unit_price != null ? Number(brand.bulk_unit_price) : null,
        bulkMinQty: brand.bulk_min_qty != null ? Number(brand.bulk_min_qty) : null,
      }
    }
  }

  const status = {}
  for (const [bid, totalQty] of Object.entries(totals)) {
    const m = meta[bid]
    const active =
      m.bulk_enabled &&
      Number.isInteger(m.bulkMinQty) &&
      m.bulkMinQty > 1 &&
      Number.isFinite(m.bulkUnitPrice) &&
      m.bulkUnitPrice > 0 &&
      totalQty >= m.bulkMinQty
    status[bid] = { ...m, totalQty, active }
  }
  return status
}

// Effective unit price for a cart line when brand bulk is taken into account.
//
//   item               — cart line (selected_price/price = normal price)
//   brandBulkStatus    — result of computeBrandBulkStatus
//
// Brand bulk wins over the line's own per-product bulk when active, but only
// when it is a genuine discount below THIS line's normal price. Otherwise the
// existing per-product bulk logic applies exactly as before.
export function effectiveUnitPrice(item, brandBulkStatus) {
  if (!item) return 0
  const normal = Number(item.selected_price ?? item.price ?? 0)
  const status = item.brand_id != null && brandBulkStatus ? brandBulkStatus[String(item.brand_id)] : null
  if (status && status.active) {
    const brandPrice = Number(status.bulkUnitPrice)
    if (Number.isFinite(brandPrice) && brandPrice > 0 && brandPrice < normal) {
      return brandPrice
    }
  }
  return applicableUnitPrice(item)
}

// Price + active flag to DISPLAY for a product (or variant) of a brand whose
// combined bulk may be active in the cart. Used by the product cards, quick
// view and product detail — the DISPLAY surfaces that mirror the cart.
//
//   statusEntry  — one entry of computeBrandBulkStatus(...), or null when the
//                  product has no brand / its brand is not in the cart
//   normalPrice  — the product's OWN normal price (variant or product level)
//
// Brand bulk only takes over the display when it is a GENUINE discount below
// the product's own normal price — the exact guard effectiveUnitPrice()
// applies when charging — so what is shown always matches what is charged.
// A product already cheaper than the brand bulk unit price keeps its own
// price and never claims "Bulk Applied".
//
// Returns { active, displayPrice }.
export function brandBulkDisplay(statusEntry, normalPrice) {
  const normal = Number(normalPrice)
  const brandPrice = Number(statusEntry?.bulkUnitPrice)
  // The `> 0` check intentionally mirrors effectiveUnitPrice()'s guard — an
  // active-but-invalid entry can never surface a ₹0 (or negative) price.
  const active =
    Boolean(statusEntry?.active) &&
    Number.isFinite(brandPrice) &&
    brandPrice > 0 &&
    brandPrice < normal
  return { active, displayPrice: active ? brandPrice : normal }
}

// Unit price to display for an order-summary line. Prefers a unit_price that
// was already resolved on the line (e.g. the checkout snapshot computed by the
// cart context, which includes brand bulk) and falls back to the pure
// per-line bulk math otherwise.
export function resolvedUnitPrice(item) {
  if (!item) return 0
  const resolved = Number(item.unit_price)
  if (item.unit_price != null && Number.isFinite(resolved) && resolved >= 0) {
    return resolved
  }
  return applicableUnitPrice(item)
}
