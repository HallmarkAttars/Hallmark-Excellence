// Vercel serverless function — server-rendered <head> for dynamic routes.
//
// vercel.json rewrites /product/:id, /categories/:slug and /brand/:slug here.
// The function fetches the public API record, builds the same SEO descriptor
// the React page uses, injects it into the built index.html shell, and returns
// the real HTTP status (404 for missing records instead of a soft-200 SPA).
//
// The shell is fetched from /index.html (a static file), never from the
// rewritten route itself, so there is no rewrite recursion.

import {
  CANONICAL_ORIGIN,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildLocalBusinessSchema,
  buildProductSeo,
  buildCategorySeo,
  buildBrandSeo,
  buildStaticPageSeo,
  buildGuideSeo,
  normalizeCategorySlug,
  cleanProductName,
} from '../src/utils/seo.js'
import { brandApiSlug, brandPublicSlug } from '../src/utils/brandSlug.js'
import { ABOUT, BUSINESS, CONTACT, HERO, HIKMA_EXPORTS, SOUTH_INDIA, WHOLESALE } from '../src/data/content.js'
import { GUIDES, getGuideBySlug } from '../src/data/guides.js'

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://api.areesperfumes.in/api'
const FETCH_TIMEOUT_MS = 8000
const SHELL_TIMEOUT_MS = 5000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

async function fetchJson(path) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    if (!res.ok) throw httpError(res.status, `Upstream ${path} responded ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function readQuery(req) {
  if (req && req.query && typeof req.query === 'object') return req.query
  try {
    return Object.fromEntries(new URL(req?.url || '/', 'http://localhost').searchParams)
  } catch {
    return {}
  }
}

function absoluteUrl(value) {
  if (!value) return DEFAULT_OG_IMAGE
  if (/^https?:\/\//i.test(String(value))) return String(value)
  return `${CANONICAL_ORIGIN}${String(value).startsWith('/') ? value : `/${value}`}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildNotFoundSeo() {
  return {
    title: 'Page Not Found | Arees Perfumes',
    description: 'The page you requested could not be found. Browse authentic attars, oud, and fragrance oils at Arees Perfumes.',
    canonical: null,
    image: DEFAULT_OG_IMAGE,
    type: 'website',
    robots: 'noindex,follow',
    schema: [],
  }
}

const UTILITY_PAGE_SEO = {
  cart: {
    title: 'Shopping Cart | Arees Perfumes',
    description: 'Review the attars and fragrance oils in your Arees Perfumes shopping cart.',
  },
  checkout: {
    title: 'Checkout | Arees Perfumes',
    description: 'Complete your Arees Perfumes order securely.',
  },
  'track-order': {
    title: 'Track Order | Arees Perfumes',
    description: 'Track the status of your Arees Perfumes order.',
  },
  'view-order': {
    title: 'View Order | Arees Perfumes',
    description: 'View the details of your Arees Perfumes order.',
  },
  'privacy-policy': {
    title: 'Privacy & Cookies Policy | Arees Perfumes',
    description: 'How Arees Perfumes and Hikma Exports collect, use, share and protect the personal, order and analytics data you share on this website.',
  },
  terms: {
    title: 'Terms of Service | Arees Perfumes',
    description: 'Terms for buying from Arees Perfumes online, including payment, delivery, returns, international orders and the legal entity behind the storefront.',
  },
  'shipping-returns': {
    title: 'Shipping & Returns | Arees Perfumes',
    description: 'Delivery, dispatch, international shipping, returns and refund rules for online retail orders from Arees Perfumes and Hikma Exports in Chennai.',
  },
}

export function buildUtilitySeo(slug) {
  const key = String(slug || '').trim().toLowerCase()
  const page = UTILITY_PAGE_SEO[key]
  if (!page) return null
  return {
    ...page,
    canonical: `/${key}`,
    image: DEFAULT_OG_IMAGE,
    type: 'website',
    robots: 'noindex,follow',
    schema: [],
  }
}

export function buildHomeSeo() {
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonical: '/',
    image: DEFAULT_OG_IMAGE,
    type: 'website',
    robots: 'index,follow',
    schema: [
      buildOrganizationSchema(),
      buildWebSiteSchema(),
      buildLocalBusinessSchema(),
    ],
  }
}

