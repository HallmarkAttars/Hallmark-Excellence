const express = require('express')
const { requireAuth, requirePermission } = require('../middleware/auth.middleware')
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

// --- Admin (protected + permission-checked) ---
router.get('/admin/stats', requireAuth, requirePermission('dashboard.view'), getDashboardStats)
router.get('/admin/orders', requireAuth, requirePermission('orders.view'), getOrders)
router.get('/admin/orders/:id', requireAuth, requirePermission('orders.view'), getOrderById)
router.patch('/admin/orders/:id/status', requireAuth, requirePermission('orders.update_status'), updateOrderStatus)
router.delete('/admin/orders/:id', requireAuth, requirePermission('orders.delete'), deleteOrder)

module.exports = router
