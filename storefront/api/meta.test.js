import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSeoForRoute, injectSeoHtml } from './meta.js'
import handler from './meta.js'

const shell = `<!doctype html>
<html lang="en">
  <head>
    <title>Old Homepage Title</title>
    <meta name="description" content="Old description" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="https://areesperfumes.in/" />
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
    expect(html).toContain('href="https://areesperfumes.in/product/11111111-1111-4111-8111-111111111111"')
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
    expect(res.body).toContain('rel="canonical" href="https://areesperfumes.in/product/11111111-1111-4111-8111-111111111111"')
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
    expect(res.body).toContain('rel="canonical" href="https://areesperfumes.in/hikma-exports"')
    expect(res.body).toContain('application/ld+json')
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
