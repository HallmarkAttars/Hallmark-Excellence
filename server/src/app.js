require('dotenv').config()

const express = require('express')
const cors = require('cors')

const productsRoutes = require('./routes/products.routes')
const categoriesRoutes = require('./routes/categories.routes')
const brandsRoutes = require('./routes/brands.routes')
const ordersRoutes = require('./routes/orders.routes')
const authRoutes = require('./routes/auth.routes')
const uploadRoutes = require('./routes/upload.routes')
const employeesRoutes = require('./routes/employees.routes')

const app = express()

// --- Trust proxy ----------------------------------------------------------
// Render (and Vercel) sit behind one trusted proxy that appends the REAL
// client IP to X-Forwarded-For. With trust proxy = 1, req.ip resolves to that
// real IP — required for the rate limiters' per-IP keys to be unspoofable.
// (Clients can still SEND X-Forwarded-For headers; trust proxy makes Express
// use the rightmost untrusted value appended by the proxy, ignoring them.)
app.set('trust proxy', 1)

// --- CORS -------------------------------------------------------------
// Only the storefront and admin origins configured in .env may call this API.
const allowedOrigins = [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean)

// Vercel preview deployments get random subdomains (e.g.
// my-app-git-fix-1a2b3c.vercel.app) that aren't in .env. Allow any
// *.vercel.app origin so every storefront/admin deployment — including
// previews — can always reach the API without reconfiguring env vars.
const isVercelOrigin = /^https:\/\/[a-z0-9-]+\.vercel\.app$/

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (curl, server-to-server, no Origin header)
      if (!origin) return callback(null, true)

      // Allow any of the configured origins (FRONTEND_URL / ADMIN_URL)
      if (allowedOrigins.includes(origin)) return callback(null, true)

      // Allow any Vercel-hosted storefront/admin deployment (incl. previews)
      if (isVercelOrigin.test(origin)) return callback(null, true)

      // In dev, allow any localhost:port origin (handles --host 0.0.0.0)
      if (/^https?:\/\/localhost:\d+$/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
        return callback(null, true)
      }

      return callback(new Error('Not allowed by CORS'))
    },
  })
)


app.use(express.json())

// --- Health check -------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// --- Routes --------------------------------------------------------------
app.use('/api', productsRoutes)
app.use('/api', categoriesRoutes)
app.use('/api', brandsRoutes)
app.use('/api', ordersRoutes)
app.use('/api/auth', authRoutes)
app.use('/api', uploadRoutes)
app.use('/api', employeesRoutes)

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
