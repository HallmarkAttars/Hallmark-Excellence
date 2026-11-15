import { describe, it, expect } from 'vitest'
import { buildWholesaleQuotePath, buildWholesaleQuotePrefill } from './wholesaleQuote'

describe('wholesale quote helpers', () => {
  it('builds a readable prefill from a product selection', () => {
    expect(
      buildWholesaleQuotePrefill({
        productName: 'Arees Oud Royal',
        productUrl: '/product/arees-oud-royal',
        variantLabel: '8ml roll-on',
        quantityText: '2 x 120 pieces',
      })
    ).toBe(
      'Product: Arees Oud Royal\nVariant: 8ml roll-on\nRequested: 2 x 120 pieces\nLink: /product/arees-oud-royal'
    )
  })

  it('returns a contextual wholesale path with encoded prefill', () => {
    const path = buildWholesaleQuotePath({
      productName: 'Arees Oud Royal',
      variantLabel: '8ml',
      quantityText: '120 pieces',
    })
    expect(path.startsWith('/wholesale?product=')).toBe(true)
    expect(path.endsWith('#wholesale-enquiry')).toBe(true)
    const query = new URLSearchParams(path.split('?')[1].split('#')[0]).get('product')
    expect(query).toContain('Arees Oud Royal')
    expect(query).toContain('120 pieces')
  })

  it('returns a clean anchored path without a selection', () => {
    expect(buildWholesaleQuotePath({})).toBe('/wholesale#wholesale-enquiry')
    expect(buildWholesaleQuotePath()).toBe('/wholesale#wholesale-enquiry')
  })
})
