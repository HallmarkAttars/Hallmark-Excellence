// ============================================================================
// SEO helpers — unit tests for storefront/src/utils/seo.js
//
// Covers:
//   - Canonical origin & brand defaults
//   - Site URL resolution
//   - Sitemap.xml generation (public pages only, excludes private/utility pages)
//   - Robots.txt generation (proper disallows, does not block public pages)
//   - Schema.org builders (Organization, WebSite, LocalBusiness, Product, Breadcrumbs)
//   - Binary stock availability in Product Schema (InStock vs OutOfStock)
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
  buildRobotsTxt,
  buildSitemapXml,
  resolveSiteUrl,
  xmlEscape,
  CANONICAL_ORIGIN,
  DEFAULT_BRAND,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  STATIC_PAGES,
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildLocalBusinessSchema,
  buildProductSchema,
  buildBreadcrumbsSchema,
} from './seo'

describe('canonical domain & brand identity', () => {
  it('pins the apex as the canonical origin (never www)', () => {
    expect(CANONICAL_ORIGIN).toBe('https://areesperfumes.in')
  })

  it('sets Arees Perfumes as the primary brand name', () => {
    expect(DEFAULT_BRAND).toBe('Arees Perfumes')
  })

  it('provides a strong default homepage title containing Arees Perfumes and Chennai', () => {
    expect(DEFAULT_TITLE).toContain('Arees Perfumes')
    expect(DEFAULT_TITLE).toContain('Chennai')
  })

  it('provides a descriptive homepage meta description', () => {
    expect(DEFAULT_DESCRIPTION).toContain('Arees Perfumes')
    expect(DEFAULT_DESCRIPTION.length).toBeGreaterThan(50)
    expect(DEFAULT_DESCRIPTION.length).toBeLessThan(180)
  })
})

describe('resolveSiteUrl', () => {
  it('prefers an explicit SITE_URL over request headers', () => {
    expect(resolveSiteUrl('https://example.com/', { 'x-forwarded-host': 'other.com' })).toBe('https://example.com')
  })

  it('normalizes a www forwarded host to the apex (sitemap/robots never emit www)', () => {
    expect(resolveSiteUrl(null, { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'www.areesperfumes.in' })).toBe(
      'https://areesperfumes.in'
    )
    expect(resolveSiteUrl(null, { host: 'www.areesperfumes.in' })).toBe('https://areesperfumes.in')
    expect(resolveSiteUrl(null, { 'x-forwarded-host': 'WWW.AREESPERFUMES.IN' })).toBe('https://areesperfumes.in')
  })

  it('derives the base URL from the forwarded host', () => {
    expect(resolveSiteUrl(null, { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'areesperfumes.in' })).toBe(
      'https://areesperfumes.in'
    )
  })

  it('throws when no host and no SITE_URL are available', () => {
    expect(() => resolveSiteUrl(null, {})).toThrow()
  })
})

describe('buildSitemapXml', () => {
  it('emits public indexable commercial pages only (excludes track-order, cart, checkout)', () => {
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
    expect(xml).toContain('<loc>https://areesperfumes.in/brand/arees</loc>')
    expect(xml).toContain('<loc>https://areesperfumes.in/product/prod-abc</loc>')
    // Private/utility routes must NOT be in sitemap:
    expect(xml).not.toContain('/track-order')
    expect(xml).not.toContain('/cart')
    expect(xml).not.toContain('/checkout')
    expect(xml).not.toContain('/view-order')
    expect(xml).not.toContain('/admin')
    expect(xml.endsWith('</urlset>')).toBe(true)
  })

  it('skips rows without a usable slug/id', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://areesperfumes.in',
      pages: [],
      categories: [{ slug: null }, { slug: '' }, {}],
      brands: [{ slug: undefined }, {}],
      products: [{ id: null }, {}],
    })
    expect(xml).not.toContain('<loc>')
    expect(xml).toContain('</urlset>')
  })
})

describe('buildRobotsTxt', () => {
  it('allows public crawling and disallows utility/private paths', () => {
    const robots = buildRobotsTxt('https://areesperfumes.in')
    expect(robots).toContain('User-agent: *')
    expect(robots).toContain('Allow: /')
    expect(robots).toContain('Disallow: /api/')
    expect(robots).toContain('Disallow: /admin/')
    expect(robots).toContain('Disallow: /cart')
    expect(robots).toContain('Disallow: /checkout')
    expect(robots).toContain('Disallow: /track-order')
    expect(robots).toContain('Disallow: /view-order')
    expect(robots).toContain('Disallow: /account')
    expect(robots).toContain('Sitemap: https://areesperfumes.in/sitemap.xml')
  })

  it('does NOT block public product, category, shop, or brand paths', () => {
    const robots = buildRobotsTxt()
    expect(robots).not.toContain('Disallow: /shop')
    expect(robots).not.toContain('Disallow: /product')
    expect(robots).not.toContain('Disallow: /brand')
    expect(robots).not.toContain('Disallow: /categories')
  })
})

