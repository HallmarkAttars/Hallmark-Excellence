const express = require('express')
const { requireAuth, requirePermission } = require('../middleware/auth.middleware')
const { cachePublic } = require('../middleware/publicCache.middleware')
const {
  getProducts,
  getProductLinks,
  getProductById,
  getRelatedProducts,
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/products.controller')

const router = express.Router()

// --- Public ---
router.get('/products', cachePublic(), getProducts)
router.get('/products/links', cachePublic(), getProductLinks)
router.get('/products/:id/related', cachePublic(), getRelatedProducts)
router.get('/products/:id', cachePublic(), getProductById)

// --- Admin (protected) ---
router.get('/admin/products', requireAuth, requirePermission('products.view'), getAdminProducts)
router.get('/admin/products/:id', requireAuth, requirePermission('products.view'), getAdminProductById)
router.post('/admin/products', requireAuth, requirePermission('products.create'), createProduct)
router.patch('/admin/products/:id', requireAuth, requirePermission('products.edit'), updateProduct)
router.delete('/admin/products/:id', requireAuth, requirePermission('products.delete'), deleteProduct)

module.exports = router
