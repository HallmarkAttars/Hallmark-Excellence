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

import { ABOUT, BUSINESS, HIKMA_EXPORTS, WHOLESALE } from '../data/content.js'
import { isProductInStock } from './stock.js'
import { cloudinarySrc } from './productImage.js'

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
  '/retail',
  '/attar-perfume-shop-south-india',
  '/about',
  '/contact',
]

export function buildSitemapXml({ baseUrl, pages = STATIC_PAGES, categories = [], brands = [], products = [] }) {
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
    products.map((product) => product?.category_slug).filter(Boolean)
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
    categorySlugs.has(category.slug)
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
    addEntry(`${base}/categories/${category.slug}`, category.updated_at || category.created_at)
  }
  for (const brand of brands) {
    if (!brand?.slug) continue
    if (brand.is_active === false) continue
    if (!brandHasProducts(brand)) continue
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

// 3a. Hikma Exports Organization Schema
export function buildHikmaExportsSchema({ origin = CANONICAL_ORIGIN, sameAs = [] } = {}) {
  const links = (Array.isArray(sameAs) ? sameAs : [sameAs]).filter(Boolean)

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
    areaServed: ['India', 'Worldwide'],
    knowsAbout: [
      'Attars',
      'Oud oils',
      'Fragrance oils',
      'Bakhoor',
      'Perfume packaging',
      'Wholesale perfume supply',
      'Perfume export',
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
      'Wholesale supply of alcohol-free attars, oud and fragrance oils, roll-on perfumes, bakhoor and perfume packaging from Hikma Exports in Chennai, for retailers, perfumers, distributors and export buyers.',
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
    areaServed: ['India', 'Worldwide'],
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
  const productUrl = `${origin}/product/${product.id}`
  const image = cloudinarySrc(product.image, { width: 1200 }) || product.image

  const variantPrice = (item) => {
    const value = Number(item?.total_price ?? item?.price ?? 0)
    return Number.isFinite(value) && value > 0 ? value : 0
  }
  const variantName = (item) => {
    if (!item) return product.name
    const label = item.display_label
      || (item.quantity_value != null && item.quantity_unit
        ? `${item.quantity_value} ${item.quantity_unit}`
        : '')
    return label ? `${product.name} - ${label}` : product.name
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
    offers,
    ...(hasVariant ? { hasVariant } : {}),
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

// 4d. Wholesale landing page SEO descriptor.
export function buildWholesaleSeo({ origin = CANONICAL_ORIGIN } = {}) {
  return {
    title: 'Wholesale Attars & Perfume Oils Supplier in Chennai | Hikma Exports',
    description:
      'Source wholesale attars, concentrated fragrance oils, roll-on perfumes and perfume packaging from Hikma Exports in Mannadi, Chennai. Bulk and export enquiries welcome.',
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
    title: 'Hikma Exports | Hikma Perfumes Wholesale & Export | Chennai',
    description:
      'Hikma Exports, trading as Hikma Perfumes, supplies attars, oud oils, fragrance oils, bakhoor and perfume packaging for wholesale and export from Chennai.',
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

const STATIC_PAGE_SEO = {
  '/hikma-exports': buildHikmaExportsSeo(),
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
  '/attar-perfume-shop-south-india': {
    title: 'Attar & Perfume Shop in South India | Chennai Boutique | Arees Perfumes',
    description:
      'Visit Arees Perfumes in Mannadi, Chennai — a trusted attar and perfume destination in South India. Discover authentic alcohol-free attars, oud, and perfumes with fast delivery across South India.',
    canonical: '/attar-perfume-shop-south-india',
    type: 'website',
    schema: [
      buildBreadcrumbsSchema([
        { name: 'Home', path: '/' },
        { name: 'South India Store', path: '/attar-perfume-shop-south-india' },
      ]),
      buildLocalBusinessSchema(),
    ].filter(Boolean),
  },
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
