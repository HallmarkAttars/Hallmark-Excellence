// Local preview gateway (development only).
//
// The real Express backend needs SUPABASE_URL / SUPABASE_SERVICE_KEY, which
// are not present in this checkout. This gateway lets the storefront and admin
// run locally against the live catalog without those secrets:
//
//   - /api/auth/*  handled locally (ADMIN_USERNAME / ADMIN_PASSWORD from
//                  server/.env.local). Tokens are real HS256 JWTs.
//   - GET catalog / admin read routes are proxied to the live API so all
//                  product details load.
//   - every write is rejected (read-only) so a preview can never mutate the
//                  production database.
//
// It uses only Node built-ins (Node 18+). Run: node scripts/dev-preview-server.js

const http = require('http')
const https = require('https')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

function loadEnvFile(file) {
  try {
    const text = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match) continue
      const [, key, raw] = match
      if (process.env[key] === undefined) {
        process.env[key] = raw.replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // missing file is fine
  }
}

// .env.local wins over .env (matches the real server's dotenv override order).
loadEnvFile('.env')
loadEnvFile('.env.local')

const PORT = Number(process.env.PORT || 5000)
const UPSTREAM = process.env.PREVIEW_UPSTREAM || 'https://api.areesperfumes.in'
const SECRET = process.env.JWT_SECRET || 'dev-preview-only-secret'
const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''
const ADMIN_ID = '00000000-0000-4000-8000-000000000001'

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('ADMIN_USERNAME / ADMIN_PASSWORD must be set in server/.env.local')
  process.exit(1)
}

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function signToken(admin) {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({ ...admin, iat: now, exp: now + 7 * 24 * 60 * 60 })
  )
  const body = `${header}.${payload}`
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64')
  return `${body}.${sig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}

function verifyToken(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, sig] = parts
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null
    return data
  } catch {
    return null
  }
}

const ADMIN_PROFILE = {
  id: ADMIN_ID,
  email: ADMIN_USERNAME,
  name: 'Administrator',
  role: 'admin',
}

function send(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  })
  res.end(body)
}

function corsHeaders(req) {
  const origin = req.headers.origin
  const ok =
    !origin ||
    /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
    origin.startsWith('https://')
  return {
    'Access-Control-Allow-Origin': ok && origin ? origin : '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => (raw += chunk))
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve({})
      }
    })
  })
}

function upstreamFetch(targetPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(targetPath, UPSTREAM)
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: { Accept: 'application/json' },
        timeout: 30000,
      },
      (upstream) => {
        let raw = ''
        upstream.on('data', (chunk) => (raw += chunk))
        upstream.on('end', () =>
          resolve({ status: upstream.statusCode, type: upstream.headers['content-type'], body: raw })
        )
      }
    )
    req.on('timeout', () => req.destroy(new Error('upstream timeout')))
    req.on('error', reject)
    req.end()
  })
}

async function proxy(res, targetPath) {
  try {
    const result = await upstreamFetch(targetPath)
    res.writeHead(result.status, {
      'Content-Type': result.type || 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(result.body),
    })
    res.end(result.body)
  } catch (err) {
    send(res, 502, { error: `Upstream catalog unavailable: ${err.message}` })
  }
}

async function stats(res) {
  try {
    const result = await upstreamFetch('/api/products')
    const products = JSON.parse(result.body).products || []
    const revenue = 0
    send(res, 200, {
      total_products: products.length,
      total_orders: 0,
      total_customers: 0,
      total_revenue: revenue,
      recent_orders: [],
    })
  } catch (err) {
    send(res, 502, { error: `Upstream catalog unavailable: ${err.message}` })
  }
}

const server = http.createServer(async (req, res) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    return res.end()
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = url.pathname

  if (pathname === '/api/health') {
    return send(res, 200, { status: 'ok', mode: 'local-preview' }, cors)
  }

  // --- Auth (local) ------------------------------------------------------
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const { email, password } = await readBody(req)
    const normalized = String(email || '').trim().toLowerCase()
    if (normalized !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return send(res, 401, { error: 'Invalid email or password.' }, cors)
    }
    const token = signToken(ADMIN_PROFILE)
    return send(res, 200, { token, admin: ADMIN_PROFILE }, cors)
  }

  if (
    (pathname === '/api/auth/verify' || pathname === '/api/auth/refresh') &&
    (req.method === 'GET' || req.method === 'POST')
  ) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    const admin = verifyToken(token)
    if (!admin) {
      return send(res, 401, { error: 'Invalid or expired token.' }, cors)
    }
    return send(
      res,
      200,
      {
        token: signToken(ADMIN_PROFILE),
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      },
      cors
    )
  }

  if (pathname.startsWith('/api/auth/')) {
    return send(res, 404, { error: 'Not found.' }, cors)
  }

  // --- Admin routes (require local token) --------------------------------
  if (pathname.startsWith('/api/admin/')) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!verifyToken(token)) {
      return send(res, 401, { error: 'Unauthorized.' }, cors)
    }

    if (req.method !== 'GET') {
      return send(
        res,
        403,
        { error: 'Local preview is read-only. Connect Supabase to enable edits.' },
        cors
      )
    }

    if (pathname === '/api/admin/stats') return stats(res)
    if (pathname === '/api/admin/orders') return send(res, 200, { orders: [] }, cors)
    if (/^\/api\/admin\/orders\/[^/]+$/.test(pathname)) {
      return send(res, 404, { error: 'Order not found in local preview.' }, cors)
    }
    if (pathname === '/api/admin/products') return proxy(res, '/api/products')
    if (/^\/api\/admin\/products\/[^/]+$/.test(pathname)) {
      return proxy(res, `/api/products/${pathname.split('/').pop()}`)
    }
    if (pathname === '/api/admin/categories') return proxy(res, '/api/categories')
    if (pathname === '/api/admin/brands') return proxy(res, '/api/brands')
    return send(res, 404, { error: 'Not found.' }, cors)
  }

  // --- Public catalog (read-only) ----------------------------------------
  if (!pathname.startsWith('/api/')) {
    return send(res, 404, { error: 'Not found.' }, cors)
  }

  if (req.method !== 'GET') {
    return send(
      res,
      403,
      { error: 'Local preview is read-only. Connect Supabase to enable writes.' },
      cors
    )
  }

  return proxy(res, pathname + url.search)
})

server.listen(PORT, () => {
  console.log(`Local preview gateway listening on http://localhost:${PORT}`)
  console.log(`Catalog upstream: ${UPSTREAM}`)
  console.log('Admin login comes from server/.env.local')
})
