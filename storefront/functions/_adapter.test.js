import { describe, expect, it } from 'vitest'
import { adapt } from './_adapter.js'

describe('Cloudflare Pages adapter', () => {
  it('translates a GET request into a Node-style req and back into a Response', async () => {
    let seen
    const handler = async (req, res) => {
      seen = req
      res.status(200).json({ ok: true, type: req.query.type })
    }

    const request = new Request('https://www.areesperfumes.in/shop?type=page&slug=shop', {
      headers: { 'x-test': '1' },
    })
    const response = await adapt(handler, request, { SITE_URL: 'https://www.areesperfumes.in' })

    expect(seen.method).toBe('GET')
    expect(seen.url).toBe('/shop?type=page&slug=shop')
    expect(seen.query).toEqual({ type: 'page', slug: 'shop' })
    expect(seen.headers['x-test']).toBe('1')
    expect(seen.headers.host).toBe('www.areesperfumes.in')
    expect(seen.headers['x-forwarded-proto']).toBe('https')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(await response.json()).toEqual({ ok: true, type: 'page' })
  })

  it('exposes the raw POST body as an async iterable for the WhatsApp webhook', async () => {
    const payload = JSON.stringify({ hello: 'world' })
    let raw = ''

    const handler = async (req, res) => {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      raw = Buffer.concat(chunks).toString('utf8')
      res.status(200).json({ received: true })
    }

    const request = new Request('https://www.areesperfumes.in/api/wa-webhook', {
      method: 'POST',
      body: payload,
      headers: { 'content-type': 'application/json' },
    })
    const response = await adapt(handler, request, {})

    expect(raw).toBe(payload)
    expect(response.status).toBe(200)
  })

  it('merges extra query params for rewritten SEO routes', async () => {
    let query
    const handler = async (req, res) => {
      query = req.query
      res.status(200).end('ok')
    }

    const request = new Request('https://www.areesperfumes.in/product/abc?variant=8ml')
    const response = await adapt(handler, request, {}, { type: 'product', id: 'abc' })

    expect(query).toEqual({ variant: '8ml', type: 'product', id: 'abc' })
    expect(await response.text()).toBe('ok')
  })

  it('supports a 301 with a Location header and no body', async () => {
    const handler = async (req, res) => {
      res.statusCode = 301
      res.setHeader('Location', 'https://www.areesperfumes.in/about')
      res.end()
    }

    const response = await adapt(handler, new Request('https://www.areesperfumes.in/x'), {})

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://www.areesperfumes.in/about')
    expect(await response.text()).toBe('')
  })

  it('turns a thrown handler into a 500 response', async () => {
    const handler = async () => {
      throw new Error('boom')
    }
    const response = await adapt(handler, new Request('https://www.areesperfumes.in/'), {})
    expect(response.status).toBe(500)
  })
})
