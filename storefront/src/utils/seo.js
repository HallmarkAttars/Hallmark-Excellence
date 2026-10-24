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

import { isProductInStock } from './stock.js'
import { cloudinarySrc } from './productImage.js'

// --------------------------------------------------------------------------
// Canonical domain & Brand Identity
// --------------------------------------------------------------------------
// ONE canonical storefront domain: the apex (https://areesperfumes.in).
export const CANONICAL_ORIGIN = 'https://areesperfumes.in'
export const DEFAULT_BRAND = 'Arees Perfumes'
export const DEFAULT_TITLE = 'Arees Perfumes (Hikma Perfumes) | Attars in Chennai'
export const DEFAULT_DESCRIPTION =
  'Shop authentic attars, oud and fragrance oils from Arees Perfumes, part of Hikma Exports (Hikma Perfumes), the parent company of Arees & Dahab, Chennai.'
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
export const STATIC_PAGES = [
  '/',
  '/shop',
  '/categories',
  '/brands',
  '/wholesale',
  '/retail',
  '/attar-perfume-shop-south-india',
  '/about',
  '/contact',
]

export function buildSitemapXml({ baseUrl, pages = STATIC_PAGES, categories = [], brands = [], products = [] }) {
  const base = String(baseUrl || CANONICAL_ORIGIN).replace(/\/+$/, '')

  const seen = new Set()
  const entries = []

  const addEntry = (rawLoc, timestamp) => {
    if (!rawLoc) return
    const encodedLoc = encodeURI(rawLoc)
    if (seen.has(encodedLoc)) return
    seen.add(encodedLoc)
    entries.push({
      loc: encodedLoc,
      lastmod: lastmodFromTimestamp(timestamp),
    })
  }

  for (const path of pages) {
    if (!path) continue
    const cleanPath = path === '/' ? '/' : (path.startsWith('/') ? path : `/${path}`).replace(/\/+$/, '')
    addEntry(`${base}${cleanPath}`)
  }
  for (const category of categories) {
    if (!category?.slug) continue
    if (category.is_active === false) continue
    addEntry(`${base}/categories/${category.slug}`, category.updated_at || category.created_at)
  }
  for (const brand of brands) {
    if (!brand?.slug) continue
    if (brand.is_active === false) continue
    addEntry(`${base}/brand/${brand.slug}`, brand.updated_at || brand.created_at)
    if (brand.slug === 'oud-al-haramain') {
      addEntry(`${base}/brand/arees-luxury`, brand.updated_at || brand.created_at)
    }
  }
  for (const product of products) {
    if (!product?.id) continue
    if (product.is_active === false) continue
    addEntry(`${base}/product/${product.id}`, product.updated_at || product.created_at)
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
    alternateName: ['Arees & Dahab', 'Hikma Perfumes', 'Hallmark of Excellence'],
    description:
      'Arees Perfumes is a Chennai fragrance brand of Hikma Exports, the parent company of Arees & Dahab.',
    parentOrganization: {
      '@type': 'Organization',
      name: 'Hikma Exports',
      url: origin,
    },
    url: origin,
    logo: `${origin}/HE%20color%20Logo.png`,
    email: 'hikmaexports@gmail.com',
    telephone: '+919840750467',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '83 & 84, Moore St, Mannadi, George Town',
      addressLocality: 'Chennai',
      addressRegion: 'Tamil Nadu',
      postalCode: '600001',
      addressCountry: 'IN',
    },
    sameAs: ['https://www.instagram.com/aree___s?igsh=a2sxMHk4NzN2bDdo'],
  }
}

// 2. WebSite Schema (SearchAction ready)
export function buildWebSiteSchema(origin = CANONICAL_ORIGIN) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Arees Perfumes',
    alternateName: 'Hikma Perfumes',
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
    alternateName: ['Arees Attars & Perfumes', 'Hikma Perfumes'],
    description:
      'Arees Perfumes is the Chennai fragrance brand of Hikma Exports, the parent company of Arees & Dahab.',
    parentOrganization: {
      '@type': 'Organization',
      name: 'Hikma Exports',
      url: origin,
    },
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

