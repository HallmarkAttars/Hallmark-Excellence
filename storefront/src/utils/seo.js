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

import { ABOUT, BUSINESS, HIKMA_EXPORTS, SOUTH_INDIA, WHOLESALE } from '../data/content.js'
import { GUIDES } from '../data/guides.js'
import { normalizeCategorySlug } from './categorySlug.js'
import { isProductInStock } from './stock.js'
import { cloudinarySrc } from './productImage.js'
import { brandPublicSlug } from './brandSlug.js'

export { normalizeCategorySlug } from './categorySlug.js'

// --------------------------------------------------------------------------
// Canonical domain & Brand Identity
// --------------------------------------------------------------------------
// ONE canonical storefront domain: the live host (https://www.areesperfumes.in).
export const CANONICAL_ORIGIN = 'https://www.areesperfumes.in'
export const DEFAULT_BRAND = 'Arees Perfumes'
export const DEFAULT_TITLE = 'Arees Perfumes (Hikma Perfumes) | Attars in Chennai'
export const DEFAULT_DESCRIPTION =
  'Shop authentic attars, oud and fragrance oils from Arees Perfumes, part of Hikma Exports (Hikma Perfumes), the parent company of Arees & Dahab, Chennai.'
export const DEFAULT_OG_IMAGE = `${CANONICAL_ORIGIN}/Hero.webp`

const WWW_HOST = 'www.areesperfumes.in'
const APEX_HOST = 'areesperfumes.in'

function normalizeHost(host) {
  const value = String(host).toLowerCase()
  return value === APEX_HOST ? WWW_HOST : value
}

export function normalizeGuideSlug(slug) {
  return String(slug ?? '').trim().toLowerCase()
}

export function cleanProductName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

// --------------------------------------------------------------------------
// Site URL resolution
// --------------------------------------------------------------------------
export function resolveSiteUrl(siteUrl, headers = {}) {
  if (siteUrl) {
    const normalized = String(siteUrl).replace(
      /^https?:\/\/areesperfumes\.in(?=(\/|$))/i,
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
  '/hikma-exports',
  '/guides',
  '/retail',
  '/attar-perfume-shop-south-india',
  '/about',
  '/contact',
]

export function buildSitemapXml({ baseUrl, pages = STATIC_PAGES, categories = [], brands = [], products = [], guides = GUIDES }) {
  const base = String(baseUrl || CANONICAL_ORIGIN).replace(/\/+$/, '')

  const seen = new Set()
  const entries = []

  // Only list category/brand pages that have at least one live product. The
  // fallback catalog snapshot does not carry category/brand relations, so the
  // filter is applied only when the live product payload exposes them.
  const categoryIds = new Set(
    products.map((product) => product?.category_id).filter((value) => value != null)
  )
  const categorySlugs = new Set(
    products.map((product) => normalizeCategorySlug(product?.category_slug)).filter(Boolean)
  )
  const brandIds = new Set(
    products.map((product) => product?.brand_id).filter((value) => value != null)
  )
  const brandSlugs = new Set(
    products.map((product) => product?.brand_slug).filter(Boolean)
  )
  const filterCategories = categoryIds.size > 0 || categorySlugs.size > 0
  const filterBrands = brandIds.size > 0 || brandSlugs.size > 0
  const categoryHasProducts = (category) =>
    !filterCategories ||
    categoryIds.has(category.id) ||
    categorySlugs.has(normalizeCategorySlug(category.slug))
  const brandHasProducts = (brand) =>
    !filterBrands ||
    brandIds.has(brand.id) ||
    brandSlugs.has(brand.slug)

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
    if (!categoryHasProducts(category)) continue
    const slug = normalizeCategorySlug(category.slug)
    if (!slug) continue
    addEntry(`${base}/categories/${slug}`, category.updated_at || category.created_at)
  }
  for (const guide of guides) {
    if (!guide?.slug) continue
    if (guide.is_active === false) continue
    const slug = normalizeGuideSlug(guide.slug)
    if (!slug) continue
    addEntry(`${base}/guides/${slug}`, guide.updated || guide.published)
  }
  for (const brand of brands) {
    if (!brand?.slug) continue
    if (brand.is_active === false) continue
    if (!brandHasProducts(brand)) continue
    const publicSlug = brandPublicSlug(brand.slug)
    if (!publicSlug) continue
    addEntry(`${base}/brand/${publicSlug}`, brand.updated_at || brand.created_at)
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
    legalName: 'Hikma Exports',
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
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      telephone: '+919840750467',
      email: 'hikmaexports@gmail.com',
      areaServed: ['IN'],
      availableLanguage: ['English', 'Tamil', 'Hindi'],
    },
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
    hasMap: BUSINESS.mapDirectionsUrl,
    sameAs: [BUSINESS.socialByKey('instagram').href],
    areaServed: ['Chennai', 'Tamil Nadu', 'South India', 'India'],
  }
}

