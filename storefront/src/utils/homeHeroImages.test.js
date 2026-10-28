import { describe, it, expect } from 'vitest'
import { buildHomeHeroImages } from './homeHeroImages'

describe('buildHomeHeroImages', () => {
  it('returns the five curated product slides in a fixed order', () => {
    const images = buildHomeHeroImages()

    expect(images).toHaveLength(5)
    expect(images.map((img) => img.brandName)).toEqual([
      'Arees Perfumes',
      'Arees 12ml',
      'Arees 8ml Roll-On',
      'Arees Bakhoor',
      'Arees 1kg Bulk',
    ])
  })

  it('starts with the local Arees signature image and its portrait crop', () => {
    const [first] = buildHomeHeroImages()

    expect(first.src).toBe('/Hero.webp')
    expect(first.mobileWebp).toBe('/Hero-mobile.webp')
    expect(first.blur).toBe('/hero/hero-signature-blur.webp')
  })

  it('uses only local product photography and graphics', () => {
    const images = buildHomeHeroImages()

    for (const image of images) {
      expect(image.src.startsWith('/')).toBe(true)
      expect(image.src.endsWith('.webp')).toBe(true)
      expect(image.mobileWebp.startsWith('/')).toBe(true)
      expect(image.mobileWebp.endsWith('-mobile.webp')).toBe(true)
      expect(image.blur.startsWith('/hero/')).toBe(true)
      expect(image.blur.endsWith('-blur.webp')).toBe(true)
      expect(image.src).not.toContain('unsplash')
      expect(image.mobileWebp).not.toContain('unsplash')
    }
  })

  it('uses the framed showcase layout without cropping catalogue graphics', () => {
    const images = buildHomeHeroImages()

    for (const image of images) {
      expect(image.layout).toBe('showcase')
      expect(image.duration).toBeGreaterThanOrEqual(5500)
    }

    expect(images[0].fit).toBe('cover')
    expect(images.slice(1).every((image) => image.fit === 'contain')).toBe(true)
  })

  it('supplies framing, brightness and descriptive alt text per slide', () => {
    for (const image of buildHomeHeroImages()) {
      expect(image.focus).toMatch(/^\d+% \d+%$/)
      expect(image.mobileFocus).toMatch(/^\d+% \d+%$/)
      expect(typeof image.brightness).toBe('number')
      expect(image.brightness).toBeGreaterThan(0)
      expect(image.alt.length).toBeGreaterThan(0)
    }
  })

  it('returns fresh copies so consumers cannot mutate the curated set', () => {
    const first = buildHomeHeroImages()
    first[1].src = '/mutated.webp'
    expect(buildHomeHeroImages()[1].src).toBe('/hero/luxury-12ml.webp')
  })
})