describe('Schema.org JSON-LD Builders', () => {
  describe('buildOrganizationSchema', () => {
    it('generates valid Organization schema for Arees Perfumes', () => {
      const schema = buildOrganizationSchema()
      expect(schema['@context']).toBe('https://schema.org')
      expect(schema['@type']).toBe('Organization')
      expect(schema.name).toBe('Arees Perfumes')
      expect(schema.url).toBe('https://areesperfumes.in')
      expect(schema.telephone).toBe('+919840750467')
      expect(schema.email).toBe('hikmaexports@gmail.com')
    })
  })

  describe('buildWebSiteSchema', () => {
    it('generates valid WebSite schema', () => {
      const schema = buildWebSiteSchema()
      expect(schema['@type']).toBe('WebSite')
      expect(schema.name).toBe('Arees Perfumes')
      expect(schema.url).toBe('https://areesperfumes.in')
    })
  })

  describe('buildLocalBusinessSchema', () => {
    it('generates accurate Chennai LocalBusiness schema from verified data', () => {
      const schema = buildLocalBusinessSchema()
      expect(schema['@type']).toBe('LocalBusiness')
      expect(schema.name).toBe('Arees Perfumes')
      expect(schema.address.addressLocality).toBe('Chennai')
      expect(schema.address.postalCode).toBe('600001')
      expect(schema.address.streetAddress).toContain('Moore St')
      expect(schema.telephone).toBe('+919840750467')
    })
  })

  describe('buildProductSchema', () => {
    it('returns null for null product', () => {
      expect(buildProductSchema(null)).toBeNull()
    })

    it('generates Product schema with InStock availability when is_in_stock is true', () => {
      const product = {
        id: 'p-101',
        name: 'Arees Black Musk',
        price: 450,
        image: 'https://example.com/musk.jpg',
        description: 'Fine black musk attar.',
        brand_name: 'Arees Perfumes',
        category_name: 'Attar',
        is_in_stock: true,
      }
      const schema = buildProductSchema(product)
      expect(schema['@context']).toBe('https://schema.org')
      expect(schema['@type']).toBe('Product')
      expect(schema.name).toBe('Arees Black Musk')
      expect(schema.brand.name).toBe('Arees Perfumes')
      expect(schema.offers.price).toBe(450)
      expect(schema.offers.priceCurrency).toBe('INR')
      expect(schema.offers.availability).toBe('https://schema.org/InStock')
      expect(schema.offers.url).toBe('https://areesperfumes.in/product/p-101')
    })

    it('generates Product schema with OutOfStock availability when is_in_stock is false', () => {
      const product = {
        id: 'p-102',
        name: 'Arees White Oudh',
        price: 850,
        brand_name: 'Arees Perfumes',
        is_in_stock: false,
      }
      const schema = buildProductSchema(product)
      expect(schema.offers.availability).toBe('https://schema.org/OutOfStock')
    })

    it('never includes numerical stock quantities in schema', () => {
      const product = {
        id: 'p-103',
        name: 'Arees Amber Rose',
        price: 600,
        stock: 500,
        is_in_stock: true,
      }
      const schema = buildProductSchema(product)
      expect(JSON.stringify(schema)).not.toContain('500')
      expect(schema.offers.availability).toBe('https://schema.org/InStock')
    })
  })

  describe('buildBreadcrumbsSchema', () => {
    it('generates BreadcrumbList schema with 1-based positions', () => {
      const crumbs = [
        { name: 'Home', path: '/' },
        { name: 'Categories', path: '/categories' },
        { name: 'Attars', path: '/categories/attars' },
      ]
      const schema = buildBreadcrumbsSchema(crumbs)
      expect(schema['@type']).toBe('BreadcrumbList')
      expect(schema.itemListElement).toHaveLength(3)
      expect(schema.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://areesperfumes.in/',
      })
      expect(schema.itemListElement[2]).toEqual({
        '@type': 'ListItem',
        position: 3,
        name: 'Attars',
        item: 'https://areesperfumes.in/categories/attars',
      })
    })
  })
})
