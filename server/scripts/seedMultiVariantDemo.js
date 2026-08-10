// Creates two MULTI-VARIANT demo products through the REAL admin API
// (POST /api/admin/products) so they match exactly what the admin UI
// produces — variants (Quantity + Unit + Variant Total Price + Price Per
// Unit + Default), no stock, no bulk, no packs. Idempotent: skips a product
// when its name already exists (safe to re-run).
//
//   node scripts/seedMultiVariantDemo.js
//
// Requires the local server (node server.js) running on PORT from .env.

require('dotenv').config()
const PORT = process.env.PORT || 5000
const BASE = `http://localhost:${PORT}`

const CATEGORY_ATTAR = 'fd58b546-610e-4813-8669-f29fe051fb42'

const IMAGE =
  'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=70'

// Round a per-unit price to 2 decimals (numeric(10,2) style).
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

// name | brand_id | price | compare_at | rating | reviews | description | variants
// Each variant: Quantity + Unit + Variant Total Price (the amount paid for
// ONE selected variant) + Price Per Unit (informational display only).
const PRODUCTS = [
  [
    'Al Aseel',
    '37475f6d-b6d3-4ad5-8424-40be2904cd04', // misk-al-arab
    50, 75, 4.8, 26,
    'A pure, traditional attar — clean and skin-close. Pick your size: every drop is the same beloved oil.',
    [
      { quantity_value: 10, quantity_unit: 'ML', display_label: '10 ML', total_price: 50, price_per_unit: round2(50 / 10), is_default: true },
      { quantity_value: 20, quantity_unit: 'ML', display_label: '20 ML', total_price: 90, price_per_unit: round2(90 / 20), is_default: false },
      { quantity_value: 30, quantity_unit: 'ML', display_label: '30 ML', total_price: 130, price_per_unit: round2(130 / 30), is_default: false },
    ],
  ],
  [
    'Dahab Saffron Pearl',
    'dbedf744-8624-4caa-8388-c1bfe2b54b85', // dahad
    150, 200, 4.9, 41,
    'Warm saffron suspended in golden oud — measured by weight, so you choose exactly how much luxury you need.',
    [
      { quantity_value: 10, quantity_unit: 'Gram', display_label: '10 Gram', total_price: 150, price_per_unit: round2(150 / 10), is_default: true },
      { quantity_value: 20, quantity_unit: 'Gram', display_label: '20 Gram', total_price: 280, price_per_unit: round2(280 / 20), is_default: false },
      { quantity_value: 30, quantity_unit: 'Gram', display_label: '30 Gram', total_price: 400, price_per_unit: round2(400 / 30), is_default: false },
    ],
  ],
]

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@gmail.com', password: 'admin321' }),
  })
  const data = await res.json()
  if (!res.ok || !data.token) throw new Error(`Login failed: ${JSON.stringify(data).slice(0, 200)}`)
  return data.token
}

async function productExists(name) {
  const res = await fetch(`${BASE}/api/admin/products`, {
    headers: { Authorization: `Bearer ${await login()}` },
  })
  const { products } = await res.json()
  return (products || []).some((p) => p.name.toLowerCase() === name.toLowerCase())
}

async function main() {
  const token = await login()
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  let created = 0
  let skipped = 0

  for (const [name, brandId, price, compareAt, rating, reviews, description, variants] of PRODUCTS) {
    if (await productExists(name)) {
      console.log(`skip    ${name} (already exists)`)
      skipped++
      continue
    }

    const payload = {
      name,
      description,
      price,
      compare_at_price: compareAt,
      rating,
      review_count: reviews,
      is_featured: false,
      category_id: CATEGORY_ATTAR,
      brand_id: brandId,
      image: IMAGE,
      variants,
    }

    const res = await fetch(`${BASE}/api/admin/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      console.log(`ERROR   ${name}: ${data.error || JSON.stringify(data).slice(0, 180)}`)
      continue
    }
    const createdVariants = (data.product?.variants || []).map(
      (v) => `${v.display_label} @ ₹${v.total_price}${v.is_default ? ' (default)' : ''}`
    )
    console.log(`created ${name} — ₹${price} | ${createdVariants.join(', ')}`)
    created++
  }

  console.log(`\nCreated ${created}, skipped ${skipped}.`)
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
