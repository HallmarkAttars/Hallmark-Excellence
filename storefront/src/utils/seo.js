// ============================================================================
// SEO helpers — sitemap.xml / robots.txt generation
//
// Pure functions shared by the Vercel serverless functions (api/sitemap.js and
// api/robots.js). Kept free of any browser/DOM or Vercel API surface so they
// are trivially unit-testable and safe to import from both the functions and
// the vitest suite.
//
// The sitemap is DYNAMIC: it is built from the live records returned by the
// public API (/api/products, /api/categories, /api/brands — active records
// only), so new/edited products, brands and categories appear automatically
// without touching the storefront code.
// ============================================================================

// --------------------------------------------------------------------------
// Site URL resolution
// --------------------------------------------------------------------------
// The production domain is NOT hardcoded anywhere in the project, so the
// canonical base URL is resolved at request time:
//   1. SITE_URL env var (set in the Vercel project settings) wins when present
//      — this is the way to pin a fixed canonical domain.
//   2. Otherwise the request's own host is used (x-forwarded-host, which
//      Vercel always sets), so the custom domain AND *.vercel.app previews
//      always emit URLs for the domain the request actually arrived on.
//      Production hosts are never localhost, so no localhost URL can leak.
// Throws when neither is available (never happens on Vercel).
export function resolveSiteUrl(siteUrl, headers = {}) {
  if (siteUrl) return String(siteUrl).replace(/\/+$/, '')
  const proto = headers['x-forwarded-proto'] || 'https'
  const host = headers['x-forwarded-host'] || headers['host']
  if (!host) throw new Error('Cannot resolve the site URL: no host header and no SITE_URL configured.')
  return `${proto}://${host}`
}

// --------------------------------------------------------------------------
// XML escaping
// --------------------------------------------------------------------------
export function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ISO date (YYYY-MM-DD) from a created_at timestamp, or null when absent.
function lastmodFromTimestamp(createdAt) {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(String(createdAt ?? ''))
  return match ? match[0] : null
}

// --------------------------------------------------------------------------
// Sitemap
// --------------------------------------------------------------------------
// Public indexable pages only. The transactional / private routes (/cart,
// /checkout, /view-order) are deliberately NOT included.
export const STATIC_PAGES = ['/', '/shop', '/categories', '/about', '/contact', '/track-order']

// Build the full sitemap.xml document from DB-shaped records:
//   categories: { slug, created_at }
//   brands:     { slug, created_at }
//   products:   { id, created_at }
// Rows without a usable slug/id are skipped (never emit broken URLs).
export function buildSitemapXml({ baseUrl, pages = STATIC_PAGES, categories = [], brands = [], products = [] }) {
  const base = String(baseUrl || '').replace(/\/+$/, '')

  const entries = []
  for (const path of pages) {
    entries.push({ loc: `${base}${path}` })
  }
  for (const category of categories) {
    if (!category?.slug) continue
    entries.push({ loc: `${base}/categories/${category.slug}`, lastmod: lastmodFromTimestamp(category.created_at) })
  }
  for (const brand of brands) {
    if (!brand?.slug) continue
    entries.push({ loc: `${base}/brand/${brand.slug}`, lastmod: lastmodFromTimestamp(brand.created_at) })
  }
  for (const product of products) {
    if (!product?.id) continue
    entries.push({ loc: `${base}/product/${product.id}`, lastmod: lastmodFromTimestamp(product.created_at) })
  }

  const body = entries
    .map(({ loc, lastmod }) => {
      const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
      return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmodTag}\n  </url>`
    })
    .join('\n')

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${body}\n` +
    '</urlset>'
  )
}

// --------------------------------------------------------------------------
// Robots
// --------------------------------------------------------------------------
// Allow crawling of all public pages; block only the routes that do not exist
// publicly or must not be indexed. Disallowed paths reflect the storefront's
// ACTUAL routes (see App.jsx): /cart and /checkout are transactional,
// /view-order exposes a specific order's details, and /api/ + /admin/ guard
// the API surface. No /login, /register, /account or /search rules exist
// because those routes do not exist in this app.
export function buildRobotsTxt(baseUrl) {
  const base = String(baseUrl || '').replace(/\/+$/, '')
  return [
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /api/',
    'Disallow: /admin/',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /view-order',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n')
}
