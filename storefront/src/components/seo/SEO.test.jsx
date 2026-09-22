// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SEO from './SEO'
import { DEFAULT_TITLE, DEFAULT_DESCRIPTION, CANONICAL_ORIGIN } from '../../utils/seo'

describe('SEO component', () => {
  afterEach(() => {
    cleanup()
    document.title = ''
    document.head.querySelectorAll('[data-seo="true"]').forEach((el) => el.remove())
  })

  it('sets default title, description and apex canonical when no props provided', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <SEO />
      </MemoryRouter>
    )

    expect(document.title).toBe(DEFAULT_TITLE)
    const desc = document.head.querySelector('meta[name="description"]')
    expect(desc?.getAttribute('content')).toBe(DEFAULT_DESCRIPTION)
    const canonical = document.head.querySelector('link[rel="canonical"]')
    expect(canonical?.getAttribute('href')).toBe(`${CANONICAL_ORIGIN}/`)
    const robots = document.head.querySelector('meta[name="robots"]')
    expect(robots?.getAttribute('content')).toBe('index,follow')
  })

  it('sets custom page title, description and canonical URL', () => {
    render(
      <MemoryRouter initialEntries={['/shop?sort=price-asc&page=2']}>
        <SEO
          title="Shop Premium Attars, Oud & Perfumes | Arees Perfumes"
          description="Explore our collection of authentic attars."
          canonical="/shop"
        />
      </MemoryRouter>
    )

    expect(document.title).toBe('Shop Premium Attars, Oud & Perfumes | Arees Perfumes')
    const desc = document.head.querySelector('meta[name="description"]')
    expect(desc?.getAttribute('content')).toBe('Explore our collection of authentic attars.')
    const canonical = document.head.querySelector('link[rel="canonical"]')
    // Query parameters must be stripped
    expect(canonical?.getAttribute('href')).toBe(`${CANONICAL_ORIGIN}/shop`)
  })

  it('sets noindex,nofollow for utility pages', () => {
    render(
      <MemoryRouter initialEntries={['/cart']}>
        <SEO
          title="Shopping Cart | Arees Perfumes"
          robots="noindex,nofollow"
          canonical="/cart"
        />
      </MemoryRouter>
    )

    const robots = document.head.querySelector('meta[name="robots"]')
    expect(robots?.getAttribute('content')).toBe('noindex,nofollow')
  })

  it('renders Open Graph and Twitter Card tags', () => {
    render(
      <MemoryRouter initialEntries={['/product/p1']}>
        <SEO
          title="Arees Black Musk | Arees Perfumes"
          description="Pure black musk attar."
          canonical="/product/p1"
          image="https://example.com/musk.jpg"
          type="product"
        />
      </MemoryRouter>
    )

    const ogTitle = document.head.querySelector('meta[property="og:title"]')
    expect(ogTitle?.getAttribute('content')).toBe('Arees Black Musk | Arees Perfumes')
    const ogType = document.head.querySelector('meta[property="og:type"]')
    expect(ogType?.getAttribute('content')).toBe('product')
    const ogImg = document.head.querySelector('meta[property="og:image"]')
    expect(ogImg?.getAttribute('content')).toBe('https://example.com/musk.jpg')
    const twitterCard = document.head.querySelector('meta[name="twitter:card"]')
    expect(twitterCard?.getAttribute('content')).toBe('summary_large_image')
  })

  it('injects JSON-LD script tags into document head', () => {
    const sampleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Arees Black Musk',
    }

    render(
      <MemoryRouter initialEntries={['/product/p1']}>
        <SEO
          title="Product"
          schema={sampleSchema}
        />
      </MemoryRouter>
    )

    const script = document.head.querySelector('script[type="application/ld+json"][data-seo="true"]')
    expect(script).toBeTruthy()
    expect(JSON.parse(script.textContent)).toEqual(sampleSchema)
  })
})
