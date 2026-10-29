import { describe, it, expect } from 'vitest'
import { buildHomeHeroImages } from './homeHeroImages'

describe('buildHomeHeroImages', () => {
  it('returns the five supplied catalogue graphics in a fixed order', () => {
    const images = buildHomeHeroImages()

    expect(images).toHaveLength(5)
    expect(images.map((img) => img.src)).toEqual([
      '/hero/rollon-8ml.webp',
      '/hero/bakhoor.webp',
      '/hero/bulk-1kg.webp',
      '/hero/luxury-12ml.webp',
      '/wholesale/rollon-bottle-range.webp',
    ])
    expect(images.map((img) => img.brandName)).toEqual([
      'Arees 8ml Roll-On',
      'Arees Bakhoor',
      'Arees 1kg Bulk',
      'Arees 12ml',
      'Arees Roll-On Range',
    ])
  })

  it('starts with the supplied 8ml roll-on graphic and its mobile crop', () => {
    const [first] = buildHomeHeroImages()

    expect(first.src).toBe('/hero/rollon-8ml.webp')
    expect(first.mobileWebp).toBe('/hero/rollon-8ml-mobile.webp')
    expect(first.blur).toBe('/hero/rollon-8ml-blur.webp')
  })

  it('uses only local supplied assets', () => {
    const images = buildHomeHeroImages()

    for (const image of images) {
      expect(image.src.startsWith('/')).toBe(true)
      expect(image.src.endsWith('.webp')).toBe(true)
      expect(image.mobileWebp.startsWith('/')).toBe(true)
      expect(image.mobileWebp.endsWith('.webp')).toBe(true)
      expect(image.blur.startsWith('/')).toBe(true)
      expect(image.blur.endsWith('.webp')).toBe(true)
      expect(image.src).not.toContain('unsplash')
      expect(image.mobileWebp).not.toContain('unsplash')
    }
  })

  it('uses the framed showcase layout so no catalogue graphic is cropped', () => {
    const images = buildHomeHeroImages()

    for (const image of images) {
      expect(image.layout).toBe('showcase')
      expect(image.fit).toBe('contain')
      expect(image.mobileFit).toBe('contain')
      expect(image.duration).toBe(7000)
    }
  })

  it('supplies alt text and uniform brightness per slide', () => {
    for (const image of buildHomeHeroImages()) {
      expect(typeof image.brightness).toBe('number')
      expect(image.brightness).toBeGreaterThan(0)
      expect(image.alt.length).toBeGreaterThan(0)
      expect(image.brandName.length).toBeGreaterThan(0)
    }
  })

  it('returns fresh copies so consumers cannot mutate the curated set', () => {
    const first = buildHomeHeroImages()
    first[1].src = '/mutated.webp'
    expect(buildHomeHeroImages()[1].src).toBe('/hero/bakhoor.webp')
  })
})
