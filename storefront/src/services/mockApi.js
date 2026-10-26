// API-backed data-access layer for the storefront.
// Keeps the same function names used by components/pages, but switches
// from local JSON mocks to real Express backend calls.

import { api } from './api'
import { normalizeCategorySlug } from '../utils/categorySlug'

// ----------------------------------------------------------------------------
// Client-side response cache for catalog reads
// ----------------------------------------------------------------------------
// Products / categories / brands are read-only catalog data that changes only
// when an Admin edits them. Caching them for a short TTL means:
//   • multiple components asking for the same data at once (e.g. the header's
//     brand dropdown and the Shop page both call getBrands on mount) share ONE
//     network request — no duplicate /api/brands calls;
//   • navigating between Home → Shop → Categories within the TTL reuses the
//     already-fetched data instead of refetching the same payload every time.
// The TTL is short (60s) so Admin edits surface within a minute, and callers
// that need a guaranteed fresh read (e.g. the Shop "Try Again" retry) can pass
// { refresh: true } to bypass the cache entirely. Failed requests are never
// cached — the next call retries the network.

const CATALOG_TTL_MS = 60_000
const catalogCache = new Map() // key → { promise, expiresAt }

function cachedCatalogRead(key, loader, { refresh = false } = {}) {
  const now = Date.now()
  const hit = catalogCache.get(key)
  if (!refresh && hit && hit.expiresAt > now) return hit.promise

  // Store the promise immediately so concurrent callers share the in-flight
  // request (dedup). On success the entry gains its TTL; on failure it is
  // removed so the next call retries.
  const promise = loader()
    .then((data) => {
      catalogCache.set(key, { promise, expiresAt: Date.now() + CATALOG_TTL_MS })
      return data
    })
    .catch((err) => {
      catalogCache.delete(key)
      throw err
    })
  catalogCache.set(key, { promise, expiresAt: now + CATALOG_TTL_MS })
  return promise
}

export async function getProducts(options) {
  return cachedCatalogRead('products', async () => (await api.get('/products')).products ?? [], options)
}

export async function getProductById(id, options) {
  return cachedCatalogRead(`product:${id}`, async () => {
    const data = await api.get(`/products/${id}`)
    return data.product ?? data ?? null
  }, options)
}

export async function getProductsByCategory(slug, options) {
  const canonicalSlug = normalizeCategorySlug(slug)
  return cachedCatalogRead(`category-products:${canonicalSlug}`, async () => {
    const categories = await getCategories(options)
    const category = categories.find(
      (item) => normalizeCategorySlug(item.slug) === canonicalSlug
    )
    const apiSlug = category?.slug || slug
    const data = await api.get(`/categories/${encodeURIComponent(apiSlug)}/products`)
    return data.products ?? []
  }, options)
}

export async function getProductsByBrand(slug, options) {
  const resolvedSlug = slug === 'arees-luxury' ? 'oud-al-haramain' : slug
  return cachedCatalogRead(`brand-products:${resolvedSlug}`, async () => {
    const data = await api.get(`/brands/${resolvedSlug}/products`)
    return data.products ?? []
  }, options)
}

export async function getRelatedProducts(product, limit = 4) {
  const data = await api.get(`/products/${product.id}/related?limit=${limit}`)
  return data.products ?? []
}

export async function getCategories(options) {
  return cachedCatalogRead('categories', async () => (await api.get('/categories')).categories ?? [], options)
}

export async function getCategoryBySlug(slug, options) {
  // Backend doesn't have this exact endpoint; fetch categories and find.
  const canonicalSlug = normalizeCategorySlug(slug)
  const categories = await getCategories(options)
  const category = (categories.categories ?? categories).find(
    (item) => normalizeCategorySlug(item.slug) === canonicalSlug
  )
  return category ? { ...category, slug: canonicalSlug } : null
}

export async function getBrands(options) {
  return cachedCatalogRead('brands', async () => (await api.get('/brands')).brands ?? [], options)
}

export async function getBrandBySlug(slug, options) {
  const resolvedSlug = slug === 'arees-luxury' ? 'oud-al-haramain' : slug
  const data = await getBrands(options)
  const brand = (data.brands ?? data).find((b) => b.slug === resolvedSlug || b.slug === slug) ?? null
  if (brand && slug === 'arees-luxury') {
    return { ...brand, name: 'Arees Luxury', slug: 'arees-luxury' }
  }
  return brand
}

export async function submitContactMessage() {
  // Backend currently has /api/orders but not contact endpoints.
  // Returns success to not block UI.
  if (import.meta.env.DEV) {
    console.log('[storefront api] contact message submitted')
  }
  return { success: true }
}

// --- Order tracking ---------------------------------------------------------
// Normalize any Indian mobile input (+91 / 91 / spaces / hyphens / brackets)
// to the bare 10-digit national number. Returns '' when the result is not
// EXACTLY 10 digits.
//   9876543210 | +919876543210 | +91 98765 43210 | 91-9876543210  -> 9876543210
//   123 | 98765432101                                             -> ''
export function normalizeIndianPhone(raw) {
  if (raw == null) return ''
  let s = String(raw).replace(/[\s\-()]/g, '')
  if (s.startsWith('+91')) s = s.slice(3)
  else if (s.startsWith('91') && s.length > 10) s = s.slice(2)
  s = s.replace(/\D/g, '')
  return /^[0-9]{10}$/.test(s) ? s : ''
}

// Normalize a public Order ID: drop a leading '#' (used on the success
// screen) and any surrounding whitespace.
export function normalizeOrderId(raw) {
  return String(raw || '').replace(/^#/, '').trim().toUpperCase()
}

// ONE tracking function — every Track Order UI (desktop AND mobile) calls
// this same function. POST /api/track-order returns { orders: [...] } with an
// empty array when nothing matches.
export async function trackOrder({ type, value }) {
  const data = await api.post('/track-order', { type, value })
  return Array.isArray(data.orders) ? data.orders : []
}

export async function submitOrder(payload) {
  const requestBody = {
    customer_name: payload.name,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    pincode: payload.pincode,
    // Location details discovered from the PIN lookup — the server stores
    // them in the order notes (same optional fields createOrder accepts).
    ...(payload.locality ? { locality: payload.locality } : {}),
    ...(payload.city ? { city: payload.city } : {}),
    ...(payload.state ? { state: payload.state } : {}),
    message: payload.message,
    items: payload.items,
    total_amount: payload.total,
    // Selected payment method (cod | upi) — the server resolves it into the
    // canonical label stored on orders.payment_method. No gateway involved.
    payment_method: payload.paymentMethod,
    idempotency_key: payload.idempotencyKey,
  }

  if (import.meta.env.DEV) {
    console.log(`[submitOrder] Placing order (${requestBody.items?.length || 0} items)`)
  }

  try {
    const res = await api.post('/orders', requestBody)
    const orderNumber = res.order?.order_number ?? res.order_number ?? res.order?.orderNumber
    if (import.meta.env.DEV) {
      console.log(`[submitOrder] Order placed successfully: ${orderNumber || 'OK'}`)
    }
    return {
      success: true,
      orderNumber,
      // Full persisted order row so the success page can show the real
      // total / payment method / status from the database. Only the
      // customer-friendly fields are read — the internal UUID is never used.
      order: res.order ?? null,
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[submitOrder] Failed to place order:', err.message || 'Unknown error')
    }
    // Re-throw with the actual backend error message
    throw new Error(err.message || 'Failed to place order.')
  }
}