function renderParagraphs(paragraphs = []) {
  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
}

function renderSections(sections = []) {
  return sections
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.heading)}</h2>${renderParagraphs(section.paragraphs)}</section>`
    )
    .join('')
}

function renderFaqs(faqs = []) {
  return faqs
    .map(
      (faq) =>
        `<article><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p></article>`
    )
    .join('')
}

function renderQuickFacts(facts = []) {
  return `<section><h2>MOQ, Hours &amp; Export Facts</h2><ul>${facts
    .map((fact) => `<li><strong>${escapeHtml(fact.label)}:</strong> ${escapeHtml(fact.value)}</li>`)
    .join('')}</ul></section>`
}

function renderLinks(links = []) {
  return links
    .map((link) => `<a href="${escapeHtml(link.to)}">${escapeHtml(link.label)}</a>`)
    .join(' ')
}

function renderContact(heading) {
  return `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(BUSINESS.address)}</p><p>Wholesale desk: ${escapeHtml(BUSINESS.wholesaleHours)}</p><p>Phone / WhatsApp: <a href="tel:${escapeHtml(BUSINESS.phoneTel)}">${escapeHtml(BUSINESS.phoneDisplay)}</a></p><p>Email: <a href="mailto:${escapeHtml(BUSINESS.email)}">${escapeHtml(BUSINESS.email)}</a></p><p><a href="${escapeHtml(BUSINESS.mapDirectionsUrl)}">Get directions</a></p></section>`
}

// Raw, crawlable fallback for the two B2B landing pages. The React app
// replaces this markup when it mounts; the no-JS/crawler path keeps the
// page's primary copy, FAQs and contact details in the initial HTML.
export function buildB2bBodyHtml(slug) {
  const contactHeading = slug === 'hikma-exports' ? 'Contact Hikma Exports' : 'Contact the Wholesale Desk'
  const contact = renderContact(contactHeading)

  if (slug === 'wholesale') {
    return `<main data-prerender="true">
