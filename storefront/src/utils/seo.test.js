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
  buildHikmaExportsSchema,
  buildWholesaleServiceSchema,
  buildFAQSchema,
  buildProductSchema,
  buildBreadcrumbsSchema,
  buildProductSeo,
  buildCategorySeo,
  buildBrandSeo,
  buildWholesaleSeo,
  buildHikmaExportsSeo,
  buildSouthIndiaSeo,
  buildGuidesIndexSeo,
  buildGuideSeo,
  buildArticleSchema,
  buildStaticPageSeo,
} from './seo'
import { normalizeCategorySlug } from './categorySlug'
import { GUIDES } from '../data/guides.js'

describe('canonical domain & brand identity', () => {
  it('pins the live www host as the canonical origin', () => {
    expect(CANONICAL_ORIGIN).toBe('https://www.areesperfumes.in')
  })

  it('sets Arees Perfumes as the primary brand name', () => {
    expect(DEFAULT_BRAND).toBe('Arees Perfumes')
  })

  it('provides a strong default homepage title containing Arees Perfumes and Chennai', () => {
    expect(DEFAULT_TITLE).toContain('Arees Perfumes')
    expect(DEFAULT_TITLE).toContain('Hikma Perfumes')
    expect(DEFAULT_TITLE).toContain('Chennai')
  })

  it('provides a descriptive homepage meta description', () => {
    expect(DEFAULT_DESCRIPTION).toContain('Arees Perfumes')
    expect(DEFAULT_DESCRIPTION.length).toBeGreaterThan(50)
    expect(DEFAULT_DESCRIPTION.length).toBeLessThan(180)
  })
})

describe('category slug normalization', () => {
  it('trims whitespace and maps the legacy display-bottles slug', () => {
    expect(normalizeCategorySlug('Display bottles ')).toBe('display-bottles')
    expect(normalizeCategorySlug('Display%20bottles%20')).toBe('display-bottles')
    expect(normalizeCategorySlug('display-bottles')).toBe('display-bottles')
  })

  it('keeps existing numeric and simple slugs unchanged', () => {
    expect(normalizeCategorySlug('1')).toBe('1')
    expect(normalizeCategorySlug('10')).toBe('10')
    expect(normalizeCategorySlug('Roll on')).toBe('Roll on')
  })
})

describe('resolveSiteUrl', () => {
  it('prefers an explicit SITE_URL over request headers', () => {
    expect(resolveSiteUrl('https://example.com/', { 'x-forwarded-host': 'other.com' })).toBe('https://example.com')
  })

  it('normalizes the apex forwarded host to the live www host', () => {
    expect(resolveSiteUrl(null, { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'areesperfumes.in' })).toBe(
      'https://www.areesperfumes.in'
    )
    expect(resolveSiteUrl(null, { host: 'areesperfumes.in' })).toBe('https://www.areesperfumes.in')
    expect(resolveSiteUrl(null, { 'x-forwarded-host': 'AREESPERFUMES.IN' })).toBe('https://www.areesperfumes.in')
  })

  it('keeps the www forwarded host as the base URL', () => {
    expect(resolveSiteUrl(null, { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'www.areesperfumes.in' })).toBe(
      'https://www.areesperfumes.in'
    )
  })

  it('throws when no host and no SITE_URL are available', () => {
    expect(() => resolveSiteUrl(null, {})).toThrow()
  })
})

