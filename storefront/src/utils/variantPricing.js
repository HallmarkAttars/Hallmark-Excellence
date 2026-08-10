// Pure pricing math for the variant pricing model (unit-tested in
// variantPricing.test.js).
//
// The cart charges the SELECTED VARIANT'S TOTAL price × the customer's
// quantity — never the price-per-unit and never a product-level price.
// The server re-validates everything from the database at checkout; these
// helpers mirror the SAME math for the storefront UI so what the customer
// sees is exactly what they will be charged.

// The amount charged for ONE unit of a cart line: the selected variant's
// TOTAL price (variant products) or the product price (variant-less lines).
// Prefers a resolved `unit_price` (checkout snapshot) and falls back to the
// stored selected price / product price for legacy items.
export function lineUnitPrice(item) {
  const v = Number(item?.unit_price ?? item?.selected_price ?? item?.price ?? 0)
  return Number.isFinite(v) ? v : 0
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
