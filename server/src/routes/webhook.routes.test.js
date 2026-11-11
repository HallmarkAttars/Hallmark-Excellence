// Meta webhook route tests — mount the router on a minimal Express app (no
// Supabase/env boot) and exercise the GET handshake + POST forwarding.
//
// Run with:  npm test  (server)

import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest'
import express from 'express'
import webhookRoutes from './webhook.routes'

const VERIFY_TOKEN = 'arees_perfumes_2026'

function makeApp() {
  const app = express()
  app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }))
  app.use('/webhook', webhookRoutes)
  return app
}

describe('Meta webhook routes', () => {
  let server
  let baseUrl

  beforeAll(async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN
    server = makeApp().listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(() => {
    delete process.env.WHATSAPP_VERIFY_TOKEN
    return new Promise((resolve) => server.close(resolve))
  })

  it('answers the Meta GET handshake with the challenge', async () => {
    const url =
      `${baseUrl}/webhook?hub.mode=subscribe` +
      `&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test123`
    const res = await fetch(url)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('test123')
  })

  it('rejects a wrong verify token', async () => {
    const url =
      `${baseUrl}/webhook?hub.mode=subscribe` +
      `&hub.verify_token=wrong&hub.challenge=test123`
    const res = await fetch(url)
    expect(res.status).toBe(403)
  })

  it('rejects a non-subscribe handshake', async () => {
    const url =
      `${baseUrl}/webhook?hub.mode=unsubscribe` +
      `&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test123`
    const res = await fetch(url)
    expect(res.status).toBe(403)
  })

  it('forwards POSTs to the storefront with the raw body and signature', async () => {
    const realFetch = globalThis.fetch
    const calls = []
    const forward = vi.fn(async (url, opts) => {
      calls.push({ url, opts })
      return new Response('{}', { status: 200 })
    })
    vi.stubGlobal('fetch', forward)

    try {
      const payload = { object: 'whatsapp_business_account', entry: [{ id: '1' }] }
      const res = await realFetch(`${baseUrl}/webhook`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': 'sha256=abc',
        },
        body: JSON.stringify(payload),
      })

      expect(res.status).toBe(200)
      expect(forward).toHaveBeenCalledTimes(1)
      const [{ url, opts }] = calls
      expect(url).toBe('https://www.areesperfumes.in/api/wa-webhook')
      expect(opts.headers['x-hub-signature-256']).toBe('sha256=abc')
      expect(Buffer.isBuffer(opts.body)).toBe(true)
      expect(JSON.parse(opts.body.toString('utf8'))).toEqual(payload)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('still answers 200 when forwarding fails', async () => {
    const realFetch = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom') }))

    try {
      const res = await realFetch(`${baseUrl}/webhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ received: true })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
