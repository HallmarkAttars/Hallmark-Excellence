// Category and brand relationship validation rules for product creation/editing.
// Unit-tested in productValidation.test.js.
//
// Rules:
// - Brand products (brand selected or locked from URL) have OPTIONAL category.
// - Standard products (no brand) require a category so products are not left orphaned.

/**
 * Checks whether a product has an associated brand (either selected or locked).
 *
 * @param {Object} params
 * @param {string|null} [params.brandId]
 * @param {string|null} [params.lockedBrandId]
 * @returns {boolean}
 */
export function isBrandProduct({ brandId, lockedBrandId } = {}) {
  return Boolean((lockedBrandId && String(lockedBrandId).trim() !== '') || (brandId && String(brandId).trim() !== ''))
}

/**
 * Returns true if Category is mandatory for this product.
 *
 * @param {Object} params
 * @param {string|null} [params.brandId]
 * @param {string|null} [params.lockedBrandId]
 * @returns {boolean}
 */
export function isCategoryRequired({ brandId, lockedBrandId } = {}) {
  return !isBrandProduct({ brandId, lockedBrandId })
}

/**
 * Returns the UI label for the Category input.
 * E.g. "Category (optional)" for brand products, "Category" for normal products.
 *
 * @param {Object} params
 * @param {string|null} [params.brandId]
 * @param {string|null} [params.lockedBrandId]
 * @returns {string}
 */
export function getCategoryLabel({ brandId, lockedBrandId } = {}) {
  return isBrandProduct({ brandId, lockedBrandId }) ? 'Category (optional)' : 'Category'
}

/**
 * Validates category selection according to product/brand business logic.
 * Returns an error message string if invalid, or null if valid.
 *
 * @param {Object} params
 * @param {string|null} [params.categoryId]
 * @param {string|null} [params.brandId]
 * @param {string|null} [params.lockedBrandId]
 * @returns {string|null}
 */
export function validateProductCategory({ categoryId, brandId, lockedBrandId } = {}) {
  const hasCategory = Boolean(categoryId && String(categoryId).trim() !== '')
  if (isCategoryRequired({ brandId, lockedBrandId }) && !hasCategory) {
    return 'Please select a category.'
  }
  return null
}