describe('buildSitemapXml', () => {
  it('emits public indexable commercial pages only (excludes track-order, cart, checkout)', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://www.areesperfumes.in',
      categories: [{ slug: 'perfume-oils', created_at: '2026-08-01T10:00:00Z' }],
      brands: [{ slug: 'arees', created_at: '2026-07-15T10:00:00Z' }],
      products: [{ id: 'prod-abc', created_at: '2026-08-13T09:00:00Z' }],
    })
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/shop</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/categories</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/brands</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/wholesale</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/hikma-exports</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/retail</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/attar-perfume-shop-south-india</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/about</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/contact</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/brand/arees</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/product/prod-abc</loc>')
    // Private/utility routes must NOT be in sitemap:
    expect(xml).not.toContain('/track-order')
    expect(xml).not.toContain('/cart')
    expect(xml).not.toContain('/checkout')
    expect(xml).not.toContain('/view-order')
    expect(xml).not.toContain('/admin')
    expect(xml.endsWith('</urlset>')).toBe(true)
  })

  it('skips rows without a usable slug/id or where is_active is false', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://www.areesperfumes.in',
      pages: [],
      categories: [{ slug: null }, { slug: '' }, {}, { slug: 'hidden', is_active: false }],
      brands: [{ slug: undefined }, {}, { slug: 'archived', is_active: false }],
      products: [{ id: null }, {}, { id: 'p-deleted', is_active: false }],
      guides: [],
    })
    expect(xml).not.toContain('<loc>')
    expect(xml).toContain('</urlset>')
  })

  it('properly URL-encodes slugs with spaces and deduplicates URLs', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://www.areesperfumes.in',
      pages: ['/shop', '/shop'],
      categories: [{ slug: 'Roll on' }, { slug: 'Roll on' }],
      brands: [],
      products: [],
    })
    expect(xml).toContain('<loc>https://www.areesperfumes.in/categories/Roll%20on</loc>')
    expect(xml).not.toContain('/categories/Roll on<')
    const count = (xml.match(/<loc>https:\/\/www\.areesperfumes\.in\/shop<\/loc>/g) || []).length
    expect(count).toBe(1)
  })

  it('emits the canonical display-bottles category URL without a trailing space', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://www.areesperfumes.in',
      pages: [],
      categories: [{ id: 'c-1', slug: 'Display bottles ', name: 'Canter Bottle' }],
      brands: [],
      products: [{ id: 'p-1', category_id: 'c-1' }],
      guides: [],
    })
    expect(xml).toContain('<loc>https://www.areesperfumes.in/categories/display-bottles</loc>')
    expect(xml).not.toContain('Display%20bottles%20')
  })

  it('includes the guides index and guide articles', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://www.areesperfumes.in',
      pages: ['/guides'],
      categories: [],
      brands: [],
      products: [],
      guides: [{ slug: 'attar-vs-perfume-oil', updated: '2026-10-26' }],
    })
    expect(xml).toContain('<loc>https://www.areesperfumes.in/guides</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/guides/attar-vs-perfume-oil</loc>')
    expect(xml).toContain('<lastmod>2026-10-26</lastmod>')
  })

  it('uses updated_at for lastmod and keeps the Arees Luxury brand URL', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://www.areesperfumes.in',
      pages: [],
      categories: [],
      brands: [
        {
          slug: 'oud-al-haramain',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-08-02T12:00:00Z',
        },
      ],
      products: [],
    })
    expect(xml).toContain('<loc>https://www.areesperfumes.in/brand/oud-al-haramain</loc>')
    expect(xml).toContain('<loc>https://www.areesperfumes.in/brand/arees-luxury</loc>')
    expect((xml.match(/<lastmod>2026-08-02<\/lastmod>/g) || []).length).toBe(2)
  })

  it('lists only categories and brands that have at least one live product', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://www.areesperfumes.in',
      pages: [],
      categories: [
        { id: 'c-1', slug: 'roll-on-attars' },
        { id: 'c-2', slug: 'empty-category' },
      ],
      brands: [
        { id: 'b-1', slug: 'arees' },
        { id: 'b-2', slug: 'empty-brand' },
      ],
      products: [
        { id: 'p-1', category_id: 'c-1', category_slug: 'roll-on-attars', brand_id: 'b-1', brand_slug: 'arees' },
      ],
    })
    expect(xml).toContain('/categories/roll-on-attars')
    expect(xml).toContain('/brand/arees')
    expect(xml).not.toContain('/categories/empty-category')
    expect(xml).not.toContain('/brand/empty-brand')
  })
})

