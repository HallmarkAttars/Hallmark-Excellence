const express = require('express')
const { requireAuth } = require('../middleware/auth.middleware')
const {
  lookupPincode,
  trackOrder,
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getDashboardStats,
} = require('../controllers/orders.controller')

const router = express.Router()

// --- Public ---
router.post('/orders', createOrder)
router.get('/orders/track', trackOrder)
router.get('/pincode/:pincode', lookupPincode)

// --- Admin (protected) ---
router.get('/admin/stats', requireAuth, getDashboardStats)
router.get('/admin/orders', requireAuth, getOrders)
router.get('/admin/orders/:id', requireAuth, getOrderById)
router.patch('/admin/orders/:id/status', requireAuth, updateOrderStatus)
router.delete('/admin/orders/:id', requireAuth, deleteOrder)

module.exports = router