<header><p>${escapeHtml(WHOLESALE.eyebrow)}</p><h1>${escapeHtml(WHOLESALE.title)}</h1><p>${escapeHtml(WHOLESALE.intro)}</p></header>
<section><h2>${escapeHtml(WHOLESALE.overviewHeading)}</h2>${renderParagraphs(WHOLESALE.overviewParagraphs)}</section>
${renderQuickFacts(WHOLESALE.quickFacts)}
<section><h2>Our Wholesale Product Range</h2>${WHOLESALE.productRange.map((item) => `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><p>${renderLinks(item.links)}</p></article>`).join('')}</section>
<section><h2>Transparent Bulk Quantity Tiers</h2><p>${escapeHtml(WHOLESALE.tiersNote)}</p>${WHOLESALE.tiers.map((tier) => `<article><h3>${escapeHtml(tier.heading)}</h3><p>${escapeHtml(tier.description)}</p></article>`).join('')}</section>
<section><h2>How Wholesale Ordering Works</h2>${WHOLESALE.process.map((step) => `<article><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.description)}</p></article>`).join('')}</section>
${renderSections(WHOLESALE.sections)}
<section><h2>What to Include in Your Wholesale Enquiry</h2><ul>${WHOLESALE.buyerChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
<section><h2>Wholesale &amp; Export FAQs</h2>${renderFaqs(WHOLESALE.faqs)}</section>
${contact}
</main>`
  }

  if (slug === 'hikma-exports') {
    return `<main data-prerender="true">
<header><p>${escapeHtml(HIKMA_EXPORTS.eyebrow)}</p><h1>${escapeHtml(HIKMA_EXPORTS.title)}</h1><p>${escapeHtml(HIKMA_EXPORTS.intro)}</p></header>
${renderQuickFacts(HIKMA_EXPORTS.quickFacts)}
<section>${renderParagraphs(HIKMA_EXPORTS.introParagraphs)}</section>
${renderSections(HIKMA_EXPORTS.sections)}
<section><h2>What Hikma Exports Supplies</h2>${HIKMA_EXPORTS.offerings.map((item) => `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`).join('')}</section>
<section><h2>Hikma Exports FAQs</h2>${renderFaqs(HIKMA_EXPORTS.faqs)}</section>
${contact}
</main>`
  }

  return ''
}

export function buildHomeBodyHtml() {
  return `<main data-prerender="true">
<header><h1>${escapeHtml(HERO.title.join(' '))}</h1><p>${escapeHtml(HERO.subtitle)}</p></header>
<section><h2>Shop Attars, Oud &amp; Fragrance Oils</h2><p>Browse alcohol-free attars and concentrated perfume oils from Arees Perfumes and Dahab.</p><p><a href="/shop">Shop all attars</a> <a href="/categories">Explore categories</a> <a href="/brands">Our brands</a></p></section>
<section><h2>Wholesale &amp; Export</h2><p>Hikma Exports supplies loose attar and fragrance oils from 100 g, branded Arees and Dahab packs from 60 pieces, private-label orders and export support.</p><p><a href="/wholesale">Wholesale enquiry</a> <a href="/hikma-exports">Hikma Exports</a></p></section>
<section><h2>Fragrance Guides</h2><p>Practical guides to choosing, storing and sourcing attars and perfume oils.</p><p><a href="/guides">Read the guides</a></p></section>
</main>`
}

export function buildSouthIndiaBodyHtml() {
  const store = SOUTH_INDIA.store
  return `<main data-prerender="true">
<header><p>${escapeHtml(SOUTH_INDIA.eyebrow)}</p><h1>${escapeHtml(SOUTH_INDIA.title)}</h1><p>${escapeHtml(SOUTH_INDIA.intro)}</p></header>
<section><h2>${escapeHtml(SOUTH_INDIA.heritage.heading)}</h2>${renderParagraphs(SOUTH_INDIA.heritage.paragraphs)}</section>
<section><h2>Why Fragrance Buyers in South India Choose Arees</h2>${SOUTH_INDIA.reasons.map((reason) => `<article><h3>${escapeHtml(reason.title)}</h3><p>${escapeHtml(reason.description)}</p></article>`).join('')}</section>
<section><h2>${escapeHtml(store.heading)}</h2><p>${escapeHtml(BUSINESS.address)}</p><p>${escapeHtml(store.landmark)}</p><p>${store.hours.map((line) => escapeHtml(line)).join(' ')}</p><p>${escapeHtml(store.wholesaleHours)}</p><p>Phone / WhatsApp: <a href="tel:${escapeHtml(BUSINESS.phoneTel)}">${escapeHtml(BUSINESS.phoneDisplay)}</a></p><p>Email: <a href="mailto:${escapeHtml(BUSINESS.email)}">${escapeHtml(BUSINESS.email)}</a></p><p><a href="${escapeHtml(BUSINESS.mapDirectionsUrl)}">${escapeHtml(store.directionsLabel)}</a></p></section>
<section><h2>${escapeHtml(SOUTH_INDIA.coverage.heading)}</h2><p>${escapeHtml(SOUTH_INDIA.coverage.intro)}</p>${SOUTH_INDIA.coverage.regions.map((region) => `<article><h3>${escapeHtml(region.title)}</h3><p>${escapeHtml(region.description)}</p></article>`).join('')}</section>
<section><h2>${escapeHtml(SOUTH_INDIA.cta.heading)}</h2><p>${escapeHtml(SOUTH_INDIA.cta.intro)}</p><p><a href="/shop">Shop attars</a> <a href="/wholesale">Wholesale supply</a> <a href="/contact">Contact us</a></p></section>
</main>`
}

export function buildStaticBodyHtml(slug) {
  if (slug === 'home') return buildHomeBodyHtml()
  if (slug === 'wholesale' || slug === 'hikma-exports') return buildB2bBodyHtml(slug)
  if (slug === 'guides') return buildGuideIndexBodyHtml()
  if (slug === 'attar-perfume-shop-south-india' || slug === 'south-india') {
    return buildSouthIndiaBodyHtml()
  }

  if (slug === 'about') {
    return `<main data-prerender="true">
<header><p>${escapeHtml(ABOUT.eyebrow)}</p><h1>${escapeHtml(ABOUT.title)}</h1></header>
<section><h2>${escapeHtml(ABOUT.story.heading)}</h2>${renderParagraphs(ABOUT.story.paragraphs)}</section>
<section><h2>${escapeHtml(ABOUT.hikma.heading)}</h2>${renderParagraphs(ABOUT.hikma.paragraphs)}</section>
<section><h2>Our Standards</h2>${ABOUT.values.map((value) => `<article><h3>${escapeHtml(value.title)}</h3><p>${escapeHtml(value.description)}</p></article>`).join('')}</section>
<section><h2>FAQs</h2>${renderFaqs(ABOUT.faqs)}</section>
<p><a href="/wholesale">Wholesale enquiry</a> <a href="/hikma-exports">Hikma Exports</a></p>
</main>`
  }

  if (slug === 'contact') {
    return `<main data-prerender="true">
<header><p>${escapeHtml(CONTACT.eyebrow)}</p><h1>${escapeHtml(CONTACT.title)}</h1><p>${escapeHtml(CONTACT.subtitle)}</p></header>
${renderContact('Visit or Reach Us')}
</main>`
  }

  const simplePages = {
    shop: {
      title: 'Shop Attars, Oud & Fragrance Oils',
      intro: 'Browse alcohol-free attars, oud and concentrated fragrance oils from Arees Perfumes and Dahab, with delivery across India.',
      links: [
        { to: '/categories', label: 'Explore categories' },
        { to: '/brands', label: 'Our brands' },
        { to: '/wholesale', label: 'Wholesale enquiry' },
      ],
    },
    categories: {
      title: 'Fragrance Categories',
      intro: 'Explore attars, oud oils, fragrance oils, bakhoor and perfume packaging from Arees Perfumes in Chennai.',
      links: [
        { to: '/shop', label: 'Shop all attars' },
        { to: '/wholesale', label: 'Wholesale supply' },
        { to: '/guides', label: 'Fragrance guides' },
      ],
    },
    brands: {
      title: 'Our Fragrance Brands',
      intro: 'Discover Arees and Dahab, the retail fragrance collections of Arees Perfumes and Hikma Exports.',
      links: [
        { to: '/brand/arees', label: 'Arees Perfumes' },
        { to: '/brand/dahab', label: 'Dahab' },
        { to: '/hikma-exports', label: 'Hikma Exports' },
      ],
    },
    retail: {
      title: 'Retail Attars & Pure Perfume Oils',
      intro: 'Shop alcohol-free attars and concentrated perfume oils for personal wear, gifting and everyday use.',
      links: [
        { to: '/shop', label: 'Shop attars' },
        { to: '/categories', label: 'Categories' },
        { to: '/wholesale', label: 'Wholesale enquiry' },
      ],
    },
  }

  const page = simplePages[slug]
  if (!page) return ''
  return `<main data-prerender="true">
<header><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(page.intro)}</p></header>
<p>${renderLinks(page.links)}</p>
</main>`
}

export function buildProductBodyHtml(product) {
  if (!product?.name) return ''
  const productName = cleanProductName(product.name)
  const brandName = cleanProductName(product.brand_name) || 'Arees Perfumes'
  const categoryName = cleanProductName(product.category_name)
  const categorySlug = categoryName ? normalizeCategorySlug(product.category_slug || 'attars') : ''
  const description = cleanProductName(product.description)
    || `${productName} is an alcohol-free fragrance from Arees Perfumes, available for retail and wholesale from Chennai.`
  return `<main data-prerender="true">