describe('buildRobotsTxt', () => {
  it('allows public crawling and disallows utility/private paths', () => {
    const robots = buildRobotsTxt('https://www.areesperfumes.in')
    expect(robots).toContain('User-agent: *')
    expect(robots).toContain('Allow: /')
    expect(robots).toContain('Disallow: /api/')
    expect(robots).toContain('Disallow: /admin/')
    expect(robots).toContain('Disallow: /cart')
    expect(robots).toContain('Disallow: /checkout')
    expect(robots).toContain('Disallow: /track-order')
    expect(robots).toContain('Disallow: /view-order')
    expect(robots).toContain('Disallow: /account')
    expect(robots).toContain('Sitemap: https://www.areesperfumes.in/sitemap.xml')
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
      expect(schema.alternateName).toContain('Hikma Perfumes')
      expect(schema.parentOrganization.name).toBe('Hikma Exports')
      expect(schema.description).toContain('parent company of Arees & Dahab')
      expect(schema.address.addressLocality).toBe('Chennai')
      expect(schema.url).toBe('https://www.areesperfumes.in')
      expect(schema.telephone).toBe('+919840750467')
      expect(schema.email).toBe('hikmaexports@gmail.com')
    })
  })

  describe('buildWebSiteSchema', () => {
    it('generates valid WebSite schema', () => {
      const schema = buildWebSiteSchema()
      expect(schema['@type']).toBe('WebSite')
      expect(schema.name).toBe('Arees Perfumes')
      expect(schema.alternateName).toBe('Hikma Perfumes')
      expect(schema.url).toBe('https://www.areesperfumes.in')
    })
  })

  describe('buildLocalBusinessSchema', () => {
    it('generates accurate Chennai LocalBusiness schema from verified data', () => {
      const schema = buildLocalBusinessSchema()
      expect(schema['@type']).toBe('LocalBusiness')
      expect(schema.name).toBe('Arees Perfumes')
      expect(schema.alternateName).toContain('Hikma Perfumes')
      expect(schema.parentOrganization.name).toBe('Hikma Exports')
      expect(schema.address.addressLocality).toBe('Chennai')
      expect(schema.address.postalCode).toBe('600001')
      expect(schema.address.streetAddress).toContain('Moore St')
      expect(schema.telephone).toBe('+919840750467')
    })
  })

  describe('buildFAQSchema', () => {
    it('builds a FAQPage from question/answer pairs', () => {
      const schema = buildFAQSchema([
        { question: 'Where is Hikma Perfumes located?', answer: 'Chennai.' },
      ])
      expect(schema['@type']).toBe('FAQPage')
      expect(schema.mainEntity).toHaveLength(1)
      expect(schema.mainEntity[0].name).toBe('Where is Hikma Perfumes located?')
      expect(schema.mainEntity[0].acceptedAnswer.text).toBe('Chennai.')
    })

    it('returns null when there are no usable FAQs', () => {
      expect(buildFAQSchema([])).toBeNull()
      expect(buildFAQSchema([{ question: 'Missing answer' }])).toBeNull()
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
      expect(schema.offers.url).toBe('https://www.areesperfumes.in/product/p-101')
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

    it('uses the selected variant total price and variant sku', () => {
      const product = {
        id: 'p-104',
        name: 'Arees Royal Oud',
        price: 240,
        is_in_stock: true,
        variants: [
          { id: 'v-10ml', is_default: true, price: 24, total_price: 240, display_label: '10 ml' },
          { id: 'v-50ml', is_default: false, price: 155.52, total_price: 7776, display_label: '50 ml' },
        ],
      }
      const schema = buildProductSchema(product, 'https://www.areesperfumes.in', product.variants[1])
      expect(schema.offers.price).toBe(7776)
      expect(schema.offers.sku).toBe('v-50ml')
      expect(schema.offers.seller.name).toBe('Arees Perfumes')
    })

    it('ignores inactive variants when choosing the default offer', () => {
      const product = {
        id: 'p-106',
        name: 'Arees Night Musk',
        price: 999,
        is_in_stock: true,
        variants: [
          { id: 'v-inactive', is_default: true, active: false, total_price: 999 },
          { id: 'v-active', is_default: false, active: true, total_price: 450 },
        ],
      }
      const schema = buildProductSchema(product)
      expect(schema.offers.price).toBe(450)
      expect(schema.offers.sku).toBe('v-active')
    })

    it('uses an AggregateOffer and hasVariant entries for multi-variant products', () => {
      const product = {
        id: 'p-107',
        name: 'Arees Oud',
        price: 240,
        is_in_stock: true,
        variants: [
          { id: 'v-6', is_default: true, quantity_value: 6, quantity_unit: 'Pieces', total_price: 240 },
          { id: 'v-216', is_default: false, quantity_value: 216, quantity_unit: 'Pieces', total_price: 7776 },
        ],
      }
      const schema = buildProductSchema(product)
      expect(schema.offers['@type']).toBe('AggregateOffer')
      expect(schema.offers.lowPrice).toBe(240)
      expect(schema.offers.highPrice).toBe(7776)
      expect(schema.offers.offerCount).toBe(2)
      expect(schema.offers.price).toBeUndefined()
      expect(schema.hasVariant).toHaveLength(2)
      expect(schema.hasVariant[1].offers.price).toBe(7776)
    })

    it('does not emit unverified aggregateRating markup', () => {
      const schema = buildProductSchema({
        id: 'p-105',
        name: 'Arees Musk',
        price: 300,
        rating: 4.8,
        review_count: 12,
      })
      expect(schema.aggregateRating).toBeUndefined()
    })
  })

  describe('page SEO descriptors', () => {
    const product = {
      id: 'p-201',
      name: 'Arees Black Musk',
      description:
        'A rich, alcohol-free black musk attar with a warm, long-lasting trail for daily wear and special occasions.',
      price: 450,
      image: 'https://res.cloudinary.com/demo/image/upload/v1/musk.jpg',
      brand_name: 'Arees Perfumes',
      brand_slug: 'arees',
      category_name: 'Attar',
      category_slug: 'attar',
      is_in_stock: true,
      variants: [{ id: 'v-201', is_default: true, total_price: 450 }],
    }

    it('builds a product descriptor shared by the client and server head', () => {
      const seo = buildProductSeo(product, { variant: product.variants[0] })
      expect(seo.title).toContain('Arees Black Musk')
      expect(seo.canonical).toBe('/product/p-201')
      expect(seo.type).toBe('product')
      expect(seo.schema[0].offers.price).toBe(450)
      expect(seo.schema[1]['@type']).toBe('BreadcrumbList')
    })

    it('builds category SEO with an intro description and breadcrumbs', () => {
      const seo = buildCategorySeo(
        { name: 'Fragrance Oils', description: 'Concentrated alcohol-free oils.' },
        'fragrance-oils'
      )
      expect(seo.title).toContain('Fragrance Oils')
      expect(seo.introDesc).toBe('Concentrated alcohol-free oils.')
      expect(seo.canonical).toBe('/categories/fragrance-oils')
      expect(seo.schema['@type']).toBe('BreadcrumbList')
    })

    it('keeps the Arees Luxury brand URL self-canonical', () => {
      const seo = buildBrandSeo({ name: 'Arees Luxury', slug: 'oud-al-haramain' }, 'arees-luxury')
      expect(seo.brandName).toBe('Arees Luxury')
      expect(seo.title).toContain('Arees Luxury')
      expect(seo.canonical).toBe('/brand/arees-luxury')
    })
  })

  describe('Wholesale landing page SEO', () => {
    it('builds wholesale Service, FAQ, and breadcrumb schema', () => {
      const seo = buildWholesaleSeo()
      expect(seo.title).toContain('Perfume & Attar Wholesale')
      expect(seo.description).toContain('100 g')
      expect(seo.description).toContain('60 pieces')
      expect(seo.canonical).toBe('/wholesale')
      expect(seo.schema.map((item) => item['@type'])).toEqual(
        expect.arrayContaining(['Service', 'FAQPage', 'BreadcrumbList'])
      )
    })

    it('builds a Service schema with the Hikma Exports provider', () => {
      const schema = buildWholesaleServiceSchema()
      expect(schema['@type']).toBe('Service')
      expect(schema.provider.name).toBe('Hikma Exports')
      expect(schema.areaServed).toEqual(
        expect.arrayContaining(['India', 'Singapore', 'United Arab Emirates', 'Maldives'])
      )
      expect(schema.description).toContain('100 g')
      expect(schema.description).toContain('60 pieces')
    })
  })

  describe('Hikma Exports entity SEO', () => {
    it('builds an Organization schema for Hikma Exports', () => {
      const schema = buildHikmaExportsSchema()
      expect(schema['@type']).toBe('Organization')
      expect(schema.name).toBe('Hikma Exports')
      expect(schema.alternateName).toContain('Hikma Perfumes')
      expect(schema.address.streetAddress).toContain('Moore St')
      expect(schema.address.postalCode).toBe('600001')
      expect(schema.subOrganization.map((item) => item.name)).toEqual(
        expect.arrayContaining(['Arees Perfumes', 'Dahab'])
      )
      expect(schema.hasMap).toContain('google.com/maps')
    })

    it('accepts a Google Business Profile URL as sameAs', () => {
      const schema = buildHikmaExportsSchema({
        sameAs: ['https://www.google.com/maps/place/?q=place_id:test'],
      })
      expect(schema.sameAs).toEqual(['https://www.google.com/maps/place/?q=place_id:test'])
    })

    it('builds the page descriptor with Organization, FAQ, and breadcrumb schema', () => {
      const seo = buildHikmaExportsSeo()
      expect(seo.title).toContain('Hikma Exports')
      expect(seo.title).toContain('Hikma Perfumes')
      expect(seo.canonical).toBe('/hikma-exports')
      expect(seo.schema.map((item) => item['@type'])).toEqual(
        expect.arrayContaining(['Organization', 'FAQPage', 'BreadcrumbList'])
      )
    })

    it('returns static descriptors for server-rendered routes', () => {
      expect(buildStaticPageSeo('about').canonical).toBe('/about')
      expect(buildStaticPageSeo('/hikma-exports').canonical).toBe('/hikma-exports')
      expect(buildStaticPageSeo('missing-page')).toBeNull()
    })
  })

  describe('South India landing page SEO', () => {
    it('builds a local Chennai descriptor with LocalBusiness and breadcrumb schema', () => {
      const seo = buildSouthIndiaSeo()
      expect(seo.title).toContain('Chennai')
      expect(seo.canonical).toBe('/attar-perfume-shop-south-india')
      expect(seo.schema.map((item) => item['@type'])).toEqual(
        expect.arrayContaining(['LocalBusiness', 'BreadcrumbList'])
      )
      expect(buildStaticPageSeo('attar-perfume-shop-south-india').canonical).toBe(
        '/attar-perfume-shop-south-india'
      )
    })
  })

  describe('editorial guide SEO', () => {
    it('builds a guides index descriptor and includes it in static pages', () => {
      const seo = buildGuidesIndexSeo()
      expect(seo.canonical).toBe('/guides')
      expect(seo.title).toContain('Guides')
      expect(buildStaticPageSeo('guides').canonical).toBe('/guides')
      expect(STATIC_PAGES).toContain('/guides')
    })

    it('builds an article descriptor with Article, FAQ and breadcrumb schema', () => {
      const guide = GUIDES[0]
      const seo = buildGuideSeo(guide)
      expect(seo.canonical).toBe(`/guides/${guide.slug}`)
      expect(seo.type).toBe('article')
      expect(seo.schema.map((item) => item['@type'])).toEqual(
        expect.arrayContaining(['Article', 'FAQPage', 'BreadcrumbList'])
      )
      expect(seo.schema[0].headline).toBe(guide.title)
      expect(seo.schema[0].author.name).toBe('Arees Perfumes')
    })

    it('returns null for an invalid guide', () => {
      expect(buildGuideSeo(null)).toBeNull()
      expect(buildArticleSchema({})).toBeNull()
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
        item: 'https://www.areesperfumes.in/',
      })
      expect(schema.itemListElement[2]).toEqual({
        '@type': 'ListItem',
        position: 3,
        name: 'Attars',
        item: 'https://www.areesperfumes.in/categories/attars',
      })
    })
  })
})
