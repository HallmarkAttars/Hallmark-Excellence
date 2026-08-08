// Optional Bulk Purchasing validation for the admin product form.
//
// Pure function — no React, no state — so the exact rules the form enforces
// can be unit-tested. Returns { error, bulkEnabled, bulkPrice, bulkMinQty }:
//   - error '' when the configuration is valid (or bulk is OFF).
//   - When OFF, bulkPrice/bulkMinQty resolve to null so nothing fake
//     (0 / '' / 'null') is ever saved.
//   - When ON: bulk price must be a number > 0, bulk quantity must be a whole
//     number > 1, and the bulk price must be lower than the normal price AND
//     every variant price.

export function resolveBulkFields({ bulk_enabled, bulk_price, bulk_min_qty, sellingPrice, variants = [] }) {
  const bulkEnabled = Boolean(bulk_enabled)

  if (!bulkEnabled) {
    return { error: '', bulkEnabled: false, bulkPrice: null, bulkMinQty: null }
  }

  const bulkPrice = bulk_price === '' || bulk_price == null ? NaN : Number(bulk_price)
  if (!Number.isFinite(bulkPrice) || bulkPrice <= 0) {
    return {
      error: 'Bulk Price is required and must be greater than 0 when Bulk Purchasing is enabled.',
      bulkEnabled: true,
      bulkPrice: null,
      bulkMinQty: null,
    }
  }

  const bulkMinQty = bulk_min_qty === '' || bulk_min_qty == null ? NaN : Number(bulk_min_qty)
  if (!Number.isInteger(bulkMinQty) || bulkMinQty < 2) {
    return {
      error: 'Bulk Purchase Quantity is required and must be a whole number greater than 1 when Bulk Purchasing is enabled.',
      bulkEnabled: true,
      bulkPrice,
      bulkMinQty: null,
    }
  }

  // The bulk price must be lower than the normal price AND every variant
  // price — the cheapest of them is the ceiling.
  const allPrices = [sellingPrice, ...variants.map((v) => Number(v.price))].filter(Number.isFinite)
  const minPrice = allPrices.length ? Math.min(...allPrices) : sellingPrice
  if (Number.isFinite(minPrice) && bulkPrice >= minPrice) {
    return {
      error: `Bulk price must be lower than the normal price and every variant price (lowest price is ₹${minPrice}).`,
      bulkEnabled: true,
      bulkPrice,
      bulkMinQty,
    }
  }

  return { error: '', bulkEnabled: true, bulkPrice, bulkMinQty }
}

// Combined BRAND bulk pricing validation for the admin Brand Bulk Pricing page.
//
// Pure function — no React, no state — so the exact rules the form enforces
// can be unit-tested. Returns { error, bulkEnabled, standardPrice, bulkUnitPrice,
// bulkMinQty }:
//   - error '' when the configuration is valid (or bulk is OFF).
//   - When OFF, all three values resolve to null so nothing fake is saved.
//   - When ON: standard_price must be a number > 0, bulk_unit_price a number
//     > 0 AND strictly below standard_price, and bulk_min_qty a whole number
//     > 1 (combined quantity across ALL of the brand's items).
export function resolveBrandBulkFields({ bulk_enabled, standard_price, bulk_unit_price, bulk_min_qty }) {
  const bulkEnabled = Boolean(bulk_enabled)

  if (!bulkEnabled) {
    return { error: '', bulkEnabled: false, standardPrice: null, bulkUnitPrice: null, bulkMinQty: null }
  }

  const standardPrice = standard_price === '' || standard_price == null ? NaN : Number(standard_price)
  if (!Number.isFinite(standardPrice) || standardPrice <= 0) {
    return {
      error: 'Standard price is required and must be greater than 0 when combined bulk pricing is enabled.',
      bulkEnabled: true,
      standardPrice: null,
      bulkUnitPrice: null,
      bulkMinQty: null,
    }
  }

  const bulkUnitPrice = bulk_unit_price === '' || bulk_unit_price == null ? NaN : Number(bulk_unit_price)
  if (!Number.isFinite(bulkUnitPrice) || bulkUnitPrice <= 0) {
    return {
      error: 'Bulk unit price is required and must be greater than 0 when combined bulk pricing is enabled.',
      bulkEnabled: true,
      standardPrice,
      bulkUnitPrice: null,
      bulkMinQty: null,
    }
  }
  if (bulkUnitPrice >= standardPrice) {
    return {
      error: `Bulk unit price must be lower than the standard price (₹${standardPrice}).`,
      bulkEnabled: true,
      standardPrice,
      bulkUnitPrice,
      bulkMinQty: null,
    }
  }

  const bulkMinQty = bulk_min_qty === '' || bulk_min_qty == null ? NaN : Number(bulk_min_qty)
  if (!Number.isInteger(bulkMinQty) || bulkMinQty < 2) {
    return {
      error: 'Combined quantity threshold is required and must be a whole number greater than 1 when combined bulk pricing is enabled.',
      bulkEnabled: true,
      standardPrice,
      bulkUnitPrice,
      bulkMinQty: null,
    }
  }

  return { error: '', bulkEnabled: true, standardPrice, bulkUnitPrice, bulkMinQty }
}

// Per-variant bulk validation — each size is validated against ITS OWN normal
// price. Returns { error, bulkEnabled, bulkPrice, bulkMinQty }:
//   - error '' when the config is valid (or bulk is OFF for this variant).
//   - When OFF, bulk values resolve to null so nothing fake is saved.
//   - When ON: bulk price must be a number > 0, bulk quantity a whole number
//     > 1, and the bulk price strictly lower than THIS variant's normal price.
export function resolveVariantBulkFields({ bulk_enabled, bulk_price, bulk_min_qty, normalPrice }) {
  const bulkEnabled = Boolean(bulk_enabled)

  if (!bulkEnabled) {
    return { error: '', bulkEnabled: false, bulkPrice: null, bulkMinQty: null }
  }

  const bulkPrice = bulk_price === '' || bulk_price == null ? NaN : Number(bulk_price)
  if (!Number.isFinite(bulkPrice) || bulkPrice <= 0) {
    return {
      error: 'Bulk Price is required and must be greater than 0 when Bulk Purchasing is enabled.',
      bulkEnabled: true,
      bulkPrice: null,
      bulkMinQty: null,
    }
  }

  const bulkMinQty = bulk_min_qty === '' || bulk_min_qty == null ? NaN : Number(bulk_min_qty)
  if (!Number.isInteger(bulkMinQty) || bulkMinQty < 2) {
    return {
      error: 'Bulk Purchase Quantity is required and must be a whole number greater than 1 when Bulk Purchasing is enabled.',
      bulkEnabled: true,
      bulkPrice,
      bulkMinQty: null,
    }
  }

  const normal = Number(normalPrice)
  if (Number.isFinite(normal) && bulkPrice >= normal) {
    return {
      error: `Bulk price must be lower than this variant's normal price (₹${normal}).`,
      bulkEnabled: true,
      bulkPrice,
      bulkMinQty,
    }
  }

  return { error: '', bulkEnabled: true, bulkPrice, bulkMinQty }
}
