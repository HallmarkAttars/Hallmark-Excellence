import { describe, expect, it } from 'vitest'
import { brandApiSlug, brandPublicSlug } from './brandSlug.js'

describe('brand slug aliases', () => {
  it('maps the public Arees Luxury slug to the API slug', () => {
    expect(brandApiSlug('arees-luxury')).toBe('oud-al-haramain')
    expect(brandApiSlug(' Arees-Luxury ')).toBe('oud-al-haramain')
  })

  it('maps the API Arees Luxury slug to the public slug', () => {
    expect(brandPublicSlug('oud-al-haramain')).toBe('arees-luxury')
  })

  it('leaves other brand slugs unchanged', () => {
    expect(brandApiSlug('arees')).toBe('arees')
    expect(brandPublicSlug('dahab')).toBe('dahab')
    expect(brandPublicSlug('')).toBe('')
    expect(brandPublicSlug(null)).toBe('')
  })
})
