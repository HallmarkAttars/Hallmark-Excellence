// API-backed data-access layer for the admin app.
// Keeps the same function names used by admin pages, but talks to the
// real Express backend (Supabase + Cloudinary behind it).

import { adminApi } from './api'

function readToken() {
  try {
    const raw = localStorage.getItem('ad_admin_token')
    return raw || null
  } catch {
    return null
  }
}

// --- Products ------------------------------------------------------------
// Admin views must see ALL products (active + inactive), so these hit the
// /api/admin/* routes rather than the public /api/products ones.
export async function getProducts() {
  const data = await adminApi.get('/api/admin/products', readToken())
  return data.products ?? []
}

export async function getProductsByBrand(brandSlug) {
  // The admin brand pages still want every product for that brand
  // (including inactive ones), so filter the full admin list client-side
  // rather than using the public brand-products endpoint.
  const all = await getProducts()
  return all.filter((p) => p.brand_slug === brandSlug)
}

export async function getProduct(id) {
  const data = await adminApi.get(`/api/admin/products/${id}`, readToken())
  return data.product ?? data ?? null
}

export async function createProduct(data) {
  const res = await adminApi.post('/api/admin/products', data, readToken())
  return res.product ?? res ?? null
}

export async function updateProduct(id, data) {
  const res = await adminApi.patch(`/api/admin/products/${id}`, data, readToken())
  return res.product ?? res ?? null
}

export async function deleteProduct(id) {
  await adminApi.del(`/api/admin/products/${id}`, readToken())
  return { success: true }
}

// Toggles is_active on a product. Needs the product's current state since
// the backend only exposes a plain PATCH, not a dedicated toggle route.
export async function toggleProductStatus(id, currentIsActive) {
  const res = await adminApi.patch(`/api/admin/products/${id}`, { is_active: !currentIsActive }, readToken())
  return res.product ?? res ?? null
}

// Uploads an image file to Cloudinary via the backend and returns the
// secure_url to store on a product/category.
export async function uploadImage(file) {
  const res = await adminApi.upload('/api/upload', file, readToken())
  return res.url
}

// --- Categories ------------------------------------------------------------
export async function getCategories() {
  const data = await adminApi.get('/api/admin/categories', readToken())
  return data.categories ?? []
}

export async function createCategory(data) {
  const res = await adminApi.post('/api/admin/categories', data, readToken())
  return res.category ?? res ?? null
}

export async function updateCategory(id, data) {
  const res = await adminApi.patch(`/api/admin/categories/${id}`, data, readToken())
  return res.category ?? res ?? null
}

export async function deleteCategory(id) {
  await adminApi.del(`/api/admin/categories/${id}`, readToken())
  return { success: true }
}

// --- Brands ------------------------------------------------------------------
export async function getBrands() {
  const data = await adminApi.get('/api/brands', readToken())
  return data.brands ?? []
}

// --- Orders ------------------------------------------------------------------
export async function getOrders() {
  const data = await adminApi.get('/api/admin/orders', readToken())
  return data.orders ?? []
}

export async function getOrder(id) {
  const data = await adminApi.get(`/api/admin/orders/${id}`, readToken())
  return data.order ?? data ?? null
}

export async function updateOrderStatus(id, status) {
  const res = await adminApi.patch(`/api/admin/orders/${id}/status`, { status }, readToken())
  return res.order ?? res ?? null
}

export async function deleteOrder(id) {
  await adminApi.del(`/api/admin/orders/${id}`, readToken())
  return { success: true }
}

// --- Dashboard stats ---------------------------------------------------------
export async function getDashboardStats() {
  const data = await adminApi.get('/api/admin/stats', readToken())
  return {
    totalProducts: data.total_products,
    totalOrders: data.total_orders,
    totalCustomers: data.total_customers,
    revenue: data.total_revenue,
    recentOrders: data.recent_orders ?? [],
  }
}

// --- Auth ----------------------------------------------------------------
export async function login(email, password) {
  try {
    const res = await adminApi.post('/api/auth/login', { email, password })
    const token = res.token
    if (token) {
      localStorage.setItem('ad_admin_token', token)
    }
    return { success: Boolean(token), token, admin: res.admin ?? null }
  } catch (err) {
    return { success: false, message: err.message || 'Invalid email or password.' }
  }
}

// Confirms a stored token is still valid (called on app load/refresh).
// Returns a tagged result so the caller can distinguish:
//   'valid'   → token accepted, session is good
//   'invalid' → token definitively rejected (expired/revoked) → real logout
//   'error'   → transient failure (network blip, backend cold start, 5xx) →
//               keep the stored session; a genuine 401 later still logs out
//   'none'    → no token stored
export async function verifyToken() {
  const token = readToken()
  if (!token) return { status: 'none' }
  try {
    const res = await adminApi.get('/api/auth/verify', token)
    return { status: 'valid', admin: res.admin ?? null }
  } catch (err) {
    return { status: err?.status === 401 ? 'invalid' : 'error' }
  }
}
