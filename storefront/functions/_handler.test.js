import { beforeEach, describe, expect, it } from 'vitest'
import { onRequest } from './_handler.js'

function context(url, init) {
  return { request: new Request(url, init), env: {} }
}

beforeEach(() => {
  delete process.env.SITE_URL
  delete process.env.KV_REST_API_URL
  delete process.env.KV_REST_API_TOKEN
  delete process.env.WA_CRON_SECRET
})

describe('Cloudflare Pages catch-all', () => {
  it('301-redirects legacy category paths', async () => {
    const response = await onRequest(context('https://www.areesperfumes.in/categories/1'))
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe(
      'https://www.areesperfumes.in/categories/roll-on-attars'
    )
  })

  it('serves robots.txt from the shared handler', async () => {
    const response = await onRequest(context('https://www.areesperfumes.in/robots.txt'))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/plain')
    expect(await response.text()).toContain('User-agent:')
  })

  it('answers the WhatsApp webhook health probe', async () => {
    const response = await onRequest(context('https://www.areesperfumes.in/api/wa-webhook'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true })
  })

  it('reports the cron disabled when KV is not configured', async () => {
    const response = await onRequest(context('https://www.areesperfumes.in/api/wa-cron'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, enabled: false })
  })
})
