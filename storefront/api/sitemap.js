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

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://api.areesperfumes.in/api'

// Keep the upstream request well inside the platform function timeout.
const FETCH_TIMEOUT_MS = 8000

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

    // Fetch the three datasets independently: a single failing endpoint (e.g. a
    // cold-started backend timing out) must not 503 the whole sitemap — a
    // partial sitemap with the datasets that DID load is strictly better than
    // none. Any fetch errors are logged below.
    const [productsRes, categoriesRes, brandsRes] = await Promise.allSettled([
      fetchPublicJson('/products'),
      fetchPublicJson('/categories'),
      fetchPublicJson('/brands'),
    ])

    const products = productsRes.status === 'fulfilled' ? productsRes.value.products : []
    const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value.categories : []
    const brands = brandsRes.status === 'fulfilled' ? brandsRes.value.brands : []

    for (const settled of [productsRes, categoriesRes, brandsRes]) {
      if (settled.status === 'rejected') console.error('sitemap upstream fetch failed:', settled.reason)
    }

    const xml = buildSitemapXml({ baseUrl, products, categories, brands })

    // A fully empty sitemap (every upstream failed) is not useful — surface a
    // retryable error instead of an empty urlset.
    if (!products.length && !categories.length && !brands.length) {
      throw new Error('All sitemap data sources failed.')
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).send(xml)
  } catch (err) {
    console.error('sitemap generation failed:', err)
    res.setHeader('Cache-Control', 'no-store')
    res.status(503).json({ error: 'Sitemap temporarily unavailable. Please retry.' })
  }
}
