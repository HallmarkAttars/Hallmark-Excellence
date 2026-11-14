import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cachePublic, clearPublicCache } from './publicCache.middleware'

function makeRes() {
  const headers = {}
  return {
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value
    },
    getHeaders() {
      return { ...headers }
    },
    end(body) {
      this.body = body
      return this
    },
    json(body) {
      const serialized = JSON.stringify(body)
      headers['content-type'] = 'application/json; charset=utf-8'
      headers['content-length'] = String(Buffer.byteLength(serialized))
      headers.etag = 'W/"test"'
      this.body = serialized
      return this
    },
  }
}

function dispatch(middleware, req, res, controller) {
  middleware(req, res, () => controller(req, res))
}

describe('publicCache middleware', () => {
  beforeEach(() => {
    clearPublicCache()
  })

  it('replays a 200 GET from memory without calling the controller again', () => {
    const middleware = cachePublic()
    const controller = vi.fn((req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=60')
      res.json({ products: [{ id: 1 }] })
    })
    const req = { method: 'GET', originalUrl: '/api/products?summary=1' }

    const first = makeRes()
    dispatch(middleware, req, first, controller)

    const second = makeRes()
    dispatch(middleware, req, second, controller)

    expect(first.body).toBe('{"products":[{"id":1}]}')
    expect(second.body).toBe(first.body)
    expect(second.statusCode).toBe(200)
    expect(second.getHeaders()['x-arees-cache']).toBe('HIT')
    expect(second.getHeaders()['cache-control']).toBe('public, max-age=60')
    expect(second.getHeaders()['content-length']).toBeUndefined()
    expect(second.getHeaders().etag).toBeUndefined()
    expect(controller).toHaveBeenCalledTimes(1)
  })

  it('keeps CORS headers request-local instead of replaying the first origin', () => {
    const middleware = cachePublic()
    const controller = vi.fn((req, res) => {
      res.json({ ok: true })
    })
    const req = { method: 'GET', originalUrl: '/api/categories' }

    const first = makeRes()
    first.setHeader('Access-Control-Allow-Origin', 'https://areesperfumes.in')
    first.setHeader('Vary', 'Origin')
    dispatch(middleware, req, first, controller)

    const second = makeRes()
    second.setHeader('Access-Control-Allow-Origin', 'https://www.areesperfumes.in')
    second.setHeader('Vary', 'Origin')
    dispatch(middleware, req, second, controller)

    expect(second.getHeaders()['x-arees-cache']).toBe('HIT')
    expect(second.getHeaders()['access-control-allow-origin']).toBe('https://www.areesperfumes.in')
    expect(second.getHeaders().vary).toBe('Origin')
  })

  it('does not cache error responses or non-GET requests', () => {
    const middleware = cachePublic()
    const controller = vi.fn((req, res) => {
      res.statusCode = req.method === 'GET' ? 500 : 200
      res.json({ ok: req.method === 'GET' ? false : true })
    })

    const failed = makeRes()
    dispatch(middleware, { method: 'GET', originalUrl: '/api/products' }, failed, controller)
    const retried = makeRes()
    dispatch(middleware, { method: 'GET', originalUrl: '/api/products' }, retried, controller)

    const post = makeRes()
    dispatch(middleware, { method: 'POST', originalUrl: '/api/products' }, post, controller)
    const postAgain = makeRes()
    dispatch(middleware, { method: 'POST', originalUrl: '/api/products' }, postAgain, controller)

    expect(controller).toHaveBeenCalledTimes(4)
    expect(retried.getHeaders()['x-arees-cache']).toBeUndefined()
    expect(postAgain.getHeaders()['x-arees-cache']).toBeUndefined()
  })
})
