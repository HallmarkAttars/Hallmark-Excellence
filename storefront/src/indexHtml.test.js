import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')

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
