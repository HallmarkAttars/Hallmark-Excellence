// Pure validation for customer order-review submissions (POST /api/reviews).
//
// Deliberately FREE of imports (no Supabase/Express) so it is unit-testable
// without environment keys. The controller resolves the order and compares
// the customer phone; everything shape-related lives here.
//
// Maximum lengths exist to cap abuse payload size; rating is enforced
// 1..5; review text is optional (a star-only review is valid), consent is the
// explicit customer permission to DISPLAY their name+text on the website.
const MIN_RATING = 1
const MAX_RATING = 5
const MAX_TEXT_LENGTH = 1000

// Strict Indian mobile normalization (mirrors tracking.controller):
// 9876543210 / +919876543210 / +91 98765 43210 / 91-9876543210 → "9876543210".
function normalizeIndianPhone(raw) {
  if (raw == null) return ''
  let s = String(raw).replace(/[\s\-()]/g, '')
  if (s.startsWith('+91')) s = s.slice(3)
  else if (s.startsWith('91') && s.length > 10) s = s.slice(2)
  s = s.replace(/\D/g, '')
  return /^[0-9]{10}$/.test(s) ? s : ''
}

// Customer-facing order id: "ORD-592546" or "#ORD-592546" → "ORD-592546".
function normalizeOrderId(raw) {
  return String(raw || '').replace(/^#/, '').trim().toUpperCase()
}

// STORED phone comparison helper (mirrors tracking.controller): only the
// Indian E.164 / 10-digit / 91-prefixed formats match; anything else is ''.
function normalizeStoredPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  const indianFormat =
    digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))
  return indianFormat ? digits.slice(-10) : ''
}

// Validates one submission body. Returns:
//   { ok: true,  orderNumber, phone, rating, reviewText, consentShow }
//   { ok: false, error }
function validateReviewSubmission(body) {
  const b = body || {}

  const orderNumber = normalizeOrderId(b.orderId || b.order_number)
  if (!/^ORD-[0-9]{4,10}$/.test(orderNumber)) {
    return { ok: false, error: 'A valid order number (ORD-…) is required.' }
  }

  const phone = normalizeIndianPhone(b.phone)
  if (!phone) {
    return {
      ok: false,
      error: 'The mobile number used for the order is required to verify the review.',
    }
  }

  const rating = Number(b.rating)
  if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
    return { ok: false, error: 'Please choose a star rating from 1 to 5.' }
  }

  const rawText = b.reviewText ?? b.review_text ?? ''
  const reviewText = String(rawText).trim()
  if (reviewText.length > MAX_TEXT_LENGTH) {
    return { ok: false, error: 'Your review is too long (1000 characters max).' }
  }

  const consentShow = b.consentShow === true || b.consent_show === true

  return {
    ok: true,
    orderNumber,
    phone,
    rating,
    reviewText: reviewText || null,
    consentShow,
  }
}

module.exports = {
  MIN_RATING,
  MAX_RATING,
  MAX_TEXT_LENGTH,
  normalizeIndianPhone,
  normalizeOrderId,
  normalizeStoredPhone,
  validateReviewSubmission,
}
