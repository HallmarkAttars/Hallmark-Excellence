const express = require('express')
const { requireAuth, requirePermission } = require('../middleware/auth.middleware')
const {
  createReview,
  listPublicReviews,
  listReviews,
  moderateReview,
  deleteReview,
} = require('../controllers/reviews.controller')
const { reviewLimiter, reviewReadLimiter } = require('../middleware/rateLimit')

const router = express.Router()

// --- Public ---------------------------------------------------------------
// Submission is verified server-side (real order + delivered + phone match)
// and rate-limited per IP against scripted review spam. One review per
// order is enforced by a unique index at the database level.
router.post('/reviews', reviewLimiter, createReview)

// Read-only feed of approved + consented reviews (first name only) for the
// storefront home strip. Same light throttle class as tracking lookups.
router.get('/reviews/public', reviewReadLimiter, listPublicReviews)

// --- Admin (protected + permission-checked) -------------------------------
router.get('/admin/reviews', requireAuth, requirePermission('reviews.view'), listReviews)
router.patch(
  '/admin/reviews/:id',
  requireAuth,
  requirePermission('reviews.moderate'),
  moderateReview
)
router.delete('/admin/reviews/:id', requireAuth, requirePermission('reviews.delete'), deleteReview)

module.exports = router