// 4. FAQPage Schema
export function buildFAQSchema(faqs = []) {
  const entries = Array.isArray(faqs)
    ? faqs.filter((faq) => faq?.question && faq?.answer)
    : []
  if (entries.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

// 5. Product Schema (with Binary Stock Availability: InStock / OutOfStock)
// `variant` lets callers describe the exact purchasable size the visitor has
// selected. When omitted, the product's default variant is used.
export function buildProductSchema(product, origin = CANONICAL_ORIGIN, variant = null) {
  if (!product) return null

  const variants = Array.isArray(product.variants) ? product.variants : []
  const activeVariants = variants.filter(
    (item) =>
      item &&
      item.active !== false &&
      Number(item.total_price ?? item.price ?? 0) > 0
  )
  const selectedVariant =
    variant ||
    activeVariants.find((item) => item.is_default === true) ||
    activeVariants[0] ||
    null

  const inStock = isProductInStock(product)
  const availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
  const brandName = product.brand_name || 'Arees Perfumes'
  const rawPrice = selectedVariant
    ? Number(selectedVariant.total_price ?? selectedVariant.price ?? product.price ?? 0)
    : Number(product.price || 0)
  const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : 0
  const productUrl = `${origin}/product/${product.id}`
  const image = cloudinarySrc(product.image, { width: 1200 }) || product.image

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: image ? [image] : [`${origin}/Hero.webp`],
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
      price,
      availability,
      itemCondition: 'https://schema.org/NewCondition',
      sku: selectedVariant?.id || product.id,
      seller: {
        '@type': 'Organization',
        name: 'Arees Perfumes',
      },
    },
  }
}

// 4a. Product page SEO descriptor (title, description, canonical, schema).
// Shared by the React page and the server-rendered /api/meta function so the
// crawler-visible head and the client-updated head always match.
export function buildProductSeo(product, { origin = CANONICAL_ORIGIN, variant = null } = {}) {
  if (!product) return null

  const brandTitle = product.brand_name || 'Arees Perfumes'
  const catTitle = product.category_name || 'Attar'
  const productName = String(product.name || 'Product')
  const title = productName.toLowerCase().includes(catTitle.toLowerCase())
    ? `${productName} | ${brandTitle} | Arees Perfumes`
    : `${productName} - ${catTitle} | ${brandTitle} | Arees Perfumes`

  const cleanDbDesc = String(product.description || '').replace(/\s+/g, ' ').trim()
  let description
  if (cleanDbDesc && cleanDbDesc.length >= 60) {
    description = cleanDbDesc.length > 155 ? `${cleanDbDesc.slice(0, 152).trim()}...` : cleanDbDesc
  } else if (cleanDbDesc) {
    description = `${cleanDbDesc}. 100% alcohol-free concentrated ${catTitle.toLowerCase()} oil by ${brandTitle}. Order online with delivery across India.`
  } else {
    description = `Discover ${productName} by ${brandTitle}. Authentic alcohol-free ${catTitle.toLowerCase()} formulated for rich, long-lasting scent. Available retail & wholesale.`
  }

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
  ]
  if (product.brand_name) {
    breadcrumbs.push({
      name: product.brand_name,
      path: `/brand/${product.brand_slug || 'arees'}`,
    })
  }
  if (product.category_name) {
    breadcrumbs.push({
      name: product.category_name,
      path: `/categories/${product.category_slug || 'attars'}`,
    })
  }
  breadcrumbs.push({ name: productName, path: `/product/${product.id}` })

  return {
    title,
    description,
    canonical: `/product/${product.id}`,
    image: cloudinarySrc(product.image, { width: 1200 }) || product.image || DEFAULT_OG_IMAGE,
    type: 'product',
    schema: [
      buildProductSchema(product, origin, variant),
      buildBreadcrumbsSchema(breadcrumbs, origin),
    ].filter(Boolean),
  }
}

