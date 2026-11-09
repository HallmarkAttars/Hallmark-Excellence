// @vitest-environment jsdom
//
// The catalogue data layer must survive a full API outage without hiding every
// product from a returning visitor. These tests cover the three behaviours the
// outage fallback relies on:
//   • a successful read is persisted as a last-good snapshot,
//   • a network failure serves that snapshot (and flags the outage), and
//   • a real 4xx answer (deleted product) is NOT replaced with stale data.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const PRODUCT_KEY = 'arees:catalog:products'
const MISSING_PRODUCT_KEY = 'arees:catalog:product:missing'

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  }
}

describe('mockApi catalogue outage fallback', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('persists every successful catalogue read', async () => {
    const products = [{ id: 'p1', name: 'Royal Oud Attar' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ products })))

    const { getProducts } = await import('./mockApi')
    await expect(getProducts({ refresh: true })).resolves.toEqual(products)

    const stored = JSON.parse(localStorage.getItem(PRODUCT_KEY))
    expect(stored.data).toEqual(products)
    expect(typeof stored.savedAt).toBe('number')
  })

  it('serves the last-good snapshot and flags the outage when the API is down', async () => {
    const products = [{ id: 'p1', name: 'Royal Oud Attar' }]
    localStorage.setItem(
      PRODUCT_KEY,
      JSON.stringify({ savedAt: Date.now() - 60_000, data: products })
    )
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const { getProducts } = await import('./mockApi')
    await expect(getProducts({ refresh: true })).resolves.toEqual(products)

    const { getCatalogStatus } = await import('../utils/catalogStatus')
    expect(getCatalogStatus().offline).toBe(true)
    expect(getCatalogStatus().savedAt).toBeGreaterThan(0)
  })

  it('does not resurrect stale data for a 404 response', async () => {
    localStorage.setItem(
      MISSING_PRODUCT_KEY,
      JSON.stringify({ savedAt: Date.now(), data: { id: 'missing' } })
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Product not found' }, 404))
    )

    const { getProductById } = await import('./mockApi')
    await expect(getProductById('missing', { refresh: true })).rejects.toThrow(
      'Product not found'
    )
  })
})
