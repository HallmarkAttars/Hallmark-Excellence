// ============================================================================
// Rate limiting for email-related / abuse-prone public endpoints.
//
// Express single-instance deployment (Render), so an in-memory store from
// express-rate-limit is the right fit. Limits are deliberately generous so a
// shared mobile-network IP (NAT) can never lock out a real customer, while
// still stopping scripted abuse (login brute force, checkout spam that would
// burn Brevo quota, tracking scraping).
// ============================================================================

const rateLimit = require('express-rate-limit')

// Client IP for the rate-limit key.
//
// IMPORTANT — never read the FIRST x-forwarded-for entry: a client controls
// everything they send, so the first entry is fully spoofable and would let an
// attacker rotate their identity and bypass every per-IP limit. app.js sets
// `trust proxy = 1` (Render sits behind one trusted proxy that APPENDS the
// real client IP to x-forwarded-for), so `req.ip` is the real, unspoofable IP.
function clientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

const TOO_MANY_MESSAGE = 'Too many requests. Please try again later.'

function makeLimiter({ windowMs, limit, keyGenerator }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res) => {
      res.status(429).json({ error: TOO_MANY_MESSAGE })
    },
  })
}

// --- POST /api/auth/login ---------------------------------------------------
// Per-IP ceiling (broad abuse throttle) + a tighter per-email ceiling (stops
// targeted password guessing at one address). Both return the same generic
// 429 so no account-existence information is leaked.
const loginIpLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  keyGenerator: async (req) => clientKey(req),
})

const loginEmailLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  keyGenerator: async (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase()
    return email ? `email:${email}` : clientKey(req)
  },
})

// --- POST /api/orders -------------------------------------------------------
// Checkout triggers the Brevo order emails — a cap per IP prevents spam orders
// from draining the email quota while staying well above real usage.
const orderLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  keyGenerator: async (req) => clientKey(req),
})

// --- POST/GET /api/track-order ---------------------------------------------
// Public lookup endpoint — light throttling against scraping/brute force.
const trackingLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  keyGenerator: async (req) => clientKey(req),
})

module.exports = { loginIpLimiter, loginEmailLimiter, orderLimiter, trackingLimiter }
