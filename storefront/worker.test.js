import { describe, expect, it } from 'vitest'
import { isStaticAsset } from './worker.js'

describe('worker static asset routing', () => {
  it('treats built assets and public files as static', () => {
    expect(isStaticAsset('/assets/index-abc.js')).toBe(true)
    expect(isStaticAsset('/fonts/inter.woff2')).toBe(true)
    expect(isStaticAsset('/Arees%20luxury.webp')).toBe(true)
    expect(isStaticAsset('/og-image.jpg')).toBe(true)
    expect(isStaticAsset('/index.html')).toBe(true)
    expect(isStaticAsset('/BingSiteAuth.xml')).toBe(true)
    expect(isStaticAsset('/googlef91b34053f2235f5.html')).toBe(true)
  })

  it('routes pages, SEO endpoints and APIs through the Worker', () => {
    expect(isStaticAsset('/')).toBe(false)
    expect(isStaticAsset('/about')).toBe(false)
    expect(isStaticAsset('/product/abc')).toBe(false)
    expect(isStaticAsset('/sitemap.xml')).toBe(false)
    expect(isStaticAsset('/robots.txt')).toBe(false)
    expect(isStaticAsset('/api/wa-webhook')).toBe(false)
  })
})
