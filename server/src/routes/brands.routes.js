const express = require('express')
const { requireAuth, requirePermission } = require('../middleware/auth.middleware')
const {
  getBrands,
  getAdminBrands,
  getBrandProducts,
  updateBrandBulkPricing,
  updateBrandDetails,
} = require('../controllers/brands.controller')

const router = express.Router()

// --- Public ---
router.get('/brands', getBrands)
router.get('/brands/:slug/products', getBrandProducts)

// --- Admin (protected + permission-checked) ---
// Full brand list (active + inactive) for the brand management screen.
router.get('/admin/brands', requireAuth, requirePermission('brands.view'), getAdminBrands)

// Combined brand bulk pricing fields (bulk_enabled / standard_price /
// bulk_unit_price / bulk_min_qty) — unchanged.
router.patch('/admin/brands/:id', requireAuth, requirePermission('brands.edit'), updateBrandBulkPricing)

// Storefront management fields (copy, imagery, position, display type,
// active state) — separate from the bulk-pricing PATCH above.
router.put('/admin/brands/:id', requireAuth, requirePermission('brands.edit'), updateBrandDetails)

module.exports = router
