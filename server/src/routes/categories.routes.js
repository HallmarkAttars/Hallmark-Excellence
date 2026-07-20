const express = require('express')
const { requireAuth } = require('../middleware/auth.middleware')
const {
  getCategories,
  getCategoryProducts,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categories.controller')

const router = express.Router()

// --- Public ---
router.get('/categories', getCategories)
router.get('/categories/:slug/products', getCategoryProducts)

// --- Admin (protected) ---
router.get('/admin/categories', requireAuth, getAdminCategories)
router.post('/admin/categories', requireAuth, createCategory)
router.patch('/admin/categories/:id', requireAuth, updateCategory)
router.delete('/admin/categories/:id', requireAuth, deleteCategory)

module.exports = router
