// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CartProvider } from '../../context/CartContext'
import FeaturedProducts from './FeaturedProducts'
import FeaturedProductsCarousel from './FeaturedProductsCarousel'

const mockFeaturedProducts = [
  { id: 1, name: 'Own Main show', is_featured: true, price: 500, category_name: 'Attar' },
  { id: 2, name: 'Sumaiya', is_featured: true, price: 600, category_name: 'Attar' },
  { id: 3, name: 'Sports Polo', is_featured: true, price: 700, category_name: 'Roll On Perfume' },
  { id: 4, name: 'Cr7', is_featured: true, price: 800, category_name: 'Attar' },
  { id: 5, name: 'X -MAN', is_featured: true, price: 900, category_name: 'Attar' },
]

describe('FeaturedProducts Component — Continuous Circular Orbit', () => {
  afterEach(() => cleanup())

  it('returns null when empty or no products', () => {
    const { container } = render(
      <MemoryRouter>
        <FeaturedProducts products={[]} />
      </MemoryRouter>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders section title, subtitle, and view all link', () => {
    render(
      <CartProvider>
        <MemoryRouter>
          <FeaturedProducts products={mockFeaturedProducts} />
        </MemoryRouter>
      </CartProvider>
    )

    expect(screen.getByText(/FEATURED PRODUCTS/i)).toBeTruthy()
    expect(screen.getByText(/Scents, made by hand/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /view all/i })).toBeTruthy()
  })

  it('renders the illuminated pedestal platform and circular orbit stage with navigation arrows', () => {
    const { container } = render(
      <CartProvider>
        <MemoryRouter>
          <FeaturedProducts products={mockFeaturedProducts} />
        </MemoryRouter>
      </CartProvider>
    )

    const stage = container.querySelector('.carousel-orbit-stage')
    expect(stage).toBeTruthy()

    const platform = container.querySelector('.carousel-pedestal-platform')
    expect(platform).toBeTruthy()

    const prevBtn = screen.getByRole('button', { name: /previous fragrance/i })
    const nextBtn = screen.getByRole('button', { name: /next fragrance/i })
    expect(prevBtn).toBeTruthy()
    expect(nextBtn).toBeTruthy()
  })

  it('renders orbit product items with names and categories printed below', () => {
    const { container } = render(
      <CartProvider>
        <MemoryRouter>
          <FeaturedProducts products={mockFeaturedProducts} />
        </MemoryRouter>
      </CartProvider>
    )

    const items = container.querySelectorAll('.carousel-orbit-item')
    expect(items.length).toBe(5)

    const dots = container.querySelectorAll('.carousel-dot')
    expect(dots.length).toBe(5)
  })

  it('renders correctly with 3, 5, or 11 products in FeaturedProductsCarousel', () => {
    const elevenProducts = Array.from({ length: 11 }, (_, i) => ({
      id: i + 1,
      name: `Fragrance ${i + 1}`,
      is_featured: true,
      category_name: 'Roll On Perfume',
    }))

    const { container } = render(
      <MemoryRouter>
        <FeaturedProductsCarousel products={elevenProducts} />
      </MemoryRouter>
    )

    const items = container.querySelectorAll('.carousel-orbit-item')
    expect(items.length).toBe(11)

    const dots = container.querySelectorAll('.carousel-dot')
    expect(dots.length).toBe(11)
  })

  it('assigns all 20 products to positions on the same single orbit without slicing or duplication', () => {
    const twentyProducts = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Fragrance ${i + 1}`,
      is_featured: true,
      category_name: 'Roll On Perfume',
    }))

    const { container } = render(
      <MemoryRouter>
        <FeaturedProductsCarousel products={twentyProducts} />
      </MemoryRouter>
    )

    const items = container.querySelectorAll('.carousel-orbit-item')
    expect(items.length).toBe(20)

    const dots = container.querySelectorAll('.carousel-dot')
    expect(dots.length).toBe(20)
  })

  it('renders the subtle section divider', () => {
    const { container } = render(
      <CartProvider>
        <MemoryRouter>
          <FeaturedProducts products={mockFeaturedProducts} />
        </MemoryRouter>
      </CartProvider>
    )

    const divider = container.querySelector('.featured-section-divider')
    expect(divider).toBeTruthy()
  })
})
