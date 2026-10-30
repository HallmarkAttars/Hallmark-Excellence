import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')

// The Seorce third-party tag must never be able to delay app boot.
// PSI trace 0bqz8lxyhb: this tag sat in <head> with `defer` BEFORE the Vite
// module bundle, so when scripts.seorce.com hung (status -1, 0 bytes), the
// whole React app waited ~10s to execute -> FCP 10.2s, Speed Index 13.6s.
// Deferred classic scripts and module scripts execute in document order, and
// async is the only attribute that fully decouples a script from that chain.
describe('index.html third-party script hygiene', () => {
  const seorceTag = html.match(/<script[^>]*scripts\.seorce\.com[^>]*><\/script>/)

  it('has a Seorce tag', () => {
    expect(seorceTag).toBeTruthy()
  })

  it('loads Seorce with async (never defer or blocking)', () => {
    const tag = seorceTag[0]
    expect(tag).toMatch(/\sasync\b/)
    expect(tag).not.toMatch(/\sdefer\b/)
  })

  it('keeps the Seorce src + data-uuid intact for api/meta.js gating', () => {
    const tag = seorceTag[0]
    expect(tag).toMatch(/src=["'][^"']*scripts\.seorce\.com\/api\?projectId=[^"']+["']/)
    expect(tag).toMatch(/data-uuid=/)
  })

  it('Seorce tag appears before the app module bootstrap', () => {
    const seorceIndex = html.indexOf(seorceTag[0])
    const moduleIndex = html.search(/<script\s+type="module"/)
    expect(moduleIndex).toBeGreaterThan(-1)
    expect(seorceIndex).toBeLessThan(moduleIndex)
  })

  it('has no externally-fetched, non-async, non-module script tags', () => {
    const scriptTags = html.match(/<script\b[^>]*\bsrc=[^>]*>/g) || []
    const offenders = scriptTags.filter((tag) => {
      if (/\stype=["']module["']/.test(tag)) return false
      if (/\basync\b/.test(tag)) return false
      return true
    })
    expect(offenders).toEqual([])
  })
})
