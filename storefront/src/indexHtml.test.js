import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import { BUSINESS, HERO, SHOP } from './data/content.js'

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')
const schemas = [...html.matchAll(
  /<script type="application\/ld\+json" data-seo="true">([\s\S]*?)<\/script>/g
)].map((match) => JSON.parse(match[1]))

// The Seorce third-party tag must never be able to delay app boot.
// PSI trace 0bqz8lxyhb: this tag sat in <head> with `defer` BEFORE the Vite
// module bundle, so when scripts.seorce.com hung (status -1, 0 bytes), the
// whole React app waited ~10s to execute -> FCP 10.2s, Speed Index 13.6s.
// It now loads only after the page load event + an idle slot, and the vendor
// URL lives in data attributes so api/meta.js can strip the whole loader on
// excluded routes.
describe('index.html third-party script hygiene', () => {
  const seorceLoader = html.match(/<script[^>]*data-seorce-loader[^>]*>[\s\S]*?<\/script>/)

  it('has a Seorce loader', () => {
    expect(seorceLoader).toBeTruthy()
  })

  it('keeps the Seorce project URL + data-uuid in data attributes for api/meta.js', () => {
    const tag = seorceLoader[0]
    expect(tag).toMatch(/data-src=["'][^"']*scripts\.seorce\.com\/api\?projectId=[^"']+["']/)
    expect(tag).toMatch(/data-uuid=/)
    expect(tag).not.toMatch(/\ssrc=["']/)
  })

  it('waits for load + requestIdleCallback before creating the vendor script', () => {
    const tag = seorceLoader[0]
    expect(tag).toContain("window.addEventListener('load', schedule")
    expect(tag).toContain('requestIdleCallback')
    expect(tag).toContain('document.head.appendChild(s)')
  })

  it('Seorce loader appears before the app module bootstrap', () => {
    const seorceIndex = html.indexOf(seorceLoader[0])
    const moduleIndex = html.search(/<script\s+type="module"/)
    expect(moduleIndex).toBeGreaterThan(-1)
    expect(seorceIndex).toBeLessThan(moduleIndex)
  })

  it('has no externally-fetched, non-async, non-module script tags', () => {
    // Match a real src attribute, not the loader's data-src attribute.
    const scriptTags = html.match(/<script\b[^>]*\ssrc=[^>]*>/g) || []
    const offenders = scriptTags.filter((tag) => {
      if (/\stype=["']module["']/.test(tag)) return false
      if (/\basync\b/.test(tag)) return false
      return true
    })
    expect(offenders).toEqual([])
  })
})

describe('index.html home prerender internal links', () => {
  const categoryLinks = html.match(/<li><a href="\/categories\/[^"]+"/g) || []
  const brandLinks = html.match(/<li><a href="\/brand\/[^"]+"/g) || []

  it('mirrors the server home body category list', () => {
    expect(categoryLinks).toHaveLength(7)
  })

  it('links only canonical category slugs (never the old /categories/attars)', () => {
    for (const slug of [
      'roll-on-attars',
      'bakhoor',
      'fragrance-oils',
      'spray-bottles',
      'roll-on-bottles',
      'display-bottles',
      'face-wash',
    ]) {
      expect(html).toContain(`href="/categories/${slug}"`)
    }
    expect(html).not.toContain('href="/categories/attars"')
    expect(html).not.toContain('href="/categories/attar"')
  })

  it('never links empty noindex categories from the homepage', () => {
    expect(html).not.toContain('href="/categories/fancy-attar-bottles"')
    expect(html).not.toContain('href="/categories/roll-on-bottle-caps"')
    expect(html).not.toContain('href="/categories/spray-bottle-pumps"')
  })

  it('exposes the four canonical brand URLs', () => {
    expect(brandLinks).toHaveLength(4)
    for (const slug of ['arees', 'bakhoor', 'arees-luxury', 'dahab']) {
      expect(html).toContain(`href="/brand/${slug}"`)
    }
  })
})

describe('index.html baked homepage facts', () => {
  const localBusiness = schemas.find((schema) => schema['@type'] === 'LocalBusiness')
  const faq = schemas.find((schema) => schema['@type'] === 'FAQPage')

  it('publishes the verified shop NAP in LocalBusiness schema', () => {
    expect(localBusiness.name).toBe(SHOP.name)
    expect(localBusiness.telephone).toBe(SHOP.phoneTel)
    expect(localBusiness.geo.latitude).toBeCloseTo(SHOP.geo.latitude)
    expect(localBusiness.geo.longitude).toBeCloseTo(SHOP.geo.longitude)
    expect(localBusiness.hasMap).toBe(BUSINESS.mapDirectionsUrl)
    expect(localBusiness.sameAs).toContain(BUSINESS.googlePlaceUrl)
    expect(localBusiness.openingHoursSpecification[0].opens).toBe('10:00')
    expect(localBusiness.openingHoursSpecification[0].closes).toBe('21:30')
  })

  it('keeps shop and wholesale phone numbers separate in FAQ copy', () => {
    const text = faq.mainEntity[0].acceptedAnswer.text
    expect(text).toContain('10:00 AM to 9:30 PM')
    expect(text).toContain('closed on Sunday')
    expect(text).toContain(SHOP.phoneDisplay)
    expect(text).toContain('+91 98407 50467')
  })

  it('does not bake a drifting price into the no-JS body', () => {
    expect(html).not.toContain('₹220')
  })

  it('keeps the baked homepage hero copy aligned with HERO content', () => {
    const title = HERO.title.join(' ').replace(/&/g, '&amp;')
    expect(html).toContain(`<h1>${title}</h1>`)
    expect(html).toContain(`<p>${HERO.subtitle}</p>`)
  })
})
