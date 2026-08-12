// ============================================================================
// SEO helpers — unit tests for storefront/src/utils/seo.js
//
// Covers the pure sitemap.xml / robots.txt generation used by the Vercel
// serverless functions, and the canonical site-URL resolution.
//
// Run with:  npm test  (storefront)
// ============================================================================

import { describe, expect, it } from 'vitest'
import { buildRobotsTxt, buildSitemapXml, resolveSiteUrl, xmlEscape } from './seo'

describe('resolveSiteUrl', () => {
  it('prefers an explicit SITE_URL over request headers', () => {
    expect(resolveSiteUrl('https://example.com/', { 'x-forwarded-host': 'other.com' })).toBe('https://example.com')
  })

  it('derives the base URL from the forwarded host', () => {
    expect(resolveSiteUrl(null, { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'areesperfumes.in' })).toBe(
      'https://areesperfumes.in'
    )
  })

  it('defaults to https when the proto header is missing', () => {
    expect(resolveSiteUrl(null, { host: 'my-app-git-fix-1a2b3c.vercel.app' })).toBe(
      'https://my-app-git-fix-1a2b3c.vercel.app'
    )
  })

  it('throws when no host and no SITE_URL are available', () => {
    expect(() => resolveSiteUrl(null, {})).toThrow()
  })
})

describe('buildSitemapXml', () => {
  it('emits static pages, categories, brands and products with lastmod', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://areesperfumes.in',
      categories: [{ slug: 'perfume-oils', created_at: '2026-08-01T10:00:00Z' }],
      brands: [{ slug: 'arees', created_at: '2026-07-15T10:00:00Z' }],
      products: [{ id: 'prod-abc', created_at: '2026-08-13T09:00:00Z' }],
    })
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('<loc>https://areesperfumes.in/</loc>')
    expect(xml).toContain('<loc>https://areesperfumes.in/shop</loc>')
    expect(xml).toContain('<loc>https://areesperfumes.in/categories</loc>')
    expect(xml).toContain('<loc>https://areesperfumes.in/about</loc>')
    expect(xml).toContain('<loc>https://areesperfumes.in/contact</loc>')
    expect(xml).toContain('<loc>https://areesperfumes.in/track-order</loc>')
    expect(xml).toContain('<loc>https://areesperfumes.in/categories/perfume-oils</loc>')
    expect(xml).toContain('<lastmod>2026-08-01</lastmod>')
    expect(xml).toContain('<loc>https://areesperfumes.in/brand/arees</loc>')
    expect(xml).toContain('<loc>https://areesperfumes.in/product/prod-abc</loc>')
    expect(xml).toContain('<lastmod>2026-08-13</lastmod>')
    expect(xml.endsWith('</urlset>')).toBe(true)
  })

  it('skips rows without a usable slug/id', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://areesperfumes.in',
      pages: [],
      categories: [{ slug: null, created_at: '2026-01-01T00:00:00Z' }, { slug: '', created_at: '2026-01-01T00:00:00Z' }, {}],
      brands: [{ slug: undefined }, {}],
      products: [{ id: null }, {}],
    })
    expect(xml).not.toContain('<loc>')
    expect(xml).toContain('</urlset>')
  })

  it('omits <lastmod> when created_at is missing', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://areesperfumes.in',
      pages: [],
      categories: [],
      brands: [{ slug: 'ok', created_at: null }],
      products: [{ id: 'p1' }],
    })
    expect(xml).toContain('<loc>https://areesperfumes.in/brand/ok</loc>')
    expect(xml).toContain('<loc>https://areesperfumes.in/product/p1</loc>')
    expect(xml).not.toContain('<lastmod>')
  })

  it('escapes XML special characters in URLs', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://areesperfumes.in',
      pages: [],
      categories: [{ slug: 'a&b<c>', created_at: null }],
      brands: [],
      products: [],
    })
    expect(xml).toContain('a&amp;b&lt;c&gt;')
  })

  it('never emits the transactional / private routes', () => {
    const xml = buildSitemapXml({ baseUrl: 'https://areesperfumes.in' })
    expect(xml).not.toContain('/cart')
    expect(xml).not.toContain('/checkout')
    expect(xml).not.toContain('/view-order')
  })

  it('strips trailing slashes from the base URL (no double slashes)', () => {
    const xml = buildSitemapXml({ baseUrl: 'https://areesperfumes.in/', pages: ['/shop'], categories: [], brands: [], products: [] })
    expect(xml).toContain('<loc>https://areesperfumes.in/shop</loc>')
    expect(xml).not.toContain('//shop')
  })
})

describe('buildRobotsTxt', () => {
  it('allows public crawling, disallows private routes and references the sitemap', () => {
    const txt = buildRobotsTxt('https://areesperfumes.in/')
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Allow: /')
    expect(txt).toContain('Disallow: /api/')
    expect(txt).toContain('Disallow: /admin/')
    expect(txt).toContain('Disallow: /cart')
    expect(txt).toContain('Disallow: /checkout')
    expect(txt).toContain('Disallow: /view-order')
    expect(txt).toContain('Sitemap: https://areesperfumes.in/sitemap.xml')
    expect(txt).not.toContain('//sitemap.xml')
  })
})

describe('xmlEscape', () => {
  it('escapes all five XML special characters', () => {
    expect(xmlEscape(`a & b < c > d " e ' f`)).toBe('a &amp; b &lt; c &gt; d &quot; e &apos; f')
  })
  it('handles null/undefined as empty strings', () => {
    expect(xmlEscape(null)).toBe('')
    expect(xmlEscape(undefined)).toBe('')
  })
})
