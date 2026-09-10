// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CartProvider } from '../../context/CartContext'
import FeaturedProducts from './FeaturedProducts'

const mockFeaturedProducts = [
  { id: 1, name: 'Own Main show', is_featured: true, price: 500 },
  { id: 2, name: 'Sumaiya', is_featured: true, price: 600 },
  { id: 3, name: 'Sports Polo', is_featured: true, price: 700 },
  { id: 4, name: 'Cr7', is_featured: true, price: 800 },
  { id: 5, name: 'X -MAN', is_featured: true, price: 900 },
]

describe('FeaturedProducts Component', () => {
  afterEach(() => cleanup())

  it('returns null when empty or no products', () => {
    const { container } = render(
      <MemoryRouter>
        <FeaturedProducts products={[]} />
      </MemoryRouter>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders section title and 5 product cards', () => {
    render(
      <CartProvider>
        <MemoryRouter>
          <FeaturedProducts products={mockFeaturedProducts} />
        </MemoryRouter>
      </CartProvider>
    )

    expect(screen.getByRole('heading', { name: /featured products/i })).toBeTruthy()
    expect(screen.getByText('Own Main show')).toBeTruthy()
    expect(screen.getByText('Sumaiya')).toBeTruthy()
    expect(screen.getByText('Sports Polo')).toBeTruthy()
    expect(screen.getByText('Cr7')).toBeTruthy()
    expect(screen.getByText('X-Man')).toBeTruthy()
  })

  it('applies has-odd-items class and renders continuation link when count is odd', () => {
    const { container } = render(
      <CartProvider>
        <MemoryRouter>
          <FeaturedProducts products={mockFeaturedProducts} />
        </MemoryRouter>
      </CartProvider>
    )

    const track = container.querySelector('.featured-track')
    expect(track.classList.contains('has-odd-items')).toBe(true)

    const continuation = screen.getByRole('link', { name: /explore all fragrances/i })
    expect(continuation).toBeTruthy()
    expect(continuation.getAttribute('href')).toBe('/shop')
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
