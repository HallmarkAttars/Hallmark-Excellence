const express = require('express')
const { requireAuth, requirePermission } = require('../middleware/auth.middleware')
const {
  getProducts,
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
router.get('/products', getProducts)
router.get('/products/:id/related', getRelatedProducts)
router.get('/products/:id', getProductById)

// --- Admin (protected) ---
router.get('/admin/products', requireAuth, requirePermission('products.view'), getAdminProducts)
router.get('/admin/products/:id', requireAuth, requirePermission('products.view'), getAdminProductById)
router.post('/admin/products', requireAuth, requirePermission('products.create'), createProduct)
router.patch('/admin/products/:id', requireAuth, requirePermission('products.edit'), updateProduct)
router.delete('/admin/products/:id', requireAuth, requirePermission('products.delete'), deleteProduct)

module.exports = router
