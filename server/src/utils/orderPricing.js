// Pure order-line pricing math for the checkout controller.
//
// Kept free of any I/O so the exact rules the customer is charged by can be
// unit-tested in isolation (see orderPricing.test.js). The controller fetches
// the authoritative product/variant values from the database and passes them
// in — nothing here ever trusts client-supplied prices. Monetary rounding
// (numeric(10,2)) stays in the controller; this function returns raw numbers.

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

module.exports = { applyBulkPricing }