<nav><a href="/">Home</a> / <a href="/shop">Shop</a>${categoryName ? ` / <a href="/categories/${escapeHtml(categorySlug)}">${escapeHtml(categoryName)}</a>` : ''}</nav>
<h1>${escapeHtml(productName)}</h1>
<p>${escapeHtml(description)}</p>
<p>Brand: ${escapeHtml(brandName)}${categoryName ? ` | Category: ${escapeHtml(categoryName)}` : ''}</p>
<p>Available for retail and wholesale from Arees Perfumes in Mannadi, Chennai.</p>
<p><a href="/wholesale">Wholesale enquiry</a> <a href="/contact">Contact us</a></p>
</main>`
}

export function buildCategoryBodyHtml(category, slug, products = []) {
  if (!category?.name) return ''
  const categoryName = cleanProductName(category.name)
  const canonicalSlug = normalizeCategorySlug(slug)
  const intro =
    category.description ||
    `Explore authentic ${categoryName} from Arees Perfumes, with alcohol-free attars and fragrance oils supplied from Chennai.`
  const links = (Array.isArray(products) ? products : [])
    .slice(0, 24)
    .map((product) => `<li><a href="/product/${escapeHtml(product.id)}">${escapeHtml(cleanProductName(product.name))}</a></li>`)
    .join('')
  return `<main data-prerender="true">
