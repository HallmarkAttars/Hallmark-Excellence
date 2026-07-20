const express = require('express')
const { requireAuth } = require('../middleware/auth.middleware')
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
router.get('/admin/products', requireAuth, getAdminProducts)
router.get('/admin/products/:id', requireAuth, getAdminProductById)
router.post('/admin/products', requireAuth, createProduct)
router.patch('/admin/products/:id', requireAuth, updateProduct)
router.delete('/admin/products/:id', requireAuth, deleteProduct)

module.exports = router