// 3a. Hikma Exports Organization Schema
export function buildHikmaExportsSchema({ origin = CANONICAL_ORIGIN, sameAs = [] } = {}) {
  const links = (Array.isArray(sameAs) ? sameAs : [sameAs]).filter(
    (link) => link && link !== '#'
  )

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${origin}/hikma-exports#organization`,
    name: 'Hikma Exports',
    alternateName: ['Hikma Perfumes'],
    description:
      'Hikma Exports is a Chennai-based perfume wholesaler and exporter, and the parent company of Arees & Dahab. Its fragrance identity, Hikma Perfumes, supplies attars, oud oils, fragrance oils, bakhoor and perfume packaging for wholesale and export.',
    url: `${origin}/hikma-exports`,
    logo: `${origin}/HE%20color%20Logo.png`,
    email: BUSINESS.email,
    telephone: BUSINESS.phoneTel,
    address: {
      '@type': 'PostalAddress',
      ...BUSINESS.addressParts,
    },
    hasMap: BUSINESS.mapDirectionsUrl,
    ...(links.length ? { sameAs: links } : {}),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: BUSINESS.phoneTel,
      email: BUSINESS.email,
      areaServed: ['IN', 'SG', 'MY', 'AE', 'LK', 'MV'],
      availableLanguage: ['English', 'Tamil', 'Hindi'],
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '21:30',
      },
    },
    subOrganization: [
      {
        '@type': 'Organization',
        name: 'Arees Perfumes',
        url: `${origin}/brand/arees`,
      },
      {
        '@type': 'Organization',
        name: 'Dahab',
        url: `${origin}/brand/dahab`,
      },
    ],
    areaServed: ['India', 'Singapore', 'Malaysia', 'United Arab Emirates', 'Sri Lanka', 'Maldives'],
    knowsAbout: [
      'Attars',
      'Oud oils',
      'Fragrance oils',
      'Bakhoor',
      'Perfume packaging',
      'Wholesale perfume supply',
      'Perfume export',
      'Private label perfume',
      'Event and function fragrance orders',
      'GST invoicing',
      'IEC export documentation',
    ],
  }
}

