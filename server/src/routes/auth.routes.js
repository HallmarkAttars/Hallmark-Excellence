const express = require('express')
const { requireAuth } = require('../middleware/auth.middleware')
const { login, verify } = require('../controllers/auth.controller')

const router = express.Router()

router.post('/login', login)
router.get('/verify', requireAuth, verify)
router.post('/verify', requireAuth, verify)

// Silent sliding-session renewal — same strict requireAuth guard as verify;
// only an ALREADY-valid token gets re-issued with a fresh 7-day window.
router.post('/refresh', requireAuth, verify)

module.exports = router
