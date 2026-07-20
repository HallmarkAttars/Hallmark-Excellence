require('dotenv').config()

const express = require('express')
const cors = require('cors')

const productsRoutes = require('./routes/products.routes')
const categoriesRoutes = require('./routes/categories.routes')
const brandsRoutes = require('./routes/brands.routes')
const ordersRoutes = require('./routes/orders.routes')
const authRoutes = require('./routes/auth.routes')
const uploadRoutes = require('./routes/upload.routes')

const app = express()

// --- CORS -------------------------------------------------------------
// Only the storefront and admin origins configured in .env may call this API.
const allowedOrigins = [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (curl, server-to-server, no Origin header)
      if (!origin) return callback(null, true)

      // In dev, your frontend ports may shift (5173/5174/5175...).
      // If no explicit allowlist is provided, fall back to allowing localhost.
      if (allowedOrigins.length === 0) {
        if (/^https?:\/\/localhost:\d+$/.test(origin) || /^https?:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
          return callback(null, true)
        }
        return callback(new Error('Not allowed by CORS'))
      }

      if (allowedOrigins.includes(origin)) return callback(null, true)
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
