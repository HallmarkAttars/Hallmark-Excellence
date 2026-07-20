const express = require('express')
const { requireAuth } = require('../middleware/auth.middleware')
const { login, verify } = require('../controllers/auth.controller')

const router = express.Router()

router.post('/login', login)
router.get('/verify', requireAuth, verify)
router.post('/verify', requireAuth, verify)

module.exports = router
