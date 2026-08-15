// Creates sample products for the three NEW brands (Misk Al Arab, Oud Al
// Haramain, Amber Oud) through the REAL admin API (POST /api/admin/products)
// so they match exactly what the admin UI produces — variants, pricing,
// status. Idempotent-ish: skips a product when its name already exists on
// that brand (safe to re-run).
//
//   node scripts/seedSampleProducts.js
//
// Requires the local server (node server.js) running on PORT from .env.

require('dotenv').config()
require('dotenv').config({ path: '.env.local', override: true })
const { getEnvAdminConfig } = require('../src/config/envAdmin')

// Credentials come ONLY from server-side env (server/.env.local) — never
// hardcoded in this script.
const envAdmin = getEnvAdminConfig()
if (!envAdmin.configured) {
  console.error('ADMIN_USERNAME / ADMIN_PASSWORD must be set in server/.env.local')
  process.exit(1)
}

const PORT = process.env.PORT || 5000
const BASE = `http://localhost:${PORT}`

const CATEGORY_ATTAR = 'fd58b546-610e-4813-8669-f29fe051fb42'

const BRAND_IDS = {
  'misk-al-arab': '37475f6d-b6d3-4ad5-8424-40be2904cd04',
  'oud-al-haramain': 'd42f69a2-f5eb-488c-adf0-402fb9085b20',
  'amber-oud': '55e3186e-0b7b-43a4-a042-d85db4b80deb',
}

const IMAGES = {
  'misk-al-arab': 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=70',
  'oud-al-haramain': 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=70',
  'amber-oud': 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=800&q=70',
}

// name | price | compare_at | rating | reviews | description
const PRODUCTS = [
  ['misk-al-arab', 'Musk Al Arab', 799, 999, 4.7, 38, 'A pure white musk attar — soft, clean and traditionally elegant.'],
  ['misk-al-arab', 'Misk Rose', 999, 1249, 4.8, 51, 'Rose and musk entwined — a romantic, skin-close fragrance.'],
  ['oud-al-haramain', 'Oud Al Haramain', 1499, 1899, 4.9, 64, 'Sacred, resinous oud — dark, smoky and deeply rooted.'],
  ['oud-al-haramain', 'Oud & Saffron', 1799, 2199, 4.8, 42, 'Royal oud wrapped in warm saffron — an evening signature.'],
  ['amber-oud', 'Amber Oud Gold', 1299, 1599, 4.7, 47, 'Golden amber and luminous oud — warm, sophisticated luxury.'],
  ['amber-oud', 'Amber Musk', 899, 1099, 4.6, 29, 'A velvety amber-musk blend — soft, warm and quietly alluring.'],
]

// Round a per-unit price to 2 decimals (numeric(10,2) style).
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

// Each product gets one default 3 ML variant: total_price = the amount the
// customer pays for the 3 ML bottle; price_per_unit = ₹X per ML (display only).
const variantFor = (price) => ({
  quantity_value: 3,
  quantity_unit: 'ML',
  display_label: '3 ML',
  total_price: price,
  price_per_unit: round2(price / 3),
  is_default: true,
})

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: envAdmin.username, password: envAdmin.password }),
  })
  const data = await res.json()
  if (!res.ok || !data.token) throw new Error(`Login failed: ${JSON.stringify(data).slice(0, 200)}`)
  return data.token
}

async function brandExists(slug) {
  const res = await fetch(`${BASE}/api/brands`)
  const { brands } = await res.json()
  return (brands || []).find((b) => b.slug === slug)
}

async function productExistsOnBrand(brandId, name) {
  const res = await fetch(`${BASE}/api/brands/${brandId}/products`)
  const { products } = await res.json()
  return (products || []).some((p) => p.name.toLowerCase() === name.toLowerCase())
}

async function main() {
  const token = await login()
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  let created = 0
  let skipped = 0

  for (const [slug, name, price, compareAt, rating, reviews, description] of PRODUCTS) {
    const brandId = BRAND_IDS[slug]
    if (!brandId) throw new Error(`Unknown brand slug: ${slug}`)

    if (await productExistsOnBrand(slug, name)) {
      console.log(`skip    ${name} (already on ${slug})`)
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
      image: IMAGES[slug],
      variants: [variantFor(price)],
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
    console.log(`created ${name} (${slug}) — ₹${price} (3 ML)`)
    created++
  }

  console.log(`\nCreated ${created}, skipped ${skipped}.`)
}

main().catch((err) => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