<nav><a href="/">Home</a> / <a href="/categories">Categories</a></nav>
<h1>${escapeHtml(categoryName)}</h1>
<p>${escapeHtml(intro)}</p>
${links ? `<h2>Products in this category</h2><ul>${links}</ul>` : ''}
<p><a href="/wholesale">Wholesale enquiry</a> <a href="/hikma-exports">Hikma Exports</a></p>
</main>`
}

export function buildBrandBodyHtml(brand, slug, products = []) {
  if (!brand?.name) return ''
  const brandName = cleanProductName(brand.name)
  const links = (Array.isArray(products) ? products : [])
    .slice(0, 24)
    .map((product) => `<li><a href="/product/${escapeHtml(product.id)}">${escapeHtml(cleanProductName(product.name))}</a></li>`)
    .join('')
  return `<main data-prerender="true">
<nav><a href="/">Home</a> / <a href="/brands">Brands</a></nav>
<h1>${escapeHtml(brandName)}</h1>
<p>Explore ${escapeHtml(brand.name)} attars and fragrance oils from Arees Perfumes in Chennai.</p>
${links ? `<h2>Products by ${escapeHtml(brand.name)}</h2><ul>${links}</ul>` : ''}
<p><a href="/wholesale">Wholesale enquiry</a> <a href="/contact">Contact us</a></p>
</main>`
}

// Crawlable fallback for the editorial guides. React replaces this markup
// after hydration; the initial HTML keeps the guide copy, FAQs and links.
export function buildGuideIndexBodyHtml() {
  return `<main data-prerender="true">
<header><p>Fragrance Guides</p><h1>Attar, Perfume Oil &amp; Wholesale Guides</h1><p>Practical guides to choosing, storing and sourcing attars, perfume oils and fragrance packaging from Arees Perfumes and Hikma Exports in Chennai.</p></header>
<section><h2>All Guides</h2>${GUIDES.map((guide) => `<article><h3><a href="/guides/${escapeHtml(guide.slug)}">${escapeHtml(guide.title)}</a></h3><p>${escapeHtml(guide.excerpt)}</p></article>`).join('')}</section>
</main>`
}

export function buildGuideBodyHtml(slug) {
  const guide = getGuideBySlug(slug)
  if (!guide) return ''
  return `<main data-prerender="true">
