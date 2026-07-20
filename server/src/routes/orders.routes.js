const express = require('express')
const { requireAuth } = require('../middleware/auth.middleware')
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getDashboardStats,
} = require('../controllers/orders.controller')

const router = express.Router()

// --- Public ---
router.post('/orders', createOrder)

// --- Admin (protected) ---
router.get('/admin/stats', requireAuth, getDashboardStats)
router.get('/admin/orders', requireAuth, getOrders)
router.get('/admin/orders/:id', requireAuth, getOrderById)
router.patch('/admin/orders/:id/status', requireAuth, updateOrderStatus)

module.exports = router
