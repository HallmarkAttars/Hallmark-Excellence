// Customer order reviews — POST /api/reviews (public) + admin moderation.
//
// Flow: the customer's order must be REAL (order_number exists), DELIVERED
// (order_status 'delivered' — the storefront form only renders on the
// Delivered tracking view) and VERIFIED (the submitted phone must match the
// phone stored on that order). Only then is the review inserted as
// 'pending'; an admin approves/rejects it later. One review per order
// (unique order_number, enforced by the DB) — a replayed POST returns 409.
//
// The controller never trusts the client for: order existence, delivery
// status, customer name (always read from the stored order) or consent
// (consent is stored, but display eligibility ALSO requires admin approval).

const crypto = require('crypto')
const supabase = require('../config/supabase')
const {
  validateReviewSubmission,
  normalizeStoredPhone,
} = require('../utils/reviewValidation')

// Minimal customer-safe projection of the order's notes JSONB — mirrors
// tracking.controller (notes can hold the phone under `phone` or legacy `0`).
function extractStoredPhone(order) {
  const notes = order?.notes
  if (!notes) return ''
  let info = notes
  if (typeof notes === 'string') {
    try {
      info = JSON.parse(notes)
    } catch {
      return ''
    }
  }
  if (!info || typeof info !== 'object') return ''
  return info.phone || info[0]?.phone || ''
}

function clientIpHash(req) {
  // Pseudonymized abuse-tracking id: IP + server secret, truncated. The raw
  // IP is never stored with the review.
  const ip = req.ip || req.socket?.remoteAddress || 'unknown'
  return crypto
    .createHash('sha256')
    .update(`${ip}|${process.env.JWT_SECRET || 'arees-reviews'}`)
    .digest('hex')
    .slice(0, 16)
}

// --- POST /api/reviews ------------------------------------------------------
async function createReview(req, res) {
  try {
    const input = validateReviewSubmission(req.body)
    if (!input.ok) {
      return res.status(400).json({ error: input.error })
    }

    // --- Verify the order exists AND is delivered AND owned by this phone ---
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_number, customer_name, notes, order_status')
      .eq('order_number', input.orderNumber)
      .maybeSingle()

    if (orderError) {
      console.error('[reviews] order lookup error:', orderError.message)
      return res.status(500).json({ error: 'Unable to save your review right now. Please try again.' })
    }

    // Same generic message for "no such order" and "wrong phone" so nothing
    // about other customers' orders can ever be probed.
    const storedDigits = normalizeStoredPhone(extractStoredPhone(order))
    if (!order || storedDigits !== input.phone) {
      return res.status(403).json({
        error: 'We could not verify this order with the details provided.',
      })
    }

    if (String(order.order_status || '').toLowerCase() !== 'delivered') {
      return res.status(403).json({
        error: 'Reviews open once your order is delivered.',
      })
    }

    const { error: insertError } = await supabase.from('order_reviews').insert({
      order_number: order.order_number,
      rating: input.rating,
      review_text: input.reviewText,
      customer_name: order.customer_name || null,
      consent_show: input.consentShow,
      ip_hash: clientIpHash(req),
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    })

    if (insertError) {
      // Unique violation → this order already has a review (replay).
      if (insertError.code === '23505') {
        return res.status(409).json({ error: 'This order already has a review. Thank you!' })
      }
      // Table not migrated yet → explicit degraded mode, never a fake success.
      if (/does not exist|could not find/i.test(insertError.message)) {
        console.error('[reviews] order_reviews table missing — run migration_add_order_reviews.sql')
        return res.status(503).json({ error: 'Reviews are not ready yet. Please try again later.' })
      }
      console.error('[reviews] insert error:', insertError.message)
      return res.status(500).json({ error: 'Unable to save your review right now. Please try again.' })
    }

    return res.status(201).json({ ok: true, status: 'pending' })
  } catch (err) {
    console.error('[reviews] create error:', err)
    return res.status(500).json({ error: 'Unable to save your review right now. Please try again.' })
  }
}

