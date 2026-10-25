import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildB2bBodyHtml, buildSeoForRoute, injectSeoHtml } from './meta.js'
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
})

describe('buildB2bBodyHtml', () => {
  it('renders the wholesale page copy, checklist and FAQs', () => {
    const html = buildB2bBodyHtml('wholesale')
    expect(html).toContain('<h1>Wholesale Attars &amp; Perfume Oils Supplier in Chennai</h1>')
    expect(html).toContain('What to Include in Your Wholesale Enquiry')
    expect(html).toContain('What are your MOQ, lead time and payment terms?')
  })

  it('renders the Hikma Exports entity copy and FAQs', () => {
    const html = buildB2bBodyHtml('hikma-exports')
    expect(html).toContain('<h1>Hikma Exports &amp; Hikma Perfumes: Wholesale Fragrance Supply in Chennai</h1>')
    expect(html).toContain('What an Export Quotation Confirms')
    expect(html).toContain('What are the MOQ, lead time, shipping and payment terms?')
  })

  it('returns nothing for non-B2B pages', () => {
    expect(buildB2bBodyHtml('about')).toBe('')
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
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      brands: [{ id: 'b-1', name: 'Arees Luxury', slug: 'oud-al-haramain' }],
    })))

    const result = await buildSeoForRoute({ type: 'brand', slug: 'arees-luxury' })
    expect(result.seo.brandName).toBe('Arees Luxury')
    expect(result.seo.canonical).toBe('/brand/arees-luxury')
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

  it('rejects non-UUID product ids without calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(buildSeoForRoute({ type: 'product', id: 'not-a-uuid' })).rejects.toMatchObject({ status: 404 })
    expect(fetchMock).not.toHaveBeenCalled()
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
    expect(res.body).toContain('<title>Hikma Exports | Hikma Perfumes Wholesale &amp; Export | Chennai</title>')
    expect(res.body).toContain('rel="canonical" href="https://www.areesperfumes.in/hikma-exports"')
    expect(res.body).toContain('application/ld+json')
    expect(res.body).toContain('data-prerender="true"')
    expect(res.body).toContain('<h1>Hikma Exports &amp; Hikma Perfumes: Wholesale Fragrance Supply in Chennai</h1>')
  })

  it('returns HTTP 404 and noindex for a missing product', async () => {
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
  })
})
