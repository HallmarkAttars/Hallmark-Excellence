import { describe, expect, it } from 'vitest'
import { isFragranceOilCategory, isFragranceOilProduct } from './exactPieces'

describe('storefront exact-piece category rules', () => {
  it('matches Fragrance Oil by name despite numeric production slug', () => {
    expect(isFragranceOilCategory({ name: 'Fragrance Oil', slug: '10' })).toBe(true)
    expect(isFragranceOilCategory({ name: ' fragrance oil ' })).toBe(true)
    expect(isFragranceOilCategory({ slug: 'fragrance-oil' })).toBe(true)
  })

  it('does not match other categories', () => {
    expect(isFragranceOilCategory({ name: 'Roll on Attars', slug: '1' })).toBe(false)
    expect(isFragranceOilProduct({ category_name: 'Attar', category_slug: 'attar' })).toBe(false)
    expect(isFragranceOilProduct({})).toBe(false)
  })

  it('recognizes a Fragrance Oil product payload', () => {
    expect(
      isFragranceOilProduct({ category_name: 'Fragrance Oil', category_slug: '10' })
    ).toBe(true)
  })
})
