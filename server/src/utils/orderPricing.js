// Pure order-line pricing math for the checkout controller.
//
// Kept free of any I/O so the exact rules the customer is charged by can be
// unit-tested in isolation (see orderPricing.test.js). The controller fetches
// the authoritative product/variant/brand values from the database and passes
// them in — nothing here ever trusts client-supplied prices. Monetary
// rounding (numeric(10,2)) stays in the controller; these functions return
// raw numbers.
//
// Only COMBINED BRAND bulk pricing remains: per-product / per-variant bulk
// purchasing and pack purchases were removed from the product system.

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
// apply. Brand-level combined bulk is the only bulk discount in the system.
// A line is only ever discounted to a price STRICTLY below its own normal
// unit price — a brand bulk price that is not a genuine discount for this
// specific line is never applied.
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

module.exports = { resolveBrandBulkPricing, brandBulkUnitPriceFor }
