// Vercel serverless function — serves /sitemap.xml (via the /sitemap.xml → /api/sitemap rewrite in vercel.json).
//
// DYNAMIC sitemap: the URL list is generated from the LIVE public API records
// (active products / categories / brands), so new or edited records appear
// without redeploying. The API base URL mirrors storefront/src/services/api.js.
//
// The function must stay under the platform function-duration limit, so the
// upstream fetch is aborted well before that; responses are CDN-cached so
// repeat crawls never re-hit the API (and a cold-started backend only affects
// the very first fetch).

import { buildSitemapXml, resolveSiteUrl } from '../src/utils/seo.js'
import { SITEMAP_CATALOG_FALLBACK } from '../src/data/sitemapCatalog.js'

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://api.areesperfumes.in/api'

// Keep the upstream request inside the platform function timeout.
const FETCH_TIMEOUT_MS = 10000

async function fetchPublicJson(path) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`Upstream ${path} responded ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(req, res) {
  try {
    const baseUrl = resolveSiteUrl(process.env.SITE_URL, req.headers)

    if (req.method === 'HEAD') {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8')
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400')
      return res.status(200).end()
    }

    // Fetch the three datasets independently. If any endpoint is temporarily
    // slow or cold-starting, gracefully fall back to the catalog snapshot so
    // the sitemap NEVER emits a partial or empty URL list.
    const [productsRes, categoriesRes, brandsRes] = await Promise.allSettled([
      fetchPublicJson('/products'),
      fetchPublicJson('/categories'),
      fetchPublicJson('/brands'),
    ])

    const liveProducts =
      productsRes.status === 'fulfilled' &&
      Array.isArray(productsRes.value?.products) &&
      productsRes.value.products.length > 0
        ? productsRes.value.products
        : null

    const liveCategories =
      categoriesRes.status === 'fulfilled' &&
      Array.isArray(categoriesRes.value?.categories) &&
      categoriesRes.value.categories.length > 0
        ? categoriesRes.value.categories
        : null

    const liveBrands =
      brandsRes.status === 'fulfilled' &&
      Array.isArray(brandsRes.value?.brands) &&
      brandsRes.value.brands.length > 0
        ? brandsRes.value.brands
        : null

    const products = liveProducts || SITEMAP_CATALOG_FALLBACK.products || []
    const categories = liveCategories || SITEMAP_CATALOG_FALLBACK.categories || []
    const brands = liveBrands || SITEMAP_CATALOG_FALLBACK.brands || []

    for (const settled of [productsRes, categoriesRes, brandsRes]) {
      if (settled.status === 'rejected') {
        console.warn('sitemap live fetch fallback used:', settled.reason?.message || settled.reason)
      }
    }

    const xml = buildSitemapXml({ baseUrl, products, categories, brands })

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).send(xml)
  } catch (err) {
    console.error('sitemap generation failed:', err)
    res.setHeader('Cache-Control', 'no-store')
    res.status(503).json({ error: 'Sitemap temporarily unavailable. Please retry.' })
  }
}
