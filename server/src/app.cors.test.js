// CORS preflight tests — boot the real Express app on an ephemeral port and
// assert the cors() middleware's behavior for every allowed origin plus the
// rejection path. No Supabase, no I/O beyond the local HTTP server.
//
// Run with:  npm test  (server)

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import app from './app'

// The effective allowed origins: both storefront host variants (apex + www)
// and the admin domain, per server/src/app.js. FRONTEND_URL/ADMIN_URL from
// .env resolve to the same set, so asserting these pins the production
// contract regardless of what the env vars hold.
const ALLOWED_ORIGINS = [
  'https://areesperfumes.in',
  'https://www.areesperfumes.in',
  'https://admin3210.areesperfumes.in',
]

const DISALLOWED_ORIGIN = 'https://evil.example.com'

describe('CORS preflight (OPTIONS /api/products)', () => {
  let server
  let baseUrl

  beforeAll(async () => {
    server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`
  })

  afterAll(() => new Promise((resolve) => server.close(resolve)))

  it.each(ALLOWED_ORIGINS)('allows %s → 204 with echoed Access-Control-Allow-Origin', async (origin) => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'GET',
      },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe(origin)
    expect(res.headers.get('access-control-allow-methods')).toContain('GET')
  })

  it('rejects a disallowed origin (no Access-Control-Allow-Origin header)', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'OPTIONS',
      headers: {
        Origin: DISALLOWED_ORIGIN,
        'Access-Control-Request-Method': 'GET',
      },
    })
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    // cors() forwards the rejection to the error handler → non-2xx, and the
    // browser sees no ACAO header so the request is blocked client-side.
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('allows non-browser requests (no Origin header)', async () => {
    // /api/health is DB-free, so it proves the request passed CORS and hit
    // the route without needing Supabase.
    const res = await fetch(`${baseUrl}/api/health`)
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })
})
