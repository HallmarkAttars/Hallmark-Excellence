import { describe, it, expect } from 'vitest'
import { collectBrandHeroImages } from './brandHeroImages'
import { IMAGES } from '../config/assets'
import { BRAND_HERO_IMAGES } from '../data/content'

describe('collectBrandHeroImages utility', () => {
  it('always includes primary hero image as the first image', () => {
    const images = collectBrandHeroImages()
    expect(images.length).toBeGreaterThan(0)
    expect(images[0].src).toBe(IMAGES.heroBackground)
    expect(images[0].webp).toBe(IMAGES.heroBackgroundWebp)
  })

  it('dynamically collects images from brand objects', () => {
    const mockBrands = [
      {
        id: 'b1',
        name: 'Royal Oud',
        slug: 'royal-oud',
        cover_image_url: 'https://example.com/royal-oud-cover.jpg',
        card_image_url: 'https://example.com/royal-oud-card.jpg',
      },
      {
        id: 'b2',
        name: 'Arees 12ml',
        slug: 'arees-12ml',
      },
    ]

    const images = collectBrandHeroImages(mockBrands)
    const urls = images.map((img) => img.src)

    expect(urls).toContain('https://example.com/royal-oud-cover.jpg')
    expect(urls).toContain('https://example.com/royal-oud-card.jpg')
    expect(urls).toContain(BRAND_HERO_IMAGES['arees 12ml'])
  })

  it('deduplicates identical URLs', () => {
    const mockBrands = [
      {
        name: 'Brand 1',
        cover_image_url: 'https://example.com/duplicate.jpg',
        card_image_url: 'https://example.com/duplicate.jpg',
      },
    ]

    const images = collectBrandHeroImages(mockBrands)
    const duplicateMatches = images.filter((img) => img.src === 'https://example.com/duplicate.jpg')
    expect(duplicateMatches.length).toBe(1)
  })

  it('includes static brand hero images even when brands list is empty', () => {
    const images = collectBrandHeroImages([])
    const urls = images.map((img) => img.src)

    for (const path of Object.values(BRAND_HERO_IMAGES)) {
      expect(urls).toContain(path)
    }
  })
})
