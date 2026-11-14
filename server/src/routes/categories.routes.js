const express = require('express')
const { requireAuth, requirePermission } = require('../middleware/auth.middleware')
const { cachePublic } = require('../middleware/publicCache.middleware')
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
router.get('/categories', cachePublic(), getCategories)
router.get('/categories/:slug/products', cachePublic(), getCategoryProducts)

// --- Admin (protected) ---
router.get('/admin/categories', requireAuth, requirePermission('categories.view'), getAdminCategories)
router.post('/admin/categories', requireAuth, requirePermission('categories.create'), createCategory)
router.patch('/admin/categories/:id', requireAuth, requirePermission('categories.edit'), updateCategory)
router.delete('/admin/categories/:id', requireAuth, requirePermission('categories.delete'), deleteCategory)

module.exports = router