// 3b. Wholesale Service Schema
export function buildWholesaleServiceSchema({ origin = CANONICAL_ORIGIN } = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${origin}/wholesale#service`,
    name: 'Wholesale Attars & Perfume Oils Supply',
    serviceType: 'Wholesale attar and perfume oil supply',
    description:
      'Wholesale supply of alcohol-free attars, oud and fragrance oils, roll-on perfumes, bakhoor and perfume packaging from Hikma Exports in Chennai, for retailers, perfumers, distributors and export buyers. Loose attar and fragrance oil orders start at 100 g; Arees and Dahab branded packs start at 60 pieces across a combined branded order.',
    url: `${origin}/wholesale`,
    provider: {
      '@type': 'Organization',
      name: 'Hikma Exports',
      alternateName: 'Hikma Perfumes',
      url: `${origin}/hikma-exports`,
      telephone: BUSINESS.phoneTel,
      email: BUSINESS.email,
      address: {
        '@type': 'PostalAddress',
        ...BUSINESS.addressParts,
      },
    },
    areaServed: ['India', 'Singapore', 'Malaysia', 'United Arab Emirates', 'Sri Lanka', 'Maldives'],
    availableChannel: {
      '@type': 'ServiceChannel',
      servicePhone: {
        '@type': 'ContactPoint',
        telephone: BUSINESS.phoneTel,
        contactType: 'sales',
        email: BUSINESS.email,
        hoursAvailable: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '09:00',
          closes: '21:30',
        },
      },
      serviceUrl: `${origin}/wholesale`,
    },
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
  const brandName = cleanProductName(product.brand_name) || 'Arees Perfumes'
  const productName = cleanProductName(product.name) || 'Product'
  const categoryName = cleanProductName(product.category_name)
  const cleanDescription = String(product.description || '').replace(/\s+/g, ' ').trim()
  const productUrl = `${origin}/product/${product.id}`
  const image = cloudinarySrc(product.image, { width: 1200 }) || product.image

  const variantPrice = (item) => {
    const value = Number(item?.total_price ?? item?.price ?? 0)
    return Number.isFinite(value) && value > 0 ? value : 0
  }
  const variantName = (item) => {
    if (!item) return productName
    const label = item.display_label
      || (item.quantity_value != null && item.quantity_unit
        ? `${item.quantity_value} ${item.quantity_unit}`
        : '')
    return label ? `${productName} - ${label}` : productName
  }
  const offerBase = {
    priceCurrency: 'INR',
    availability,
    itemCondition: 'https://schema.org/NewCondition',
    url: productUrl,
    seller: {
      '@type': 'Organization',
      name: 'Arees Perfumes',
    },
  }

  let offers
  let hasVariant

  if (variant && selectedVariant) {
    offers = {
      '@type': 'Offer',
      ...offerBase,
      price: variantPrice(selectedVariant),
      name: variantName(selectedVariant),
      sku: selectedVariant.id || product.id,
    }
  } else if (activeVariants.length > 1) {
    const prices = activeVariants.map(variantPrice).filter((value) => value > 0)
    offers = {
      '@type': 'AggregateOffer',
      ...offerBase,
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: activeVariants.length,
    }
    hasVariant = activeVariants.map((item) => ({
      '@type': 'Product',
      name: variantName(item),
      sku: item.id,
      offers: {
        '@type': 'Offer',
        ...offerBase,
        price: variantPrice(item),
      },
    }))
  } else {
    const price = selectedVariant ? variantPrice(selectedVariant) : Number(product.price || 0)
    offers = {
      '@type': 'Offer',
      ...offerBase,
      price: Number.isFinite(price) && price > 0 ? price : 0,
      name: variantName(selectedVariant),
      sku: selectedVariant?.id || product.id,
    }
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    image: image ? [image] : [`${origin}/Hero.webp`],
    description:
      cleanDescription ||
      `Shop ${productName} from Arees Perfumes. Pure, long-lasting attar crafted with excellence in Chennai.`,
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    ...(categoryName ? { category: categoryName } : {}),
    offers,
    ...(hasVariant ? { hasVariant } : {}),
  }
}

