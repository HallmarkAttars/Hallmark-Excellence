const express = require('express')
const { requireAuth } = require('../middleware/auth.middleware')
const { login, verify } = require('../controllers/auth.controller')
const { loginIpLimiter, loginEmailLimiter } = require('../middleware/rateLimit')

const router = express.Router()

// Per-IP + per-email throttling (both return the same generic 429).
router.post('/login', loginIpLimiter, loginEmailLimiter, login)
router.get('/verify', requireAuth, verify)
router.post('/verify', requireAuth, verify)

// Silent sliding-session renewal — same strict requireAuth guard as verify;
// only an ALREADY-valid token gets re-issued with a fresh 7-day window.
router.post('/refresh', requireAuth, verify)

module.exports = router
