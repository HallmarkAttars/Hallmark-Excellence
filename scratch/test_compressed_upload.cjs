const fs = require('fs')
const path = require('path')

async function run() {
  const baseUrl = 'http://localhost:5000'

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

  // Use a smaller image (Hero.webp is 300KB)
  const heroPath = path.join(__dirname, '..', 'storefront', 'public', 'Hero.webp')
  const heroBuffer = fs.readFileSync(heroPath)
  console.log(`[TEST] Hero.webp size: ${(heroBuffer.length / 1024).toFixed(1)} KB`)

  const t1 = performance.now()
  const formData = new FormData()
  formData.append('image', new Blob([heroBuffer], { type: 'image/webp' }), 'hero.webp')

  const res1 = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  })
  const json1 = await res1.json()
  const d1 = performance.now() - t1
  console.log(`[TEST] 300KB upload duration: ${d1.toFixed(1)} ms (${(d1/1000).toFixed(2)} s)`)

  // Let's also test a 50KB image
  // Create a 100x100 simple JPEG or smaller buffer
  // We can test storefront public small images or favicon
  const logoPath = path.join(__dirname, '..', 'storefront', 'public', 'HE white Logo.png')
  if (fs.existsSync(logoPath)) {
    const buf = fs.readFileSync(logoPath)
    console.log(`[TEST] HE white Logo size: ${(buf.length / 1024).toFixed(1)} KB`)
    const t2 = performance.now()
    const fd2 = new FormData()
    fd2.append('image', new Blob([buf], { type: 'image/png' }), 'logo.png')
    const res2 = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd2
    })
    const json2 = await res2.json()
    const d2 = performance.now() - t2
    console.log(`[TEST] logo upload duration: ${d2.toFixed(1)} ms (${(d2/1000).toFixed(2)} s)`)
  }
}

run().catch(console.error)
