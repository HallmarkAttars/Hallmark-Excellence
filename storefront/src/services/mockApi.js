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

export async function submitOrder(payload) {
  // Backend expects: customer_name, phone, address, pincode, message, items, total_amount
  const res = await api.post('/api/orders', {
    customer_name: payload.name,
    phone: payload.phone,
    address: payload.address,
    pincode: payload.pincode,
    message: payload.message,
    items: payload.items,
    total_amount: payload.total,
  })

  return { success: true, orderNumber: res.order?.order_number ?? res.order_number ?? res.order?.orderNumber }
}

