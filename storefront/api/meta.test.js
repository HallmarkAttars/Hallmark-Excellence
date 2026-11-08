import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildB2bBodyHtml,
  buildGuideBodyHtml,
  buildGuideIndexBodyHtml,
  buildSeoForRoute,
  buildStaticBodyHtml,
  injectSeoHtml,
} from './meta.js'
import handler from './meta.js'

const shell = `<!doctype html>
<html lang="en">
  <head>
    <title>Old Homepage Title</title>
    <meta name="description" content="Old description" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="https://www.areesperfumes.in/" />
    <meta property="og:title" content="Old OG title" />
    <meta name="twitter:title" content="Old Twitter title" />
  </head>
  <body><div id="root"></div></body>
</html>`

describe('injectSeoHtml', () => {
  it('replaces the homepage head with the route-specific head', () => {
    const html = injectSeoHtml(shell, {
      title: 'Arees Black Musk - Attar | Arees Perfumes',
      description: 'Rich black musk attar.',
      canonical: '/product/11111111-1111-4111-8111-111111111111',
      image: 'https://example.com/musk.jpg',
      type: 'product',
      robots: 'index,follow',
      schema: [{ '@context': 'https://schema.org', '@type': 'Product', name: 'Arees Black Musk' }],
    })

    expect(html).toContain('<title>Arees Black Musk - Attar | Arees Perfumes</title>')
    expect(html).not.toContain('Old Homepage Title')
    expect(html).not.toContain('Old description')
    expect(html).not.toContain('Old OG title')
    expect((html.match(/name="description"/g) || []).length).toBe(1)
    expect((html.match(/rel="canonical"/g) || []).length).toBe(1)
    expect(html).toContain('href="https://www.areesperfumes.in/product/11111111-1111-4111-8111-111111111111"')
    expect(html).toContain('content="https://example.com/musk.jpg"')
    expect(html).toContain('application/ld+json')
    expect(html).toContain('data-seo="true"')
  })

  it('escapes HTML and cannot break out of the JSON-LD script', () => {
    const html = injectSeoHtml(shell, {
      title: 'A & B <script>',
      description: 'Quotes " and \' apostrophes',
      canonical: '/product/p-2',
      schema: [{ name: '</script><script>alert(1)</script>' }],
    })

    expect(html).toContain('A &amp; B &lt;script&gt;')
    expect(html).not.toContain('</script><script>alert(1)</script>')
    expect(html).toContain('\\u003c/script')
  })

  it('marks a missing page as noindex', () => {
    const html = injectSeoHtml(shell, {
      title: 'Page Not Found | Arees Perfumes',
      description: 'Not found.',
      canonical: '/product/missing',
      robots: 'noindex,follow',
    })
    expect(html).toContain('<meta name="robots" content="noindex,follow" />')
  })

  it('injects the crawlable B2B fallback inside the app root', () => {
    const html = injectSeoHtml(
      shell,
      { title: 'Wholesale', description: 'Wholesale.', canonical: '/wholesale' },
      '<main data-prerender="true"><h1>Wholesale Attars</h1></main>'
    )
    expect(html).toContain('<div id="root"><main data-prerender="true"><h1>Wholesale Attars</h1></main></div>')
  })

  it('replaces pre-baked root content with the route body (index.html ships a baked homepage body)', () => {
    const bakedShell = shell.replace(
      /<div id=["']root["'][^>]*>\s*<\/div>/,
      '<div id="root">\n      <main data-prerender="true"><header><h1>Buy Authentic Non-Alcoholic Attars</h1></header></main>\n    </div>'
    )
    const html = injectSeoHtml(
      bakedShell,
      { title: 'Canter Bottles', description: 'Category.', canonical: '/categories/display-bottles' },
      '<main data-prerender="true"><h1>Canter Bottles</h1></main>'
    )
    expect(html).toContain('<h1>Canter Bottles</h1>')
    // the baked homepage body must NOT survive next to the injected body
    expect(html).not.toContain('Buy Authentic Non-Alcoholic Attars</h1></header></main>')
    expect((html.match(/<main data-prerender/g) || []).length).toBe(1)
  })
})

describe('buildB2bBodyHtml', () => {
  it('renders the wholesale page copy, checklist, MOQ facts and FAQs', () => {
    const html = buildB2bBodyHtml('wholesale')
    expect(html).toContain('<h1>Perfume &amp; Attar Wholesale in Chennai</h1>')
    expect(html).toContain('What to Include in Your Wholesale Enquiry')
    expect(html).toContain('What is the wholesale minimum order quantity?')
    expect(html).toContain('<strong>Loose attar / fragrance oil MOQ:</strong> 100g - 10kg')
    expect(html).toContain('<strong>Arees &amp; Dahab branded packs:</strong> Minimum 60 pieces')
    expect(html).toContain('Private label')
    expect(html).toContain('GST-registered business with IEC')
  })

  it('renders the Hikma Exports entity copy, export facts and FAQs', () => {
    const html = buildB2bBodyHtml('hikma-exports')
    expect(html).toContain('<h1>Hikma Exports: Perfume Wholesaler &amp; Exporter in Chennai</h1>')
    expect(html).toContain('What an Export Quotation Confirms')
    expect(html).toContain('What are the wholesale desk hours and lead time?')
    expect(html).toContain('Singapore, Malaysia, the UAE, Sri Lanka and the Maldives')
    expect(html).toContain('<strong>Loose attar / fragrance oil MOQ:</strong> 100g - 10kg')
    expect(html).toContain('<strong>Arees &amp; Dahab branded packs:</strong> Minimum 60 pieces')
    expect(html).toContain('GST-registered business with IEC')
  })

  it('returns nothing for non-B2B pages', () => {
    expect(buildB2bBodyHtml('about')).toBe('')
  })
})

describe('static body fallbacks', () => {
  it('renders home and South India copy with wholesale facts', () => {
    const home = buildStaticBodyHtml('home')
    expect(home).toContain('<h2>Wholesale &amp; Export</h2>')
    expect(home).toContain('loose attar and fragrance oils from 100 g')
    expect(home).toContain('branded Arees and Dahab packs from 60 pieces')

    const southIndia = buildStaticBodyHtml('attar-perfume-shop-south-india')
    expect(southIndia).toContain('<h1>Attar Shop in Chennai &amp; South India</h1>')
    expect(southIndia).toContain('Wholesale desk: 9:00 AM - 9:30 PM')
    expect(southIndia).toContain('Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, and Telangana')
  })

  it('links the home and South India bodies to canonical category URLs', () => {
    const home = buildStaticBodyHtml('home')
    expect(home).toContain('<h2>Shop by Category</h2>')
    expect((home.match(/<li><a href="\/categories\//g) || []).length).toBe(10)
    for (const slug of [
      'roll-on-attars',
      'bakhoor',
      'fragrance-oils',
      'spray-bottles',
      'roll-on-bottles',
      'fancy-attar-bottles',
      'roll-on-bottle-caps',
      'spray-bottle-pumps',
      'display-bottles',
      'face-wash',
    ]) {
      expect(home).toContain(`href="/categories/${slug}"`)
    }
    // The old non-existent category must never be linked.
    expect(home).not.toContain('href="/categories/attars"')
    expect(home).not.toContain('href="/categories/attar"')

    const southIndia = buildStaticBodyHtml('attar-perfume-shop-south-india')
    expect(southIndia).toContain('Popular collections:')
    expect(southIndia).toContain('href="/categories/roll-on-attars"')
    expect(southIndia).toContain('href="/categories/bakhoor"')
    expect(southIndia).toContain('href="/categories/fragrance-oils"')
    expect(southIndia).not.toContain('/categories/attars"')
  })
})

describe('guide body fallbacks', () => {
  it('renders the guides index and guide article copy', () => {
    const index = buildGuideIndexBodyHtml()
    expect(index).toContain('<h1>Attar, Perfume Oil &amp; Wholesale Guides</h1>')
    expect(index).toContain('/guides/attar-vs-perfume-oil')

    const article = buildGuideBodyHtml('attar-vs-perfume-oil')
    expect(article).toContain('<h1>Attar vs Perfume Oil: What Is the Difference?</h1>')
    expect(article).toContain('The Short Answer')
    expect(article).toContain('Frequently Asked Questions')

    const bakhoor = buildGuideBodyHtml('bakhoor-guide')
    expect(bakhoor).toContain('href="/categories/bakhoor"')
    expect(bakhoor).toContain('Shop bakhoor perfume, chips &amp; incense')
  })

  it('returns nothing for an unknown guide', () => {
    expect(buildGuideBodyHtml('not-a-guide')).toBe('')
  })
})

const product = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Arees Black Musk',
  description:
    'A rich, alcohol-free black musk attar with a warm, long-lasting trail for daily wear and special occasions.',
  price: 450,
  image: 'https://example.com/musk.jpg',
  brand_name: 'Arees Perfumes',
  brand_slug: 'arees',
  category_name: 'Attar',
  category_slug: 'attar',
  is_in_stock: true,
  variants: [{ id: 'v-1', is_default: true, total_price: 450 }],
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }
}

function htmlResponse(body) {
  return { ok: true, status: 200, text: async () => body }
}

function createRes() {
  return {
    statusCode: 200,
    body: '',
    headers: {},
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value
    },
    end(body = '') {
      this.body = body
    },
  }
}

beforeEach(() => {
  // The last-good SEO cache lives on globalThis so it survives warm Vercel
  // invocations. Clear it between tests so one test's cached render cannot
  // mask another test's upstream failure.
  globalThis.__AREES_SEO_CACHE__?.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildSeoForRoute', () => {
  it('loads a product and returns its SEO descriptor', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('/products/11111111-1111-4111-8111-111111111111')) return jsonResponse({ product })
      throw new Error(`Unexpected URL ${url}`)
    }))

    const result = await buildSeoForRoute({ type: 'product', id: '11111111-1111-4111-8111-111111111111' })
    expect(result.status).toBe(200)
    expect(result.seo.canonical).toBe('/product/11111111-1111-4111-8111-111111111111')
    expect(result.seo.schema[0].offers.price).toBe(450)
  })

  it('resolves the arees-luxury alias to the primary brand', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('/products')) {
        return jsonResponse({ products: [{ id: 'p-1', name: 'Oud Royale' }] })
      }
      return jsonResponse({
        brands: [{ id: 'b-1', name: 'Arees Luxury', slug: 'oud-al-haramain' }],
      })
    }))

    const result = await buildSeoForRoute({ type: 'brand', slug: 'arees-luxury' })
    expect(result.seo.brandName).toBe('Arees Luxury')
    expect(result.seo.canonical).toBe('/brand/arees-luxury')
    expect(result.seo.schema[1]['@type']).toBe('CollectionPage')
    expect(result.seo.schema[1].mainEntity.numberOfItems).toBe(1)
  })

  it('canonicalizes the legacy Oud Al Haramain brand slug', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      brands: [{ id: 'b-1', name: 'Arees Luxury', slug: 'oud-al-haramain' }],
    })))

    const result = await buildSeoForRoute({ type: 'brand', slug: 'oud-al-haramain' })
    expect(result.seo.canonical).toBe('/brand/arees-luxury')
  })

  it('returns a self-canonical noindex descriptor for utility pages', async () => {
    const result = await buildSeoForRoute({ type: 'utility', slug: 'cart' })
    expect(result.status).toBe(200)
    expect(result.seo.canonical).toBe('/cart')
    expect(result.seo.robots).toBe('noindex,follow')
  })

  it('marks an empty category as noindex and a populated category as indexable', async () => {
    const fetchMock = vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/categories')) {
        return jsonResponse({ categories: [{ id: 'c-1', name: 'Empty', slug: 'empty' }] })
      }
      if (value.endsWith('/categories/empty/products')) return jsonResponse({ products: [] })
      throw new Error(`Unexpected URL ${value}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await buildSeoForRoute({ type: 'category', slug: 'empty' })
    expect(result.seo.robots).toBe('noindex,follow')

    fetchMock.mockImplementation(async (url) => {
      const value = String(url)
      if (value.endsWith('/categories')) {
        return jsonResponse({ categories: [{ id: 'c-1', name: 'Roll on Attars', slug: '1' }] })
      }
      if (value.endsWith('/categories/1/products')) return jsonResponse({ products: [{ id: 'p-1' }] })
      throw new Error(`Unexpected URL ${value}`)
    })
    const populated = await buildSeoForRoute({ type: 'category', slug: '1' })
    expect(populated.seo.robots).toBeUndefined()
    expect(populated.seo.schema[1]['@type']).toBe('CollectionPage')
    // Raw DB slug "1" resolves — and canonicalizes — to the keyword slug.
    expect(populated.seo.canonical).toBe('/categories/roll-on-attars')
  })

  it('resolves the legacy display-bottles slug to the live category record', async () => {
    const fetchMock = vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/categories')) {
        return jsonResponse({
          categories: [{ id: 'c-display', name: 'Canter Bottle', slug: 'Display bottles ' }],
        })
      }
      if (value.includes('/categories/Display%20bottles%20/products')) {
        return jsonResponse({ products: [{ id: 'p-1' }] })
      }
      throw new Error(`Unexpected URL ${value}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await buildSeoForRoute({ type: 'category', slug: 'display-bottles' })
    expect(result.seo.canonical).toBe('/categories/display-bottles')
    expect(result.seo.name).toBe('Canter Bottle')
  })

  it('renders editorial sections and guide links in the crawlable category body', async () => {
    const fetchMock = vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/categories')) {
        return jsonResponse({
          categories: [{ id: 'c-bak', name: 'Bakhoor ', slug: 'Bakhoor ', description: '' }],
        })
      }
      if (value.includes('/categories/Bakhoor')) {
        return jsonResponse({ products: [{ id: 'p-1', name: 'Bakhoor Mix' }] })
      }
      throw new Error(`Unexpected URL ${value}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await buildSeoForRoute({ type: 'category', slug: 'Bakhoor ' })
    expect(result.bodyHtml).toContain('What Bakhoor Is')
    expect(result.bodyHtml).toContain('/product/p-1')
    // Editorial wins over the empty DB description
      expect(result.seo.description).toContain('scented wood chips')
      expect(result.bodyHtml).toContain('/guides/bakhoor-guide')
  })

  it('builds guide SEO without calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await buildSeoForRoute({ type: 'guide', slug: 'attar-vs-perfume-oil' })
    expect(result.status).toBe(200)
    expect(result.seo.canonical).toBe('/guides/attar-vs-perfume-oil')
    expect(result.seo.schema.map((item) => item['@type'])).toEqual(
      expect.arrayContaining(['Article', 'FAQPage', 'BreadcrumbList'])
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws a 404 for an unknown record', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Not found' }, 404)))
    await expect(buildSeoForRoute({ type: 'product', id: '11111111-1111-4111-8111-111111111111' })).rejects.toMatchObject({ status: 404 })
  })

  it('builds static page SEO without calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await buildSeoForRoute({ type: 'page', slug: 'hikma-exports' })
    expect(result.status).toBe(200)
    expect(result.seo.canonical).toBe('/hikma-exports')
    expect(result.seo.schema.map((item) => item['@type'])).toEqual(
      expect.arrayContaining(['Organization', 'FAQPage', 'BreadcrumbList'])
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws a 404 for an unknown static page', async () => {
    await expect(buildSeoForRoute({ type: 'page', slug: 'not-a-page' })).rejects.toMatchObject({ status: 404 })
  })

  it('rejects malformed product keys without calling the API, but resolves slug keys', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/products/mysore-rose')) {
        return jsonResponse({ product: { id: 'p-1', name: 'Mysore Rose', slug: 'mysore-rose', price: 450 } })
      }
      throw new Error(`Unexpected URL ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(buildSeoForRoute({ type: 'product', id: 'not a uuid!' })).rejects.toMatchObject({ status: 404 })
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('not%20a%20uuid'))

    const result = await buildSeoForRoute({ type: 'product', id: 'mysore-rose' })
    expect(result.status).toBe(200)
    expect(result.seo.canonical).toBe('/product/mysore-rose')
    expect(result.bodyHtml).toContain('Price from ₹450')
  })
})

