// API-backed data-access layer for the storefront.
// Keeps the same function names used by components/pages, but switches
// from local JSON mocks to real Express backend calls.

import { api } from './api'

export async function getProducts() {
  // Backend currently exposes products through /api/products
  // (ensure you have products.routes.js wired).
  return (await api.get('/api/products')).products ?? []
}

export async function getProductById(id) {
  const data = await api.get(`/api/products/${id}`)
  return data.product ?? data ?? null
}

export async function getProductsByCategory(slug) {
  const data = await api.get(`/api/categories/${slug}/products`)
  return data.products ?? []
}

export async function getProductsByBrand(slug) {
  const data = await api.get(`/api/brands/${slug}/products`)
  return data.products ?? []
}

export async function getRelatedProducts(product, limit = 4) {
  const data = await api.get(`/api/products/${product.id}/related?limit=${limit}`)
  return data.products ?? []
}

export async function getCategories() {
  const data = await api.get('/api/categories')
  return data.categories ?? []
}

export async function getCategoryBySlug(slug) {
  // Backend doesn’t have this exact endpoint; fetch categories and find.
  const data = await api.get('/api/categories')
  return (data.categories ?? []).find((c) => c.slug === slug) ?? null
}

export async function getBrands() {
  const data = await api.get('/api/brands')
  return data.brands ?? []
}

export async function getBrandBySlug(slug) {
  const data = await api.get('/api/brands')
  return (data.brands ?? []).find((b) => b.slug === slug) ?? null
}

export async function submitContactMessage(payload) {
  // Backend currently has /api/orders but not contact endpoints.
  // Keep logging for now; will return success to not block UI.
  // If you add /api/contact later, update this function.
  console.log('[storefront api] contact payload:', payload)
  return { success: true }
}

// GET /api/orders/track — secure customer order lookup. The backend requires
// BOTH the order number and the customer's phone to match; it never returns
// other customers' orders or full internal records.
export async function trackOrder(orderId, phone) {
  const params = new URLSearchParams({ order_id: orderId, phone })
  const data = await api.get(`/api/orders/track?${params.toString()}`)
  return data.order ?? null
}

export async function submitOrder(payload) {
  const requestBody = {
    customer_name: payload.name,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    pincode: payload.pincode,
    message: payload.message,
    items: payload.items,
    total_amount: payload.total,
    idempotency_key: payload.idempotencyKey,
  }

  console.log('[submitOrder] Sending payload:', JSON.stringify(requestBody, null, 2))

  try {
    const res = await api.post('/api/orders', requestBody)
    console.log('[submitOrder] Response:', JSON.stringify(res, null, 2))
    return {
      success: true,
      orderNumber: res.order?.order_number ?? res.order_number ?? res.order?.orderNumber,
      // Full persisted order row so the success page can show the real
      // total / payment method / status from the database. Only the
      // customer-friendly fields are read — the internal UUID is never used.
      order: res.order ?? null,
    }
  } catch (err) {
    // Log the real error in development while keeping the user-facing message.
    console.error('[submitOrder] Error:', err.message)
    console.error('[submitOrder] Error code:', err.code)
    console.error('[submitOrder] Error detail:', err.detail)
    console.error('[submitOrder] Error hint:', err.hint)
    // Re-throw with the actual backend error message
    throw new Error(err.message || 'Failed to place order.')
  }
}

