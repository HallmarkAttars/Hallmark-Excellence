// Pure order-line pricing math for the checkout controller.
//
// Kept free of any I/O so the exact rules the customer is charged by can be
// unit-tested in isolation (see orderPricing.test.js). The controller fetches
// the authoritative product/variant/brand values from the database and passes
// them in — nothing here ever trusts client-supplied prices. Monetary
// rounding (numeric(10,2)) stays in the controller; these functions return
// raw numbers.

// Apply optional bulk pricing to ONE order line.
//
// Inputs (all from the database — never from the client):
//   normalUnitPrice — the line's normal unit price (selected variant, or
//                     product price for variant-less products)
//   quantity        — the line quantity
//   bulkEnabled     — bulk_enabled of the SELECTED variant (or the product
//                     for variant-less lines) — per-variant bulk config
//   bulkPrice       — bulk_price of that same variant / product
//   bulkMinQty      — bulk_min_qty of that same variant / product
//
// The bulk price unlocks ONLY when every condition holds:
//   - bulk purchasing is enabled on the line's OWN config (selected variant
//     or variant-less product)
//   - bulk_min_qty is a whole number > 1
//   - bulk_price is a finite number > 0 AND strictly below the normal price
//   - quantity >= bulk_min_qty
//
// There is deliberately NO default-variant gate: every size carries its own
// admin-configured bulk values, so the selected variant is the authority.
//
// Returns { unitPrice, bulkApplied, bulkPrice, bulkMinQty }:
//   bulkApplied false → unitPrice is the normal price and the bulk fields are
//                       null (so nothing fake is ever persisted).
function applyBulkPricing({
  normalUnitPrice,
  quantity,
  bulkEnabled,
  bulkPrice,
  bulkMinQty,
}) {
  const qty = Number(bulkMinQty)
  const price = Number(bulkPrice)

  const bulkUnlocked =
    bulkEnabled === true &&
    Number.isInteger(qty) &&
    qty > 1 &&
    Number.isFinite(price) &&
    price > 0 &&
    price < Number(normalUnitPrice) &&
    quantity >= qty

  if (bulkUnlocked) {
    return { unitPrice: price, bulkApplied: true, bulkPrice: price, bulkMinQty: qty }
  }
  return {
    unitPrice: Number(normalUnitPrice),
    bulkApplied: false,
    bulkPrice: null,
    bulkMinQty: null,
  }
}

// Resolve which brands have an ACTIVE combined bulk discount for an order.
//
// Inputs (both from the database — never from the client):
//   brandTotals  — { [brand_id]: total quantity across ALL of that brand's
//                   order lines } (summed by the controller)
//   brandConfigs — { [brand_id]: { bulk_enabled, bulk_unit_price,
//                   bulk_min_qty } } from the brands table
//
// A brand's combined bulk is active ONLY when every condition holds:
//   - bulk_enabled === true
//   - bulk_min_qty is a whole number > 1
//   - bulk_unit_price is a finite number > 0
//   - the brand's total combined quantity >= bulk_min_qty
//
// Returns { [brand_id]: { bulkUnitPrice, bulkMinQty, totalQty } } for the
// active brands only — a partially-configured brand is never discounted.
function resolveBrandBulkPricing({ brandTotals, brandConfigs }) {
  const active = {}
  for (const [brandId, totalQty] of Object.entries(brandTotals || {})) {
    const cfg = (brandConfigs || {})[brandId]
    if (!cfg || cfg.bulk_enabled !== true) continue
    const qty = Number(totalQty)
    const min = Number(cfg.bulk_min_qty)
    const price = Number(cfg.bulk_unit_price)
    if (
      Number.isFinite(qty) &&
      Number.isInteger(min) &&
      min > 1 &&
      Number.isFinite(price) &&
      price > 0 &&
      qty >= min
    ) {
      active[brandId] = { bulkUnitPrice: price, bulkMinQty: min, totalQty: qty }
    }
  }
  return active
}

// The brand bulk unit price applicable to ONE line, or null when it does not
// apply. Brand-level combined bulk takes precedence over a line's own
// per-product bulk when both are active. A line is only ever discounted to a
// price STRICTLY below its own normal unit price — a brand bulk price that is
// not a genuine discount for this specific line is never applied.
function brandBulkUnitPriceFor(normalUnitPrice, brandId, activeBrandBulk) {
  if (brandId == null) return null
  const entry = (activeBrandBulk || {})[String(brandId)]
  if (!entry) return null
  const price = Number(entry.bulkUnitPrice)
  const normal = Number(normalUnitPrice)
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(normal) || price >= normal) {
    return null
  }
  return price
}

module.exports = { applyBulkPricing, resolveBrandBulkPricing, brandBulkUnitPriceFor }