// 4a. Product page SEO descriptor (title, description, canonical, schema).
// Shared by the React page and the server-rendered /api/meta function so the
// crawler-visible head and the client-updated head always match.
export function buildProductSeo(product, { origin = CANONICAL_ORIGIN, variant = null } = {}) {
  if (!product) return null

  const brandTitle = cleanProductName(product.brand_name) || 'Arees Perfumes'
  const catTitle = cleanProductName(product.category_name)
  const productName = cleanProductName(product.name) || 'Product'
  const title = catTitle
    ? (productName.toLowerCase().includes(catTitle.toLowerCase())
        ? `${productName} | ${brandTitle} | Arees Perfumes`
        : `${productName} - ${catTitle} | ${brandTitle} | Arees Perfumes`)
    : `${productName} | ${brandTitle} | Arees Perfumes`

  const cleanDbDesc = String(product.description || '').replace(/\s+/g, ' ').trim()
  const lowerCat = catTitle.toLowerCase()
  const productType = lowerCat
    ? (lowerCat.includes('oil') ? lowerCat : `${lowerCat} oil`)
    : 'fragrance'
  let description
  if (cleanDbDesc && cleanDbDesc.length >= 60) {
    description = cleanDbDesc.length > 155 ? `${cleanDbDesc.slice(0, 152).trim()}...` : cleanDbDesc
  } else if (cleanDbDesc) {
    description = `${cleanDbDesc}. 100% alcohol-free concentrated ${productType} by ${brandTitle}. Order online with delivery across India.`
  } else {
    description = `Discover ${productName} by ${brandTitle}. Authentic alcohol-free concentrated ${productType} formulated for rich, long-lasting scent. Available retail & wholesale.`
  }

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
  ]
  if (product.brand_name) {
    breadcrumbs.push({
      name: cleanProductName(product.brand_name),
      path: `/brand/${brandPublicSlug(product.brand_slug || 'arees')}`,
    })
  }
  if (catTitle) {
    breadcrumbs.push({
      name: catTitle,
      path: `/categories/${normalizeCategorySlug(product.category_slug || 'attars')}`,
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

export function buildCollectionPageSchema({
  name,
  description,
  path,
  products = [],
  origin = CANONICAL_ORIGIN,
} = {}) {
  const collectionName = cleanProductName(name)
  if (!collectionName || !path) return null
  const items = (Array.isArray(products) ? products : [])
    .filter((product) => product?.id)
    .slice(0, 24)
  if (items.length === 0) return null

  const url = String(path).startsWith('http')
    ? String(path)
    : `${origin}${String(path).startsWith('/') ? path : `/${path}`}`

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collectionName,
    description: description || undefined,
    url,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${origin}/product/${product.id}`,
        name: cleanProductName(product.name) || undefined,
      })),
    },
  }
}

// 4b. Category page SEO descriptor.
export function buildCategorySeo(category, slug, { origin = CANONICAL_ORIGIN, products = [] } = {}) {
  const catName = cleanProductName(category?.name) || 'Category'
  const canonicalSlug = normalizeCategorySlug(slug)
  const lowerSlug = canonicalSlug.toLowerCase()

  let title = `${catName} | Pure Attars & Fragrance Oils | Arees Perfumes`
  let description = category?.description || `Explore authentic ${catName} at Arees Perfumes. 100% alcohol-free concentrated oils and traditional fragrances delivered across India.`
  let introDesc = category?.description || null

  if (lowerSlug === '10') {
    title = 'Wholesale Fragrance Oils & Attar Bases in Chennai | Hikma Exports'
    description = 'Source concentrated fragrance oils and attar bases in bulk from Hikma Exports in Mannadi, Chennai. Explore 290+ alcohol-free scents for retailers, perfumers and export buyers.'
    introDesc = 'Explore concentrated fragrance oils and traditional attar bases supplied by Hikma Exports from Mannadi, George Town, Chennai. The range covers floral, woody, musky, amber and oud-led profiles for retailers, perfumers, distributors and export buyers. Share the scents, pack sizes and quantities you need for a wholesale quotation.'
  } else if (lowerSlug === '1') {
    title = 'Wholesale Roll-On Attars in Chennai | Arees & Dahab | Hikma Exports'
    description = 'Source alcohol-free 6ml and 8ml roll-on attars in bulk from Arees Perfumes and Dahab. Wholesale and export enquiries are handled by Hikma Exports in Mannadi, Chennai.'
    introDesc = 'Browse ready-to-retail roll-on attars from the Arees and Dahab collections, supplied wholesale by Hikma Exports in Chennai. These alcohol-free fragrance oils are packed for retail shelves, gifting and distribution. Share your preferred scents, pack sizes and quantities to request wholesale pricing.'
  } else if (lowerSlug.includes('fragrance') || lowerSlug.includes('oil')) {
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
    { name: catName, path: `/categories/${canonicalSlug}` },
  ]

  return {
    name: catName,
    title,
    description,
    introDesc,
    canonical: `/categories/${canonicalSlug}`,
    type: 'website',
    schema: [
      buildBreadcrumbsSchema(breadcrumbs, origin),
      buildCollectionPageSchema({
        name: catName,
        description,
        path: `/categories/${canonicalSlug}`,
        products,
        origin,
      }),
    ].filter(Boolean),
  }
}

// 4c. Brand page SEO descriptor.
export function buildBrandSeo(brand, slug, { origin = CANONICAL_ORIGIN, products = [] } = {}) {
  const publicSlug = brandPublicSlug(slug)
  const lowerSlug = String(publicSlug || '').toLowerCase()
  const isArees = lowerSlug === 'arees'
  const isDahab = lowerSlug === 'dahab'
  const isLuxury = lowerSlug === 'arees-luxury'

  const brandName = isLuxury
    ? 'Arees Luxury'
    : (cleanProductName(brand?.name) || (isArees ? 'Arees Perfumes' : isDahab ? 'Dahab Attars' : 'Brand'))

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
    { name: brandName, path: `/brand/${publicSlug}` },
  ]

  return {
    brandName,
    title,
    description,
    canonical: `/brand/${publicSlug}`,
    type: 'website',
    schema: [
      buildBreadcrumbsSchema(breadcrumbs, origin),
      buildCollectionPageSchema({
        name: brandName,
        description,
        path: `/brand/${publicSlug}`,
        products,
        origin,
      }),
    ].filter(Boolean),
  }
}

// 4d. Wholesale landing page SEO descriptor.
export function buildWholesaleSeo({ origin = CANONICAL_ORIGIN } = {}) {
  return {
    title: 'Perfume & Attar Wholesale in Chennai | Hikma Exports',
    description:
      'Perfume and attar wholesale in Chennai from Hikma Exports. Loose oils from 100 g, Arees and Dahab branded packs from 60 pieces, private label and export support. GST and IEC available.',
    canonical: '/wholesale',
    image: DEFAULT_OG_IMAGE,
    type: 'website',
    schema: [
      buildWholesaleServiceSchema({ origin }),
      buildFAQSchema(WHOLESALE.faqs),
      buildBreadcrumbsSchema(
        [
          { name: 'Home', path: '/' },
          { name: 'Wholesale Attars', path: '/wholesale' },
        ],
        origin
      ),
    ].filter(Boolean),
  }
}

// 4e. Hikma Exports entity page SEO descriptor.
export function buildHikmaExportsSeo({ origin = CANONICAL_ORIGIN, sameAs = HIKMA_EXPORTS.sameAs } = {}) {
  return {
    title: 'Perfume Exporter in Chennai | Hikma Exports & Hikma Perfumes',
    description:
      'Hikma Exports is a Chennai perfume wholesaler and exporter, trading as Hikma Perfumes. Attars, oud and fragrance oils, private label and export support for India, Singapore, Malaysia, UAE, Sri Lanka and Maldives.',
    canonical: '/hikma-exports',
    image: DEFAULT_OG_IMAGE,
    type: 'website',
    schema: [
      buildHikmaExportsSchema({ origin, sameAs }),
      buildFAQSchema(HIKMA_EXPORTS.faqs),
      buildBreadcrumbsSchema(
        [
          { name: 'Home', path: '/' },
          { name: 'Hikma Exports', path: '/hikma-exports' },
        ],
        origin
      ),
    ].filter(Boolean),
  }
}

// 4e-2. Chennai / South India local landing page SEO descriptor.
export function buildSouthIndiaSeo({ origin = CANONICAL_ORIGIN } = {}) {
  return {
    title: 'Attar Shop in Chennai | Arees Perfumes, Mannadi',
    description:
      'Visit Arees Perfumes in Mannadi, George Town, Chennai for alcohol-free attars, oud, fragrance oils and wholesale supply. Serving retail and trade buyers across South India, with export enquiries handled by Hikma Exports.',
    canonical: '/attar-perfume-shop-south-india',
    image: DEFAULT_OG_IMAGE,
    type: 'website',
    schema: [
      buildBreadcrumbsSchema(
        [
          { name: 'Home', path: '/' },
          { name: 'Attar Shop in Chennai', path: '/attar-perfume-shop-south-india' },
        ],
        origin
      ),
      buildLocalBusinessSchema(origin),
    ].filter(Boolean),
  }
}

// 4f. Editorial guides index and article SEO descriptors.
export function buildGuidesIndexSeo({ origin = CANONICAL_ORIGIN } = {}) {
  return {
    title: 'Attar, Perfume Oil & Wholesale Guides | Arees Perfumes',
    description:
      'Practical guides to attars, perfume oils, storage, gifting, private label and wholesale fragrance buying from Arees Perfumes and Hikma Exports in Chennai.',
    canonical: '/guides',
    image: DEFAULT_OG_IMAGE,
    type: 'website',
    schema: buildBreadcrumbsSchema(
      [
        { name: 'Home', path: '/' },
        { name: 'Guides', path: '/guides' },
      ],
      origin
    ),
  }
}

export function buildArticleSchema(guide, { origin = CANONICAL_ORIGIN } = {}) {
  if (!guide?.slug || !guide?.title) return null
  const url = `${origin}/guides/${normalizeGuideSlug(guide.slug)}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    image: guide.image ? [absoluteAssetUrl(guide.image, origin)] : [`${origin}/Hero.webp`],
    datePublished: guide.published || guide.updated || undefined,
    dateModified: guide.updated || guide.published || undefined,
    author: {
      '@type': 'Organization',
      name: 'Arees Perfumes',
      url: origin,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Arees Perfumes',
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/HE%20color%20Logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    articleSection: guide.category || 'Fragrance Guides',
  }
}

function absoluteAssetUrl(value, origin = CANONICAL_ORIGIN) {
  if (!value) return DEFAULT_OG_IMAGE
  if (/^https?:\/\//i.test(String(value))) return String(value)
  return `${origin}${String(value).startsWith('/') ? value : `/${value}`}`
}

export function buildGuideSeo(guide, { origin = CANONICAL_ORIGIN } = {}) {
  if (!guide?.slug || !guide?.title) return null
  const slug = normalizeGuideSlug(guide.slug)
  return {
    title: guide.seoTitle || `${guide.title} | Arees Perfumes`,
    description: guide.description,
    canonical: `/guides/${slug}`,
    image: absoluteAssetUrl(guide.image, origin),
    type: 'article',
    schema: [
      buildArticleSchema(guide, { origin }),
      buildFAQSchema(guide.faqs),
      buildBreadcrumbsSchema(
        [
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: guide.title, path: `/guides/${slug}` },
        ],
        origin
      ),
    ].filter(Boolean),
  }
}

const STATIC_PAGE_SEO = {
  '/hikma-exports': buildHikmaExportsSeo(),
  '/guides': buildGuidesIndexSeo(),
  '/about': {
    title: 'About Arees Perfumes & Hikma Perfumes | Chennai',
    description:
      'Learn about Arees Perfumes, part of Hikma Exports (Hikma Perfumes), the parent company of Arees & Dahab, operating under Hallmark of Excellence in Chennai.',
    canonical: '/about',
    type: 'website',
    schema: [
      buildBreadcrumbsSchema([
        { name: 'Home', path: '/' },
        { name: 'About Us', path: '/about' },
      ]),
      buildFAQSchema(ABOUT.faqs),
    ].filter(Boolean),
  },
  '/wholesale': buildWholesaleSeo(),
  '/contact': {
    title: 'Contact Arees Perfumes & Hikma Perfumes | Chennai',
    description:
      'Contact Arees Perfumes, part of Hikma Exports (Hikma Perfumes), in Mannadi, George Town, Chennai for retail orders, wholesale enquiries, and fragrance consultations.',
    canonical: '/contact',
    type: 'website',
    schema: buildBreadcrumbsSchema([
      { name: 'Home', path: '/' },
      { name: 'Contact Us', path: '/contact' },
    ]),
  },
  '/shop': {
    title: 'Shop Premium Attars, Oud & Perfumes | Arees Perfumes',
    description:
      'Shop premium attars, oud, perfumes and traditional fragrance oils from Arees Perfumes. Discover long-lasting, alcohol-free scents crafted in Chennai.',
    canonical: '/shop',
    type: 'website',
    schema: buildBreadcrumbsSchema([
      { name: 'Home', path: '/' },
      { name: 'Shop', path: '/shop' },
    ]),
  },
  '/categories': {
    title: 'All Fragrance Categories | Arees Perfumes',
    description:
      'Explore all fragrance categories at Arees Perfumes. Discover pure attars, oud oils, musk, and traditional perfumes crafted with excellence in Chennai.',
    canonical: '/categories',
    type: 'website',
    schema: buildBreadcrumbsSchema([
      { name: 'Home', path: '/' },
      { name: 'Categories', path: '/categories' },
    ]),
  },
  '/brands': {
    title: 'Our Fragrance Brands | Arees Perfumes',
    description:
      'Discover our exclusive collections of authentic luxury attars, perfumes, and oud oils crafted with heritage and excellence.',
    canonical: '/brands',
    type: 'website',
    schema: buildBreadcrumbsSchema([
      { name: 'Home', path: '/' },
      { name: 'Brands', path: '/brands' },
    ]),
  },
  '/retail': {
    title: 'Retail Attars & Pure Perfume Oils | Buy Online | Arees Perfumes',
    description:
      'Discover pure retail attars and alcohol-free perfume oils from Arees Perfumes. Handcrafted roll-on attars, artisanal oud, musk, and floral blends delivered across India.',
    canonical: '/retail',
    type: 'website',
    schema: buildBreadcrumbsSchema([
      { name: 'Home', path: '/' },
      { name: 'Retail Attars', path: '/retail' },
    ]),
  },
  '/attar-perfume-shop-south-india': buildSouthIndiaSeo(),
}

export function buildStaticPageSeo(slug) {
  const key = String(slug || '').replace(/^\/+|\/+$/g, '')
  const path = key ? `/${key}` : '/'
  const descriptor = STATIC_PAGE_SEO[path]
  if (!descriptor) return null
  return {
    image: DEFAULT_OG_IMAGE,
    ...descriptor,
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