describe('meta handler', () => {
  it('returns server-rendered product head with HTTP 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/index.html')) return htmlResponse(shell)
      if (value.includes('/products/11111111-1111-4111-8111-111111111111')) return jsonResponse({ product })
      throw new Error(`Unexpected URL ${value}`)
    }))

    const res = createRes()
    await handler(
      { query: { type: 'product', id: '11111111-1111-4111-8111-111111111111' }, headers: { host: 'areesperfumes.in' }, method: 'GET' },
      res
    )

    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('<title>Arees Black Musk')
    expect(res.body).toContain('rel="canonical" href="https://www.areesperfumes.in/product/11111111-1111-4111-8111-111111111111"')
    expect(res.body).toContain('application/ld+json')
  })

  it('returns server-rendered Hikma Exports head with HTTP 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/index.html')) return htmlResponse(shell)
      throw new Error(`Unexpected URL ${value}`)
    }))

    const res = createRes()
    await handler(
      { query: { type: 'page', slug: 'hikma-exports' }, headers: { host: 'areesperfumes.in' }, method: 'GET' },
      res
    )

    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('<title>Perfume Exporter in Chennai | Hikma Exports &amp; Hikma Perfumes</title>')
    expect(res.body).toContain('rel="canonical" href="https://www.areesperfumes.in/hikma-exports"')
    expect(res.body).toContain('application/ld+json')
    expect(res.body).toContain('data-prerender="true"')
    expect(res.body).toContain('<h1>Hikma Exports: Perfume Wholesaler &amp; Exporter in Chennai</h1>')
    expect(res.body).toContain('Singapore, Malaysia, the UAE, Sri Lanka and the Maldives')
  })

  it('server-renders the guides index and guide article body', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/index.html')) return htmlResponse(shell)
      throw new Error(`Unexpected URL ${value}`)
    }))

    const indexRes = createRes()
    await handler(
      { query: { type: 'page', slug: 'guides' }, headers: { host: 'areesperfumes.in' }, method: 'GET' },
      indexRes
    )
    expect(indexRes.statusCode).toBe(200)
    expect(indexRes.body).toContain('rel="canonical" href="https://www.areesperfumes.in/guides"')
    expect(indexRes.body).toContain('Attar, Perfume Oil &amp; Wholesale Guides')

    const articleRes = createRes()
    await handler(
      { query: { type: 'guide', slug: 'attar-vs-perfume-oil' }, headers: { host: 'areesperfumes.in' }, method: 'GET' },
      articleRes
    )
    expect(articleRes.statusCode).toBe(200)
    expect(articleRes.body).toContain('rel="canonical" href="https://www.areesperfumes.in/guides/attar-vs-perfume-oil"')
    expect(articleRes.body).toContain('data-prerender="true"')
  })

  it('redirects the legacy display-bottles category slug to the canonical URL', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/categories')) {
        return jsonResponse({
          categories: [{ id: 'c-display', name: 'Canter Bottle', slug: 'Display bottles ' }],
        })
      }
      if (value.includes('/categories/Display%20bottles%20/products')) {
        return jsonResponse({ products: [{ id: 'p-1' }] })
      }
      throw new Error(`Unexpected URL ${value}`)
    }))

    const res = createRes()
    await handler(
      { query: { type: 'category', slug: 'Display bottles ' }, headers: { host: 'areesperfumes.in' }, method: 'GET' },
      res
    )
    expect(res.statusCode).toBe(301)
    expect(res.headers.location).toBe('https://www.areesperfumes.in/categories/display-bottles')
  })

  it('redirects every legacy raw category slug to its canonical keyword URL', async () => {
    const legacyCases = [
      { slug: '1', canonical: 'roll-on-attars', apiSlug: '1' },
      { slug: '3', canonical: 'spray-bottles', apiSlug: '3' },
      { slug: '10', canonical: 'fragrance-oils', apiSlug: '10' },
      { slug: 'Face wash', canonical: 'face-wash', apiSlug: 'Face wash' },
      { slug: 'Bakhoor', canonical: 'bakhoor', apiSlug: 'Bakhoor ' },
      { slug: 'Roll on', canonical: 'fancy-attar-bottles', apiSlug: 'Roll on' },
      { slug: 'Caps', canonical: 'roll-on-bottle-caps', apiSlug: 'Caps' },
      { slug: 'Pump', canonical: 'spray-bottle-pumps', apiSlug: 'Pump' },
    ]

    for (const legacy of legacyCases) {
      const encodedApiSlug = encodeURIComponent(legacy.apiSlug)
      vi.stubGlobal('fetch', vi.fn(async (url) => {
        const value = String(url)
        if (value.endsWith('/categories')) {
          return jsonResponse({
            categories: [{ id: 'c-x', name: legacy.canonical, slug: legacy.apiSlug }],
          })
        }
        if (value.includes(`/categories/${encodedApiSlug}/products`)) {
          return jsonResponse({ products: [{ id: 'p-1' }] })
        }
        throw new Error(`Unexpected URL ${value}`)
      }))

      const res = createRes()
      await handler(
        { query: { type: 'category', slug: legacy.slug }, headers: { host: 'areesperfumes.in' }, method: 'GET' },
        res
      )
      expect(res.statusCode).toBe(301)
      expect(res.headers.location).toBe(`https://www.areesperfumes.in/categories/${legacy.canonical}`)
    }
  })

  it('keeps a canonical category URL self-canonical when the API slug is raw', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/index.html')) return htmlResponse(shell)
      if (value.endsWith('/categories')) {
        return jsonResponse({
          categories: [{ id: 'c-fancy', name: 'Fancy Bottle', slug: 'Roll on' }],
        })
      }
      if (value.includes('/categories/Roll%20on/products')) {
        return jsonResponse({ products: [{ id: 'p-1' }] })
      }
      throw new Error(`Unexpected URL ${value}`)
    }))

    const res = createRes()
    await handler(
      {
        query: { type: 'category', slug: 'fancy-attar-bottles' },
        headers: { host: 'areesperfumes.in' },
        method: 'GET',
      },
      res
    )
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain(
      'rel="canonical" href="https://www.areesperfumes.in/categories/fancy-attar-bottles"'
    )
    expect(res.body).toContain('data-prerender="true"')
  })

  it('redirects the legacy Oud Al Haramain brand slug to Arees Luxury', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/brands')) {
        return jsonResponse({
          brands: [{ id: 'b-1', name: 'Arees Luxury', slug: 'oud-al-haramain' }],
        })
      }
      if (value.includes('/brands/oud-al-haramain/products')) {
        return jsonResponse({ products: [{ id: 'p-1' }] })
      }
      throw new Error(`Unexpected URL ${value}`)
    }))

    const res = createRes()
    await handler(
      { query: { type: 'brand', slug: 'oud-al-haramain' }, headers: { host: 'areesperfumes.in' }, method: 'GET' },
      res
    )
    expect(res.statusCode).toBe(301)
    expect(res.headers.location).toBe('https://www.areesperfumes.in/brand/arees-luxury')
  })

  it('returns HTTP 404 and noindex without a canonical for a missing product', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/index.html')) return htmlResponse(shell)
      return jsonResponse({ error: 'Not found' }, 404)
    }))

    const res = createRes()
    await handler(
      { query: { type: 'product', id: '22222222-2222-4222-8222-222222222222' }, headers: { host: 'areesperfumes.in' }, method: 'GET' },
      res
    )

    expect(res.statusCode).toBe(404)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.body).toContain('<meta name="robots" content="noindex,follow" />')
    expect(res.body).not.toContain('rel="canonical"')
    expect(res.body).not.toContain('property="og:url"')
  })

  it('301-redirects a UUID product URL to the SEO slug and keeps the variant query', async () => {
    const fetchMock = vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/index.html')) return htmlResponse(shell)
      if (value.includes('/products/11111111-1111-4111-8111-111111111111')) {
        return jsonResponse({ product: { ...product, slug: 'arees-black-musk' } })
      }
      if (value.includes('/products/11111111-1111-4111-8111-111111111111/related')) {
        return jsonResponse({ products: [] })
      }
      throw new Error(`Unexpected URL ${value}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = createRes()
    await handler(
      {
        query: { type: 'product', id: '11111111-1111-4111-8111-111111111111', variant: 'v-1' },
        headers: { host: 'areesperfumes.in' },
        method: 'GET',
      },
      res
    )

    expect(res.statusCode).toBe(301)
    expect(res.headers.location).toBe(
      'https://www.areesperfumes.in/product/arees-black-musk?variant=v-1'
    )
    expect(res.headers['cache-control']).toBe('public, max-age=0, s-maxage=3600')
    expect(res.body).toBe('')
  })

  it('keeps a slug product URL self-canonical (no redirect)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/index.html')) return htmlResponse(shell)
      if (value.includes('/products/arees-black-musk')) {
        return jsonResponse({ product: { ...product, slug: 'arees-black-musk' } })
      }
      if (value.includes('/related')) return jsonResponse({ products: [] })
      throw new Error(`Unexpected URL ${value}`)
    }))

    const res = createRes()
    await handler(
      { query: { type: 'product', id: 'arees-black-musk' }, headers: { host: 'areesperfumes.in' }, method: 'GET' },
      res
    )

    expect(res.statusCode).toBe(200)
    expect(res.body).toContain(
      'rel="canonical" href="https://www.areesperfumes.in/product/arees-black-musk"'
    )
  })

  it('serves the last good render when the upstream API fails after a success', async () => {
    const upstreamOk = vi.fn(async (url) => {
      const value = String(url)
      if (value.endsWith('/index.html')) return htmlResponse(shell)
      if (value.includes('/products/11111111-1111-4111-8111-111111111111')) {
        return jsonResponse({ product })
      }
      if (value.includes('/related')) return jsonResponse({ products: [] })
      throw new Error(`Unexpected URL ${value}`)
    })
    vi.stubGlobal('fetch', upstreamOk)

    const first = createRes()
    await handler(
      { query: { type: 'product', id: '11111111-1111-4111-8111-111111111111' }, headers: { host: 'areesperfumes.in' }, method: 'GET' },
      first
    )
    expect(first.statusCode).toBe(200)
    expect(first.headers['x-arees-degraded']).toBeUndefined()

    // Same route, upstream now unreachable (network error, not a 404).
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).endsWith('/index.html')) return htmlResponse(shell)
      throw new Error('fetch failed')
    }))

    const second = createRes()
    await handler(
      { query: { type: 'product', id: '11111111-1111-4111-8111-111111111111' }, headers: { host: 'areesperfumes.in' }, method: 'GET' },
      second
    )

    expect(second.statusCode).toBe(200)
    expect(second.headers['x-arees-degraded']).toBe('1')
    expect(second.headers['cache-control']).toBe('public, max-age=0, s-maxage=30, stale-while-revalidate=604800')
    expect(second.body).toContain('<title>Arees Black Musk')
    expect(second.body).toContain('rel="canonical"')
  })

  it('returns 503 with Retry-After when the upstream fails and there is no cached render', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).endsWith('/index.html')) return htmlResponse(shell)
      throw new Error('fetch failed')
    }))

    const res = createRes()
    await handler(
      {
        query: { type: 'product', id: '33333333-3333-4333-8333-333333333333' },
        headers: { host: 'areesperfumes.in' },
        method: 'GET',
      },
      res
    )

    expect(res.statusCode).toBe(503)
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.headers['retry-after']).toBe('300')
    expect(res.headers['x-arees-degraded']).toBeUndefined()
    expect(res.body).toContain('Temporarily Unavailable')
    expect(res.body).toContain('<meta name="robots" content="noindex,nofollow" />')
  })
})
