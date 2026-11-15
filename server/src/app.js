require('dotenv').config()
// Local-only secrets (server/.env.local — gitignored) override .env so admin
// credentials never live in a committed file. Missing file = no-op.
require('dotenv').config({ path: '.env.local', override: true })

const express = require('express')
const cors = require('cors')

const productsRoutes = require('./routes/products.routes')
const categoriesRoutes = require('./routes/categories.routes')
const brandsRoutes = require('./routes/brands.routes')
const ordersRoutes = require('./routes/orders.routes')
const authRoutes = require('./routes/auth.routes')
const uploadRoutes = require('./routes/upload.routes')
const reviewsRoutes = require('./routes/reviews.routes')
const webhookRoutes = require('./routes/webhook.routes')
const { getAutoMigrationStatus } = require('./utils/autoMigrations')

const app = express()

// --- Trust proxy ----------------------------------------------------------
// Render (and Vercel) sit behind one trusted proxy that appends the REAL
// client IP to X-Forwarded-For. With trust proxy = 1, req.ip resolves to that
// real IP — required for the rate limiters' per-IP keys to be unspoofable.
// (Clients can still SEND X-Forwarded-For headers; trust proxy makes Express
// use the rightmost untrusted value appended by the proxy, ignoring them.)
app.set('trust proxy', 1)

// --- Security headers -----------------------------------------------------
// The API is JSON-only, so a restrictive default-src is safe. CORP stays
// cross-origin because the storefront/admin call this host from another
// origin (CORS still controls which origins may read the response).
app.disable('x-powered-by')
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  }
  next()
})

// --- CORS -------------------------------------------------------------
// Only the storefront and admin origins configured in .env may call this API.
// Both storefront host variants (apex + www) are allowed explicitly so the
// browser works no matter which host the visitor uses; env vars remain the
// source of truth for custom/local deployments.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://areesperfumes.in',
  'https://www.areesperfumes.in',
  'https://admin3210.areesperfumes.in',
  process.env.ADMIN_URL,
  'https://admin3210.areesperfumes.in',
].filter(Boolean)

// Vercel preview deployments get random subdomains (e.g.
// my-app-git-fix-1a2b3c.vercel.app) that aren't in .env. They are OPT-IN:
// previews are untrusted build output, so production stays locked to the
// configured origins unless ALLOW_VERCEL_PREVIEWS=true is set explicitly.
let allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true'
let vercelPreviewPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/
if (process.env.VERCEL_PREVIEW_PATTERN) {
  try {
    vercelPreviewPattern = new RegExp(process.env.VERCEL_PREVIEW_PATTERN)
  } catch (err) {
    allowVercelPreviews = false
    console.error('Invalid VERCEL_PREVIEW_PATTERN — Vercel previews stay disabled.', err.message)
  }
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (curl, server-to-server, no Origin header)
      if (!origin) return callback(null, true)

      // Allow any of the configured origins (FRONTEND_URL / ADMIN_URL)
      if (allowedOrigins.includes(origin)) return callback(null, true)

      // Allow Vercel previews only when explicitly enabled.
      if (allowVercelPreviews && vercelPreviewPattern.test(origin)) return callback(null, true)

      // In dev, allow any localhost:port origin (handles --host 0.0.0.0)
      if (/^https?:\/\/localhost:\d+$/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
        return callback(null, true)
      }

      return callback(new Error('Not allowed by CORS'))
    },
  })
)


// Capture the raw JSON bytes so the Meta webhook can be forwarded with its
// original X-Hub-Signature-256 intact (the signature covers the exact bytes).
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }))

// --- Health check -------------------------------------------------------
app.get('/api/health', (req, res) => {
  // Public endpoint: expose health + a coarse migration state, never raw
  // database error text (it can reveal schema/role details).
  const migrations = getAutoMigrationStatus()
  res.json({
    status: 'ok',
    commit: (process.env.RENDER_GIT_COMMIT || 'local').slice(0, 7),
    sell_exact_pieces_schema: migrations.sell_exact_pieces_schema,
  })
})

// --- Routes --------------------------------------------------------------
app.use('/api', productsRoutes)
app.use('/api', categoriesRoutes)
app.use('/api', brandsRoutes)
app.use('/api', ordersRoutes)
app.use('/api/auth', authRoutes)
app.use('/api', uploadRoutes)
app.use('/api', reviewsRoutes)
app.use('/webhook', webhookRoutes)
app.use('/api/webhook', webhookRoutes)

// --- 404 fallback ---------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' })
})

// --- Global error handler ---------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

module.exports = app
