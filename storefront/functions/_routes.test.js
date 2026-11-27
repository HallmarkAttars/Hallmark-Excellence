import { describe, expect, it } from 'vitest'
import { NOT_FOUND_ROUTE, resolveRedirect, resolveSeoRoute } from './_routes.js'

describe('resolveRedirect', () => {
  it('maps legacy numeric category ids', () => {
    expect(resolveRedirect('/categories/1')).toBe('/categories/roll-on-attars')
    expect(resolveRedirect('/categories/3')).toBe('/categories/spray-bottles')
    expect(resolveRedirect('/categories/10')).toBe('/categories/fragrance-oils')
  })

  it('maps legacy encoded and decoded category names', () => {
    expect(resolveRedirect('/categories/Display%20bottles')).toBe('/categories/display-bottles')
    expect(resolveRedirect('/categories/Display%20bottles%20')).toBe('/categories/display-bottles')
    expect(resolveRedirect('/categories/Display bottles')).toBe('/categories/display-bottles')
    expect(resolveRedirect('/categories/face%20wash')).toBe('/categories/face-wash')
    expect(resolveRedirect('/categories/Face wash')).toBe('/categories/face-wash')
    expect(resolveRedirect('/categories/Bakhoor')).toBe('/categories/bakhoor')
    expect(resolveRedirect('/categories/Bakhoor%20')).toBe('/categories/bakhoor')
  })

  it('ignores canonical paths', () => {
    expect(resolveRedirect('/categories/roll-on-attars')).toBeNull()
    expect(resolveRedirect('/categories/bakhoor')).toBeNull()
    expect(resolveRedirect('/')).toBeNull()
  })
})

describe('resolveSeoRoute', () => {
  it('maps static pages and aliases', () => {
    expect(resolveSeoRoute('/')).toEqual({ type: 'page', slug: 'home' })
    expect(resolveSeoRoute('/shop')).toEqual({ type: 'page', slug: 'shop' })
    expect(resolveSeoRoute('/wholesale-attars')).toEqual({ type: 'page', slug: 'wholesale' })
    expect(resolveSeoRoute('/retail-attars')).toEqual({ type: 'page', slug: 'retail' })
    expect(resolveSeoRoute('/south-india')).toEqual({ type: 'page', slug: 'attar-perfume-shop-south-india' })
    expect(resolveSeoRoute('/privacy-policy')).toEqual({ type: 'utility', slug: 'privacy-policy' })
  })

  it('maps dynamic routes', () => {
    expect(resolveSeoRoute('/product/64b7f0c2e1a2b3c4d5e6f7a8')).toEqual({
      type: 'product',
      id: '64b7f0c2e1a2b3c4d5e6f7a8',
    })
    expect(resolveSeoRoute('/categories/roll-on-attars')).toEqual({
      type: 'category',
      slug: 'roll-on-attars',
    })
    expect(resolveSeoRoute('/brand/ajmal')).toEqual({ type: 'brand', slug: 'ajmal' })
    expect(resolveSeoRoute('/guides/attar-vs-perfume')).toEqual({
      type: 'guide',
      slug: 'attar-vs-perfume',
    })
  })

  it('normalizes trailing slashes', () => {
    expect(resolveSeoRoute('/about/')).toEqual({ type: 'page', slug: 'about' })
    expect(resolveSeoRoute('/product/abc/')).toEqual({ type: 'product', id: 'abc' })
  })

  it('returns null for unknown paths', () => {
    expect(resolveSeoRoute('/not-a-real-page')).toBeNull()
    expect(resolveSeoRoute('/categories/foo/bar')).toBeNull()
    expect(NOT_FOUND_ROUTE).toEqual({ type: 'notfound' })
  })
})
