// ============================================================================
// SEO helpers — sitemap.xml / robots.txt generation & Schema.org JSON-LD builders
//
// Pure functions shared by:
//   - Vercel serverless functions (api/sitemap.js and api/robots.js)
//   - Storefront SEO component (src/components/seo/SEO.jsx)
//   - Unit tests (src/utils/seo.test.js)
//
// Kept free of any direct DOM manipulation so they are 100% unit-testable.
// ============================================================================

import { isProductInStock } from './stock'

// --------------------------------------------------------------------------
// Canonical domain & Brand Identity
// --------------------------------------------------------------------------
// ONE canonical storefront domain: the apex (https://areesperfumes.in).
export const CANONICAL_ORIGIN = 'https://areesperfumes.in'
export const DEFAULT_BRAND = 'Arees Perfumes'
export const DEFAULT_TITLE = 'Arees Perfumes | Premium Attars, Oud & Fragrances in Chennai'
export const DEFAULT_DESCRIPTION =
  'Discover Arees Perfumes and premium attars, oud, musk and traditional fragrances. Shop authentic perfume oils and fragrances with delivery across India.'
export const DEFAULT_OG_IMAGE = `${CANONICAL_ORIGIN}/Hero.webp`

const WWW_HOST = 'www.areesperfumes.in'
const APEX_HOST = 'areesperfumes.in'

function normalizeHost(host) {
  return String(host).toLowerCase() === WWW_HOST ? APEX_HOST : host
}

// --------------------------------------------------------------------------
// Site URL resolution
// --------------------------------------------------------------------------
export function resolveSiteUrl(siteUrl, headers = {}) {
  if (siteUrl) {
    const normalized = String(siteUrl).replace(
      /^https?:\/\/www\.areesperfumes\.in(?=(\/|$))/i,
      CANONICAL_ORIGIN
    )
    return normalized.replace(/\/+$/, '')
  }
  const proto = headers['x-forwarded-proto'] || 'https'
  const host = String(headers['x-forwarded-host'] || headers['host'] || '').split(',')[0].trim()
  if (!host) throw new Error('Cannot resolve the site URL: no host header and no SITE_URL configured.')
  return `${proto}://${normalizeHost(host)}`
}

// --------------------------------------------------------------------------
// XML escaping & lastmod formatting
// --------------------------------------------------------------------------
export function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function lastmodFromTimestamp(createdAt) {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(String(createdAt ?? ''))
  return match ? match[0] : null
}

// --------------------------------------------------------------------------
// Sitemap
// --------------------------------------------------------------------------
// Public indexable commercial pages only.
// Utility/transactional routes (/cart, /checkout, /track-order, /view-order)
// are deliberately NOT included in sitemap.
export const STATIC_PAGES = ['/', '/shop', '/categories', '/about', '/contact']

export function buildSitemapXml({ baseUrl, pages = STATIC_PAGES, categories = [], brands = [], products = [] }) {
  const base = String(baseUrl || CANONICAL_ORIGIN).replace(/\/+$/, '')

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
export function buildRobotsTxt(baseUrl) {
  const base = String(baseUrl || CANONICAL_ORIGIN).replace(/\/+$/, '')
  return [
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /api/',
    'Disallow: /admin/',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /track-order',
    'Disallow: /view-order',
    'Disallow: /account',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n')
}

// --------------------------------------------------------------------------
// Schema.org JSON-LD Structured Data Builders
// --------------------------------------------------------------------------

// 1. Organization Schema
export function buildOrganizationSchema(origin = CANONICAL_ORIGIN) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Arees Perfumes',
    alternateName: ['Arees & Dahab', 'Hallmark of Excellence'],
    url: origin,
    logo: `${origin}/HE%20color%20Logo.png`,
    email: 'hikmaexports@gmail.com',
    telephone: '+919840750467',
    sameAs: ['https://www.instagram.com/aree___s?igsh=a2sxMHk4NzN2bDdo'],
  }
}

// 2. WebSite Schema (SearchAction ready)
export function buildWebSiteSchema(origin = CANONICAL_ORIGIN) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Arees Perfumes',
    url: origin,
    description: DEFAULT_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: 'Arees Perfumes',
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/HE%20color%20Logo.png`,
      },
    },
  }
}

// 3. LocalBusiness Schema (Exact Chennai location from BUSINESS)
export function buildLocalBusinessSchema(origin = CANONICAL_ORIGIN) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${origin}/#localbusiness`,
    name: 'Arees Perfumes',
    alternateName: 'Arees Attars & Perfumes',
    image: `${origin}/Hero.webp`,
    url: origin,
    telephone: '+919840750467',
    email: 'hikmaexports@gmail.com',
    priceRange: '₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '83 & 84, Moore St, Mannadi, George Town',
      addressLocality: 'Chennai',
      addressRegion: 'Tamil Nadu',
      postalCode: '600001',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 13.0927,
      longitude: 80.2872,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '21:00',
      },
    ],
  }
}

// 4. Product Schema (with Binary Stock Availability: InStock / OutOfStock)
export function buildProductSchema(product, origin = CANONICAL_ORIGIN) {
  if (!product) return null

  const inStock = isProductInStock(product)
  const availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  const brandName = product.brand_name || 'Arees Perfumes'
  const price = Number(product.price || 0)
  const productUrl = `${origin}/product/${product.id}`

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image ? [product.image] : [`${origin}/Hero.webp`],
    description:
      product.description ||
      `Shop ${product.name} from Arees Perfumes. Pure, long-lasting attar crafted with excellence in Chennai.`,
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    category: product.category_name || 'Attars',
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'INR',
      price: price > 0 ? price : 0,
      availability,
      itemCondition: 'https://schema.org/NewCondition',
    },
  }

  if (product.rating != null && Number(product.rating) > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.rating),
      reviewCount: Math.max(1, Number(product.review_count || 1)),
    }
  }

  return schema
}

// 5. BreadcrumbList Schema
export function buildBreadcrumbsSchema(crumbs = [], origin = CANONICAL_ORIGIN) {
  if (!Array.isArray(crumbs) || crumbs.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => {
      const itemUrl = crumb.path.startsWith('http')
        ? crumb.path
        : `${origin}${crumb.path.startsWith('/') ? crumb.path : `/${crumb.path}`}`
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: itemUrl,
      }
    }),
  }
}
