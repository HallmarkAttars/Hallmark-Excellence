const fs = require('fs')
const path = require('path')

async function run() {
  const baseUrl = 'http://localhost:5000'
  console.log('--- STEP 1: MEASURING CURRENT FLOW ---')

  // 1. Auth
  const tAuthStart = performance.now()
  const authRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'infohallmarkexcellence@gmail.com',
      password: 'N4@tY8%pQ3!wH6&c'
    })
  })
  const authJson = await authRes.json()
  const token = authJson.token
  console.log(`[PERF] auth login: ${(performance.now() - tAuthStart).toFixed(1)} ms`)

  if (!token) {
    console.error('Failed to get token:', authJson)
    return
  }

  // 2. Fetch categories and brands
  const tCatStart = performance.now()
  const catRes = await fetch(`${baseUrl}/api/admin/categories`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const catJson = await catRes.json()
  const catId = catJson.categories?.[0]?.id
  console.log(`[PERF] fetch categories: ${(performance.now() - tCatStart).toFixed(1)} ms (found ${catJson.categories?.length})`)

  const tBrandStart = performance.now()
  const brandRes = await fetch(`${baseUrl}/api/admin/brands`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const brandJson = await brandRes.json()
  const brandId = brandJson.brands?.[0]?.id
  console.log(`[PERF] fetch brands: ${(performance.now() - tBrandStart).toFixed(1)} ms (found ${brandJson.brands?.length})`)

  // 3. Test Raw Image Upload (2.4MB)
  const rawImagePath = path.join(__dirname, '..', 'admin', 'public', 'HE color Logo.png')
  const rawBuffer = fs.readFileSync(rawImagePath)
  console.log(`[PERF] raw image file size: ${(rawBuffer.length / 1024 / 1024).toFixed(2)} MB`)

  const tUploadStart = performance.now()
  const formData = new FormData()
  const blob = new Blob([rawBuffer], { type: 'image/png' })
  formData.append('image', blob, 'test-logo.png')

  const uploadRes = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  })
  const uploadJson = await uploadRes.json()
  const uploadDuration = performance.now() - tUploadStart
  console.log(`[PERF] raw image upload duration: ${uploadDuration.toFixed(1)} ms (${(uploadDuration / 1000).toFixed(2)} s)`)
  console.log(`[PERF] uploaded image url: ${uploadJson.url}`)

  // 4. Test Product Creation with Variants
  const tProductStart = performance.now()
  const payload = {
    name: `Perf Test Product ${Date.now()}`,
    description: 'Performance measurement test product',
    category_id: catId,
    brand_id: brandId,
    image: uploadJson.url,
    is_active: false,
    variants: [
      {
        quantity_value: 100,
        quantity_unit: 'ML',
        display_label: '100 ML',
        total_price: 1500,
        price_per_unit: 15,
        is_default: true
      },
      {
        quantity_value: 50,
        quantity_unit: 'ML',
        display_label: '50 ML',
        total_price: 850,
        price_per_unit: 17,
        is_default: false
      }
    ]
  }

  const createRes = await fetch(`${baseUrl}/api/admin/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
  const createJson = await createRes.json()
  const productDuration = performance.now() - tProductStart
  console.log(`[PERF] product API create duration: ${productDuration.toFixed(1)} ms (${(productDuration / 1000).toFixed(2)} s)`)
  console.log(`[PERF] created product ID: ${createJson.product?.id}`)

  // Clean up created test product so we don't pollute DB
  if (createJson.product?.id) {
    await fetch(`${baseUrl}/api/admin/products/${createJson.product.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    console.log(`[PERF] deleted test product`)
  }

  console.log('--- SUMMARY OF BASELINE ---')
  console.log(`Total upload: ${(uploadDuration / 1000).toFixed(2)} s`)
  console.log(`Total product API: ${(productDuration / 1000).toFixed(2)} s`)
  console.log(`Combined: ${((uploadDuration + productDuration) / 1000).toFixed(2)} s`)
}

run().catch(console.error)
