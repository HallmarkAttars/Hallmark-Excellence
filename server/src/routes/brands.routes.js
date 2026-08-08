const express = require('express')
const { requireAuth, requirePermission } = require('../middleware/auth.middleware')
const { getBrands, getBrandProducts, updateBrandBulkPricing } = require('../controllers/brands.controller')

const router = express.Router()

// --- Public ---
router.get('/brands', getBrands)
router.get('/brands/:slug/products', getBrandProducts)

// --- Admin (protected + permission-checked) ---
// Combined brand bulk pricing — the only brand field admin edits today.
router.patch('/admin/brands/:id', requireAuth, requirePermission('brands.edit'), updateBrandBulkPricing)

module.exports = router
