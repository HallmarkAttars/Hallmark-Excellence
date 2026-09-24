// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CartProvider } from '../../context/CartContext'
import FeaturedProducts from './FeaturedProducts'

const mockFeaturedProducts = [
  { id: 1, name: 'Own Main show', is_featured: true, price: 500, category_name: 'Attar' },
  { id: 2, name: 'Sumaiya', is_featured: true, price: 600, category_name: 'Attar' },
  { id: 3, name: 'Sports Polo', is_featured: true, price: 700, category_name: 'Roll On Perfume' },
  { id: 4, name: 'Cr7', is_featured: true, price: 800, category_name: 'Attar' },
  { id: 5, name: 'X -MAN', is_featured: true, price: 900, category_name: 'Attar' },
]

describe('FeaturedProducts Component — Cinematic Orbit', () => {
  afterEach(() => cleanup())

  it('returns null when empty or no products', () => {
    const { container } = render(
      <MemoryRouter>
        <FeaturedProducts products={[]} />
      </MemoryRouter>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders section title, eyebrow, and view all link', () => {
    render(
      <CartProvider>
        <MemoryRouter>
          <FeaturedProducts products={mockFeaturedProducts} />
        </MemoryRouter>
      </CartProvider>
    )

    expect(screen.getByText(/FEATURED PRODUCTS/i)).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Scents, made by hand/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /view all/i })).toBeTruthy()
  })

  it('renders the illuminated platform and circular orbit stage with nav controls', () => {
    const { container } = render(
      <CartProvider>
        <MemoryRouter>
          <FeaturedProducts products={mockFeaturedProducts} />
        </MemoryRouter>
      </CartProvider>
    )

    const stage = container.querySelector('.featured-orbit-stage')
    expect(stage).toBeTruthy()

    const platform = container.querySelector('.featured-orbit-platform')
    expect(platform).toBeTruthy()

    const prevBtn = screen.getByRole('button', { name: /previous fragrance/i })
    const nextBtn = screen.getByRole('button', { name: /next fragrance/i })
    expect(prevBtn).toBeTruthy()
    expect(nextBtn).toBeTruthy()
  })

  it('renders orbit product items and dot indicators', () => {
    const { container } = render(
      <CartProvider>
        <MemoryRouter>
          <FeaturedProducts products={mockFeaturedProducts} />
        </MemoryRouter>
      </CartProvider>
    )

    const items = container.querySelectorAll('.featured-orbit-item')
    expect(items.length).toBeGreaterThanOrEqual(5)

    const dots = container.querySelectorAll('.orbit-dot')
    expect(dots.length).toBe(5)
  })

  it('renders active product showcase details with explore fragrance cta', () => {
    render(
      <CartProvider>
        <MemoryRouter>
          <FeaturedProducts products={mockFeaturedProducts} />
        </MemoryRouter>
      </CartProvider>
    )

    expect(screen.getByRole('link', { name: /explore fragrance/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /quick view/i })).toBeTruthy()
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
