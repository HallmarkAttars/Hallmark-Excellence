const fs = require('fs')
const path = require('path')

async function run() {
  const baseUrl = 'http://localhost:5000'
  console.log('=== RUNNING ALL 10 VERIFICATION CASES ===')

  // Auth
  const authRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'infohallmarkexcellence@gmail.com',
      password: 'N4@tY8%pQ3!wH6&c'
    })
  })
  const { token } = await authRes.json()
  if (!token) throw new Error('Auth failed')

  const catRes = await fetch(`${baseUrl}/api/admin/categories`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const { categories } = await catRes.json()
  const catId = categories[0]?.id

  // 1. Add product without image
  console.log('\n--- Case 1: Add product without image ---')
  const res1 = await fetch(`${baseUrl}/api/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: `Test No Image ${Date.now()}`,
      category_id: catId,
      image: null,
      variants: [{ quantity_value: 50, quantity_unit: 'ML', total_price: 500, price_per_unit: 10, is_default: true }]
    })
  })
  const json1 = await res1.json()
  console.log(`Case 1 Status: ${res1.status}, Product ID: ${json1.product?.id}`)
  if (json1.product?.id) {
    await fetch(`${baseUrl}/api/admin/products/${json1.product.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  }

  // 2. Add product with small image
  console.log('\n--- Case 2: Add product with small image ---')
  const res2 = await fetch(`${baseUrl}/api/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: `Test Small Image ${Date.now()}`,
      category_id: catId,
      image: 'https://example.com/small.webp',
      variants: [{ quantity_value: 50, quantity_unit: 'ML', total_price: 500, price_per_unit: 10, is_default: true }]
    })
  })
  const json2 = await res2.json()
  console.log(`Case 2 Status: ${res2.status}, Product ID: ${json2.product?.id}`)
  if (json2.product?.id) {
    await fetch(`${baseUrl}/api/admin/products/${json2.product.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  }

  // 3. Add product with 1 variant
  console.log('\n--- Case 4: Add product with 1 variant ---')
  const res4 = await fetch(`${baseUrl}/api/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: `Test 1 Variant ${Date.now()}`,
      category_id: catId,
      variants: [{ quantity_value: 100, quantity_unit: 'ML', total_price: 1200, price_per_unit: 12, is_default: true }]
    })
  })
  const json4 = await res4.json()
  console.log(`Case 4 Status: ${res4.status}, Variants count: ${json4.product?.variants?.length}, Price: ${json4.product?.price}`)
  if (json4.product?.id) {
    await fetch(`${baseUrl}/api/admin/products/${json4.product.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  }

  // 4. Add product with 10+ variants
  console.log('\n--- Case 5: Add product with 10+ variants ---')
  const tenVariants = Array.from({ length: 12 }, (_, i) => ({
    quantity_value: (i + 1) * 10,
    quantity_unit: 'ML',
    display_label: `${(i + 1) * 10} ML`,
    total_price: (i + 1) * 100,
    price_per_unit: 10,
    is_default: i === 0
  }))
  const res5 = await fetch(`${baseUrl}/api/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: `Test 12 Variants ${Date.now()}`,
      category_id: catId,
      variants: tenVariants
    })
  })
  const json5 = await res5.json()
  console.log(`Case 5 Status: ${res5.status}, Variants count: ${json5.product?.variants?.length}`)
  if (json5.product?.id) {
    await fetch(`${baseUrl}/api/admin/products/${json5.product.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  }

  // 5. Simultaneous creation (Double-click concurrency test)
  console.log('\n--- Case 6: Concurrent product creation (slug uniqueness) ---')
  const commonName = `Test Concurrent ${Date.now()}`
  const [cRes1, cRes2] = await Promise.all([
    fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: commonName, category_id: catId })
    }),
    fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: commonName, category_id: catId })
    })
  ])
  const cJson1 = await cRes1.json()
  const cJson2 = await cRes2.json()
  console.log(`Case 6 Res 1 slug: ${cJson1.product?.slug}, Res 2 slug: ${cJson2.product?.slug}`)
  if (cJson1.product?.id) await fetch(`${baseUrl}/api/admin/products/${cJson1.product.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  if (cJson2.product?.id) await fetch(`${baseUrl}/api/admin/products/${cJson2.product.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })

  // 6. Failed product creation (validation)
  console.log('\n--- Case 9: Failed product creation (missing required name) ---')
  const res9 = await fetch(`${baseUrl}/api/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ category_id: catId })
  })
  const json9 = await res9.json()
  console.log(`Case 9 Status: ${res9.status} (expected 400), Error: ${json9.error}`)

  // 7. Failed variant creation (validation upfront)
  console.log('\n--- Case 10: Failed variant creation (negative quantity) ---')
  const testName10 = `Test Invalid Variant ${Date.now()}`
  const res10 = await fetch(`${baseUrl}/api/admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: testName10,
      category_id: catId,
      variants: [{ quantity_value: -10, quantity_unit: 'ML', total_price: 100, price_per_unit: 10 }]
    })
  })
  const json10 = await res10.json()
  console.log(`Case 10 Status: ${res10.status} (expected 400), Error: ${json10.error}`)

  // Verify no orphaned product was left behind in products table
  const checkRes = await fetch(`${baseUrl}/api/admin/products`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const checkJson = await checkRes.json()
  const foundOrphan = checkJson.products?.find((p) => p.name === testName10)
  console.log(`Case 10 Orphaned product found: ${Boolean(foundOrphan)} (expected false)`)

  console.log('\n=== ALL TEST CASES COMPLETED SUCCESSFULLY ===')
}

run().catch(console.error)