// 4b. Category page SEO descriptor.
export function buildCategorySeo(category, slug, { origin = CANONICAL_ORIGIN } = {}) {
  const catName = category?.name || 'Category'
  const lowerSlug = String(slug || '').toLowerCase().trim()

  let title = `${catName} | Pure Attars & Fragrance Oils | Arees Perfumes`
  let description = category?.description || `Explore authentic ${catName} at Arees Perfumes. 100% alcohol-free concentrated oils and traditional fragrances delivered across India.`
  let introDesc = category?.description || null

  if (lowerSlug.includes('fragrance') || lowerSlug.includes('oil')) {
    title = 'Fragrance Oils & Pure Concentrated Attars | Arees Perfumes'
    description = 'Discover premium fragrance oils and concentrated attars by Arees Perfumes. Artisanal alcohol-free perfume oils crafted for daily wear and distinctive longevity.'
    introDesc = introDesc || 'Explore our comprehensive selection of concentrated fragrance oils and traditional attars. Each blend is formulated without alcohol, delivering authentic scent throw, rich skin warmth, and all-day longevity.'
  } else if (lowerSlug.includes('roll') || lowerSlug.includes('pocket')) {
    title = 'Roll-On Attars & Pocket Perfumes | Alcohol-Free Oils | Arees Perfumes'
    description = 'Shop pocket-friendly roll-on attars and pure perfume oils from Arees and Dahab. Convenient rollerballs, travel-ready sizes, and intense fragrance oils.'
    introDesc = introDesc || 'Convenient, travel-ready roll-on attars designed for effortless touch-ups throughout the day. Handcrafted with concentrated, skin-friendly essential oils that last for hours.'
  } else if (lowerSlug.includes('bakhoor') || lowerSlug.includes('bukhoor')) {
    title = 'Bakhoor & Traditional Incense Fragrances | Arees Perfumes'
    description = 'Artisanal Bakhoor, scented wood chips, and oriental incense by Arees Perfumes. Infuse your living spaces and garments with rich Arabian oud and amber aromas.'
    introDesc = introDesc || 'Immerse your spaces in oriental luxury with Arees artisanal bakhoor. Formulated with aromatic wood chips, precious resins, and pure fragrance oils.'
  } else if (lowerSlug.includes('display') || lowerSlug.includes('bottle')) {
    title = 'Attar Display Bottles & Crystal Vials | Arees Perfumes'
    description = 'Elegant attar display bottles, crystal perfume flacons, and traditional applicators. Perfect for vanity displays, gifts, and bespoke fragrance oils.'
    introDesc = introDesc || 'Finely crafted glass and crystal display bottles for attars and concentrated oils. Featuring glass wand applicators and airtight caps.'
  }

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Categories', path: '/categories' },
    { name: catName, path: `/categories/${slug}` },
  ]

  return {
    name: catName,
    title,
    description,
    introDesc,
    canonical: `/categories/${slug}`,
    type: 'website',
    schema: buildBreadcrumbsSchema(breadcrumbs, origin),
  }
}

// 4c. Brand page SEO descriptor.
export function buildBrandSeo(brand, slug, { origin = CANONICAL_ORIGIN } = {}) {
  const lowerSlug = String(slug || '').toLowerCase()
  const isArees = lowerSlug === 'arees'
  const isDahab = lowerSlug === 'dahab'
  const isLuxury = lowerSlug === 'arees-luxury' || lowerSlug === 'oud-al-haramain'

  const brandName = isLuxury
    ? 'Arees Luxury'
    : (brand?.name || (isArees ? 'Arees Perfumes' : isDahab ? 'Dahab Attars' : 'Brand'))

  let title = `${brandName} Perfumes & Attars | Arees Perfumes`
  let description = `Discover authentic ${brandName} fragrances at Arees Perfumes. Pure, 100% alcohol-free concentrated oils delivered across India.`

  if (isArees) {
    title = 'Arees & Arees Perfumes | Authentic Pure Attars & Oils | Arees Perfumes'
    description = 'Discover signature Arees and Arees Perfumes. 100% alcohol-free pure attars, musk, oud, and concentrated fragrance oils crafted in Chennai. Order retail or wholesale across India.'
  } else if (isDahab) {
    title = 'Dahab Perfumes & Dahab Attars | Pure Concentrated Oils | Arees Perfumes'
    description = 'Shop authentic Dahab Perfumes and Dahab Attars. Renowned concentrated perfume oils with rich oriental projection, enduring sillage, and alcohol-free purity.'
  } else if (isLuxury) {
    title = 'Arees Luxury & Arees Luxury Perfumes | Artisanal Attars | Arees Perfumes'
    description = 'Experience Arees Luxury and Arees Luxury Perfumes. Rare vintage oud, exotic amber, velvety rose, and royal artisanal attars formulated for discerning fragrance lovers.'
  }

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: brandName, path: `/brand/${slug}` },
  ]

  return {
    brandName,
    title,
    description,
    canonical: `/brand/${slug}`,
    type: 'website',
    schema: buildBreadcrumbsSchema(breadcrumbs, origin),
  }
}

// 6. BreadcrumbList Schema
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
