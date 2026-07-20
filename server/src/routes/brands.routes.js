const express = require('express')
const { getBrands, getBrandProducts } = require('../controllers/brands.controller')

const router = express.Router()

// --- Public ---
router.get('/brands', getBrands)
router.get('/brands/:slug/products', getBrandProducts)

module.exports = router
