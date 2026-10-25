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
  buildProductSeo,
  buildCategorySeo,
  buildBrandSeo,
  buildStaticPageSeo,
} from '../src/utils/seo.js'
import { BUSINESS, HIKMA_EXPORTS, WHOLESALE } from '../src/data/content.js'

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

export function buildNotFoundSeo(path = '/') {
  return {
    title: 'Page Not Found | Arees Perfumes',
    description: 'The page you requested could not be found. Browse authentic attars, oud, and fragrance oils at Arees Perfumes.',
    canonical: path || '/',
    image: DEFAULT_OG_IMAGE,
    type: 'website',
    robots: 'noindex,follow',
    schema: [],
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

// Raw, crawlable fallback for the two B2B landing pages. The React app
// replaces this markup when it mounts; the no-JS/crawler path keeps the
// page's primary copy, FAQs and contact details in the initial HTML.
export function buildB2bBodyHtml(slug) {
  const contactHeading = slug === 'hikma-exports' ? 'Contact Hikma Exports' : 'Contact the Wholesale Desk'
  const contact = `<section><h2>${contactHeading}</h2><p>${escapeHtml(BUSINESS.address)}</p><p>Phone / WhatsApp: <a href="tel:${escapeHtml(BUSINESS.phoneTel)}">${escapeHtml(BUSINESS.phoneDisplay)}</a></p><p>Email: <a href="mailto:${escapeHtml(BUSINESS.email)}">${escapeHtml(BUSINESS.email)}</a></p></section>`

  if (slug === 'wholesale') {
    return `<main data-prerender="true">
<header><p>${escapeHtml(WHOLESALE.eyebrow)}</p><h1>${escapeHtml(WHOLESALE.title)}</h1><p>${escapeHtml(WHOLESALE.intro)}</p></header>
${renderSections(WHOLESALE.sections)}
<section><h2>What to Include in Your Wholesale Enquiry</h2><ul>${WHOLESALE.buyerChecklist.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
<section><h2>Wholesale &amp; Export FAQs</h2>${renderFaqs(WHOLESALE.faqs)}</section>
${contact}
</main>`
  }

  if (slug === 'hikma-exports') {
    return `<main data-prerender="true">
<header><p>${escapeHtml(HIKMA_EXPORTS.eyebrow)}</p><h1>${escapeHtml(HIKMA_EXPORTS.title)}</h1><p>${escapeHtml(HIKMA_EXPORTS.intro)}</p></header>
<section>${renderParagraphs(HIKMA_EXPORTS.introParagraphs)}</section>
${renderSections(HIKMA_EXPORTS.sections)}
<section><h2>What Hikma Exports Supplies</h2>${HIKMA_EXPORTS.offerings.map((item) => `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`).join('')}</section>
<section><h2>Hikma Exports FAQs</h2>${renderFaqs(HIKMA_EXPORTS.faqs)}</section>
${contact}
</main>`
  }

  return ''
}

export async function buildSeoForRoute({ type, id, slug } = {}) {
  if (type === 'product') {
    if (!id || !UUID_RE.test(id)) throw httpError(404, 'Invalid product id')
    const data = await fetchJson(`/products/${encodeURIComponent(id)}`)
    const product = data?.product ?? data
    if (!product || !product.id) throw httpError(404, 'Product not found')
    return { status: 200, seo: buildProductSeo(product) }
  }

  if (type === 'category') {
    if (!slug) throw httpError(404, 'Missing category slug')
    const [data, productsResult] = await Promise.allSettled([
      fetchJson('/categories'),
      fetchJson(`/categories/${encodeURIComponent(slug)}/products`),
    ])
    if (data.status === 'rejected') throw data.reason
    const category = (data.value?.categories || []).find((item) => String(item.slug) === String(slug))
    if (!category) throw httpError(404, 'Category not found')
    const seo = buildCategorySeo(category, slug)
    if (productsResult.status === 'fulfilled') {
      const productCount = Array.isArray(productsResult.value?.products)
        ? productsResult.value.products.length
        : 0
      if (productCount === 0) seo.robots = 'noindex,follow'
    }
    return { status: 200, seo }
  }

  if (type === 'brand') {
    if (!slug) throw httpError(404, 'Missing brand slug')
    const resolvedSlug = slug === 'arees-luxury' ? 'oud-al-haramain' : slug
    const [data, productsResult] = await Promise.allSettled([
      fetchJson('/brands'),
      fetchJson(`/brands/${encodeURIComponent(resolvedSlug)}/products`),
    ])
    if (data.status === 'rejected') throw data.reason
    const brand = (data.value?.brands || []).find((item) => String(item.slug) === String(resolvedSlug))
    if (!brand) throw httpError(404, 'Brand not found')
    const seo = buildBrandSeo(brand, slug)
    if (productsResult.status === 'fulfilled') {
      const productCount = Array.isArray(productsResult.value?.products)
        ? productsResult.value.products.length
        : 0
      if (productCount === 0) seo.robots = 'noindex,follow'
    }
    return { status: 200, seo }
  }

  if (type === 'page') {
    if (!slug) throw httpError(404, 'Missing page slug')
    const seo = buildStaticPageSeo(slug)
    if (!seo) throw httpError(404, 'Page not found')
    return { status: 200, seo }
  }

  throw httpError(404, 'Unknown route')
}

export function injectSeoHtml(shellHtml, seo, bodyHtml = '') {
  const canonicalUrl = absoluteUrl(seo?.canonical)
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

  const head = `<title>${title}</title>
<meta name="description" content="${description}" />
<meta name="robots" content="${robots}" />
<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
<meta property="og:site_name" content="Arees Perfumes" />
<meta property="og:type" content="${type}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
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
    .replace(/<link[^>]+href=["']\/Hero(?:-mobile)?\.webp["'][^>]*>/gi, '')
    .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')

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
  const fallbackPath =
    type === 'product'
      ? `/product/${id}`
      : type === 'category'
        ? `/categories/${slug}`
        : type === 'brand'
          ? `/brand/${slug}`
          : type === 'page'
            ? `/${slug}`
            : '/'

  let status = 200
  let seo

  try {
    const result = await buildSeoForRoute({ type, id, slug })
    status = result.status
    seo = result.seo
  } catch (error) {
    if (error?.status === 404) {
      status = 404
      seo = buildNotFoundSeo(fallbackPath)
    } else {
      console.error('[meta] failed to build SEO:', error)
      status = 503
      seo = {
        ...buildNotFoundSeo(fallbackPath),
        title: 'Temporarily Unavailable | Arees Perfumes',
        description: 'We could not load this page right now. Please try again shortly.',
        robots: 'noindex,nofollow',
      }
    }
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

  const bodyHtml = status === 200 && type === 'page' ? buildB2bBodyHtml(slug) : ''
  const html = injectSeoHtml(shell, seo, bodyHtml)
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
