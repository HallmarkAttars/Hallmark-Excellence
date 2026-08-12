const express = require('express')
const { requireAuth, requirePermission } = require('../middleware/auth.middleware')
const {
  lookupPincode,
  trackOrder,
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
  getDashboardStats,
} = require('../controllers/orders.controller')
const { trackOrders } = require('../controllers/tracking.controller')
const { orderLimiter, trackingLimiter } = require('../middleware/rateLimit')

const router = express.Router()

// --- Public ---
// Rate-limited: checkout triggers the Brevo emails (per-IP cap) and tracking
// is a public lookup surface (per-IP cap).
router.post('/orders', orderLimiter, createOrder)
router.get('/orders/track', trackingLimiter, trackOrder)
// /api/track-order — the single tracking endpoint used by the storefront
// (phone OR order-id lookup). Routed for ALL methods so the handler can
// answer non-POST requests with 405 METHOD_NOT_ALLOWED. Kept alongside the
// legacy GET /api/orders/track so older clients keep working.
router.all('/track-order', trackingLimiter, trackOrders)
router.get('/pincode/:pincode', lookupPincode)

// --- Admin (protected + permission-checked) ---
router.get('/admin/stats', requireAuth, requirePermission('dashboard.view'), getDashboardStats)
router.get('/admin/orders', requireAuth, requirePermission('orders.view'), getOrders)
router.get('/admin/orders/:id', requireAuth, requirePermission('orders.view'), getOrderById)
router.patch('/admin/orders/:id/status', requireAuth, requirePermission('orders.update_status'), updateOrderStatus)
router.patch('/admin/orders/:id/payment-status', requireAuth, requirePermission('orders.update_payment'), updatePaymentStatus)
router.delete('/admin/orders/:id', requireAuth, requirePermission('orders.delete'), deleteOrder)

module.exports = router
