const express = require('express')
const { requireAuth } = require('../middleware/auth.middleware')
const { uploadSingleImage } = require('../middleware/upload.middleware')
const { uploadImage } = require('../controllers/upload.controller')

const router = express.Router()

router.post('/upload', requireAuth, uploadSingleImage, uploadImage)

module.exports = router
