import { describe, expect, it } from 'vitest'
import { brandDisplay } from './brandDisplay.js'

describe('brandDisplay', () => {
  it.each([
    ['arees', 'Arees 8ml', 'Arees'],
    ['dahab', 'Dahab 6ml', 'Dahab'],
    ['arees-luxury', 'Arees Luxury', 'Arees Luxury'],
    ['bakhoor', 'Arees Bakhoor', 'Arees Bakhoor'],
    ['arees-12ml', 'Arees 12ml', 'Arees 12ml'],
  ])('uses the short public name for %s', (slug, apiName, heading) => {
    const display = brandDisplay({ name: apiName }, slug)
    expect(display.name).toBe(heading)
    expect(display.heading).toBe(heading)
    expect(display.title.length).toBeLessThanOrEqual(60)
    expect(display.description.length).toBeLessThanOrEqual(160)
  })

  it('maps legacy API slugs to the short public heading', () => {
    expect(brandDisplay({ name: 'Arees Luxury' }, 'oud-al-haramain').heading).toBe('Arees Luxury')
    expect(brandDisplay({ name: 'Arees Bakhoor' }, 'misk-al-arab').heading).toBe('Arees Bakhoor')
    expect(brandDisplay({ name: 'Arees 12ml' }, 'amber-oud').heading).toBe('Arees 12ml')
  })
})