<header><p>${escapeHtml(guide.category)}</p><h1>${escapeHtml(guide.title)}</h1><p>${escapeHtml(guide.excerpt)}</p></header>
${renderSections(guide.sections)}
<section><h2>Frequently Asked Questions</h2>${renderFaqs(guide.faqs)}</section>
${guide.related?.length ? `<section><h2>Related Reading</h2><ul>${guide.related.map((item) => `<li><a href="${escapeHtml(item.to)}">${escapeHtml(item.label)}</a></li>`).join('')}</ul></section>` : ''}
</main>`
}

export async function buildSeoForRoute({ type, id, slug } = {}) {
  if (type === 'product') {
    if (!id || !UUID_RE.test(id)) throw httpError(404, 'Invalid product id')
    const data = await fetchJson(`/products/${encodeURIComponent(id)}`)
    const product = data?.product ?? data
    if (!product || !product.id) throw httpError(404, 'Product not found')
    return {
      status: 200,
      seo: buildProductSeo(product),
      bodyHtml: buildProductBodyHtml(product),
    }
  }

  if (type === 'category') {
    if (!slug) throw httpError(404, 'Missing category slug')
    const canonicalSlug = normalizeCategorySlug(slug)
    const data = await fetchJson('/categories')
    const category = (data?.categories || []).find(
      (item) => normalizeCategorySlug(item.slug) === canonicalSlug
    )
    if (!category) throw httpError(404, 'Category not found')
    let products = []
    let productsChecked = false
    try {
      const productsResult = await fetchJson(
        `/categories/${encodeURIComponent(category.slug)}/products`
      )
      products = Array.isArray(productsResult?.products) ? productsResult.products : []
      productsChecked = true
    } catch {
      // Keep the category page indexable if the product count check fails;
      // the page itself is still a valid category landing page.
    }
    const seo = buildCategorySeo(category, canonicalSlug, { products })
    if (productsChecked && products.length === 0) seo.robots = 'noindex,follow'
    return {
      status: 200,
      seo,
      bodyHtml: buildCategoryBodyHtml(category, canonicalSlug, products),
    }
  }

  if (type === 'brand') {
    if (!slug) throw httpError(404, 'Missing brand slug')
    const apiSlug = brandApiSlug(slug)
    const publicSlug = brandPublicSlug(slug)
    if (!apiSlug || !publicSlug) throw httpError(404, 'Brand not found')
    const [data, productsResult] = await Promise.allSettled([
      fetchJson('/brands'),
      fetchJson(`/brands/${encodeURIComponent(apiSlug)}/products`),
    ])
    if (data.status === 'rejected') throw data.reason
    const brand = (data.value?.brands || []).find((item) => String(item.slug) === String(apiSlug))
    if (!brand) throw httpError(404, 'Brand not found')
    let products = []
    let productsChecked = false
    if (productsResult.status === 'fulfilled') {
      products = Array.isArray(productsResult.value?.products) ? productsResult.value.products : []
      productsChecked = true
    }
    const seo = buildBrandSeo(brand, publicSlug, { products })
    if (productsChecked && products.length === 0) seo.robots = 'noindex,follow'
    return {
      status: 200,
      seo,
      bodyHtml: buildBrandBodyHtml(brand, publicSlug, products),
    }
  }

  if (type === 'guide') {
    if (!slug) throw httpError(404, 'Missing guide slug')
    const guide = getGuideBySlug(slug)
    if (!guide) throw httpError(404, 'Guide not found')
    return {
      status: 200,
      seo: buildGuideSeo(guide),
      bodyHtml: buildGuideBodyHtml(slug),
    }
  }

  if (type === 'page') {
    if (!slug) throw httpError(404, 'Missing page slug')
    const seo = slug === 'home' ? buildHomeSeo() : buildStaticPageSeo(slug)
    if (!seo) throw httpError(404, 'Page not found')
    return {
      status: 200,
      seo,
      bodyHtml: buildStaticBodyHtml(slug),
    }
  }

  if (type === 'utility') {
    const seo = buildUtilitySeo(slug)
    if (!seo) throw httpError(404, 'Page not found')
    return {
      status: 200,
      seo,
      bodyHtml: '',
    }
  }

  throw httpError(404, 'Unknown route')
}

export function injectSeoHtml(shellHtml, seo, bodyHtml = '') {
  const canonicalUrl = seo?.canonical ? absoluteUrl(seo.canonical) : ''
  const isHome = canonicalUrl === CANONICAL_ORIGIN || canonicalUrl === `${CANONICAL_ORIGIN}/`
  const imageUrl = absoluteUrl(seo?.image)
  const title = escapeHtml(seo?.title || 'Arees Perfumes')
  const description = escapeHtml(seo?.description || '')
  const robots = escapeHtml(seo?.robots || 'index,follow')
  const type = escapeHtml(seo?.type || 'website')

  const schemas = (Array.isArray(seo?.schema) ? seo.schema : [seo?.schema]).filter(Boolean)
  const jsonLd = schemas
    .map(
      (item) =>
        `<script type="application/ld+json" data-seo="true">${JSON.stringify(item).replace(/</g, '\\u003c')}</script>`
    )
    .join('\n')

  const canonicalTag = canonicalUrl
    ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
    : ''
  const ogUrlTag = canonicalUrl
    ? `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
    : ''
  const head = `<title>${title}</title>
<meta name="description" content="${description}" />
<meta name="robots" content="${robots}" />
${canonicalTag}
<meta property="og:site_name" content="Arees Perfumes" />
<meta property="og:type" content="${type}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
${ogUrlTag}
<meta property="og:image" content="${escapeHtml(imageUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
${jsonLd}`

  let html = String(shellHtml || '')
  html = html
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
  if (!isHome) {
    html = html.replace(/<link[^>]+href=["']\/Hero(?:-mobile)?\.webp["'][^>]*>/gi, '')
  }
  html = html.replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')

  if (bodyHtml) {
    html = html.replace(
      /<div id=["']root["'][^>]*>\s*<\/div>/i,
      () => `<div id="root">${bodyHtml}</div>`
    )
  }

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${head}\n</head>`)
  }
  return `${head}\n${html}`
}

async function fetchShell(req) {
  const headers = req?.headers || {}
  const proto = String(headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const host = String(headers['x-forwarded-host'] || headers.host || '').split(',')[0].trim()

  const candidates = []
  if (host) candidates.push(`${proto}://${host}/index.html`)
  if (process.env.VERCEL_URL) candidates.push(`https://${process.env.VERCEL_URL}/index.html`)
  candidates.push(`${CANONICAL_ORIGIN}/index.html`)

  let lastError = null
  for (const url of [...new Set(candidates)]) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), SHELL_TIMEOUT_MS)
    try {
      const res = await fetch(url, { headers: { accept: 'text/html' }, signal: controller.signal })
      if (res.ok) {
        const html = await res.text()
        if (html.includes('id="root"')) return html
        lastError = new Error(`Shell ${url} did not contain the app root`)
      } else {
        lastError = new Error(`Shell ${url} responded ${res.status}`)
      }
    } catch (error) {
      lastError = error
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError || new Error('Unable to load the HTML shell')
}

export default async function handler(req, res) {
  const query = readQuery(req)
  const type = String(query.type || '')
  const id = String(query.id || '')
  const slug = String(query.slug || '')

  let status = 200
  let seo
  let bodyHtml = ''

  try {
    const result = await buildSeoForRoute({ type, id, slug })
    status = result.status
    seo = result.seo
    bodyHtml = result.bodyHtml || ''
  } catch (error) {
    if (error?.status === 404) {
      status = 404
      seo = buildNotFoundSeo()
    } else {
      console.error('[meta] failed to build SEO:', error)
      status = 503
      seo = {
        ...buildNotFoundSeo(),
        title: 'Temporarily Unavailable | Arees Perfumes',
        description: 'We could not load this page right now. Please try again shortly.',
        robots: 'noindex,nofollow',
      }
    }
  }

  if (
    status === 200 &&
    type === 'category' &&
    seo?.canonical &&
    seo.canonical !== `/categories/${slug}`
  ) {
    res.statusCode = 301
    res.setHeader('Location', `${CANONICAL_ORIGIN}${seo.canonical}`)
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600')
    res.end()
    return
  }

  if (
    status === 200 &&
    type === 'brand' &&
    seo?.canonical &&
    seo.canonical !== `/brand/${slug}`
  ) {
    res.statusCode = 301
    res.setHeader('Location', `${CANONICAL_ORIGIN}${seo.canonical}`)
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600')
    res.end()
    return
  }

  let shell
  try {
    shell = await fetchShell(req)
  } catch (error) {
    console.error('[meta] failed to fetch the HTML shell:', error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end('Unable to render page.')
    return
  }

  const html = injectSeoHtml(shell, seo, status === 200 ? bodyHtml : '')
  res.statusCode = status
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader(
    'Cache-Control',
    status === 200 ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400' : 'no-store'
  )
  if (status !== 200) res.setHeader('X-Robots-Tag', 'noindex, follow')
  if (status === 503) res.setHeader('Retry-After', '300')
  if (req?.method === 'HEAD') {
    res.end()
    return
  }
  res.end(html)
}