// --- GET /api/reviews/public (storefront "customer love" strip) -------------
// Customer-safe projection ONLY: approved reviews whose owner gave display
// consent, first name only (display, like the on-site showcase), no order
// numbers / phones / emails / any phone-derived fields resolve to their
// message-associated client identity. Rows without a written text are
// excluded — a review strip needs words, not just stars. A missing table
// (migration not run yet) degrades to an empty list, never a 500 splash.
async function listPublicReviews(req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 24)

    const { data, error } = await supabase
      .from('order_reviews')
      .select('rating, review_text, customer_name, created_at')
      .eq('status', 'approved')
      .eq('consent_show', true)
      .ne('review_text', '')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (/does not exist|could not find/i.test(error.message)) {
        return res.json({ reviews: [] })
      }
      console.error('[reviews] public list error:', error.message)
      return res.status(500).json({ error: 'Could not load reviews right now.' })
    }

    return res.json({
      reviews: (data || []).map((r) => ({
        rating: Number(r.rating) || 0,
        review_text: r.review_text || '',
        first_name: String(r.customer_name || 'Customer').trim().split(/\s+/)[0] || 'Customer',
        created_at: r.created_at,
      })),
    })
  } catch (err) {
    console.error('[reviews] public list fatal:', err)
    return res.status(500).json({ error: 'Could not load reviews right now.' })
  }
}

// --- GET /api/admin/reviews?status=pending|approved|rejected|all ------------
async function listReviews(req, res) {
  try {
    const status = String(req.query.status || 'pending').toLowerCase()
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const page = Math.max(Number(req.query.page) || 1, 1)
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Status counts for the moderation tabs, regardless of the filter.
    const { count: pendingCount } = await supabase
      .from('order_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    const { count: approvedCount } = await supabase
      .from('order_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
    const { count: rejectedCount } = await supabase
      .from('order_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rejected')

    let query = supabase
      .from('order_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (status !== 'all') {
      query = query.eq('status', status)
    }
    const { data, error } = await query

    if (error) {
      console.error('[reviews] list error:', error.message)
      return res.status(500).json({ error: 'Failed to load reviews.' })
    }

    return res.json({
      reviews: data || [],
      counts: {
        pending: pendingCount ?? 0,
        approved: approvedCount ?? 0,
        rejected: rejectedCount ?? 0,
      },
    })
  } catch (err) {
    console.error('[reviews] list fatal:', err)
    return res.status(500).json({ error: 'Failed to load reviews.' })
  }
}

// --- PATCH /api/admin/reviews/:id  { status: approved|rejected } ------------
async function moderateReview(req, res) {
  try {
    const { id } = req.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id))) {
      return res.status(400).json({ error: 'Invalid review id.' })
    }

    const status = String(req.body?.status || '').toLowerCase()
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected.' })
    }

    const updates = {
      status,
      moderated_at: new Date().toISOString(),
      moderated_by: req.admin?.email || null,
    }
    if (req.body?.adminNote != null) {
      updates.admin_note = String(req.body.adminNote).slice(0, 500)
    }

    const { data, error } = await supabase
      .from('order_reviews')
      .update(updates)
      .eq('id', id)
      .select('id, status')
      .maybeSingle()

    if (error) {
      console.error('[reviews] moderate error:', error.message)
      return res.status(500).json({ error: 'Failed to update the review.' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Review not found.' })
    }

    return res.json({ ok: true, id: data.id, status: data.status })
  } catch (err) {
    console.error('[reviews] moderate fatal:', err)
    return res.status(500).json({ error: 'Failed to update the review.' })
  }
}

// --- DELETE /api/admin/reviews/:id (admin-only, hard delete) ---------------
async function deleteReview(req, res) {
  try {
    const { id } = req.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id))) {
      return res.status(400).json({ error: 'Invalid review id.' })
    }

    const { data, error } = await supabase
      .from('order_reviews')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[reviews] delete error:', error.message)
      return res.status(500).json({ error: 'Failed to delete the review.' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Review not found.' })
    }

    return res.json({ ok: true, id: data.id })
  } catch (err) {
    console.error('[reviews] delete fatal:', err)
    return res.status(500).json({ error: 'Failed to delete the review.' })
  }
}

module.exports = { createReview, listPublicReviews, listReviews, moderateReview, deleteReview }
