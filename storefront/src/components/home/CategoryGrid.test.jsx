// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CategoryGrid from './CategoryGrid'

const mockCategories = [
  { id: '1', name: 'Attars', slug: 'attars', image: '/attar.jpg' },
  { id: '2', name: 'Oud', slug: 'oud', image: '/oud.jpg' },
  { id: '3', name: 'Bakhoor', slug: 'bakhoor', image: '/bakhoor.jpg' },
  { id: '4', name: 'Perfume Oils', slug: 'perfume-oils', image: '/oils.jpg' },
  { id: '5', name: 'Dahab Series', slug: 'dahab-series', image: '/dahab.jpg' },
  { id: '6', name: 'Musk Collection', slug: 'musk-collection', image: '/musk.jpg' },
  { id: '7', name: 'Amber Special', slug: 'amber-special', image: '/amber.jpg' },
  { id: '8', name: 'Luxury Gift Sets', slug: 'luxury-gift-sets', image: '/gifts.jpg' },
]

describe('CategoryGrid Component', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders section header with eyebrow, title, subtitle, and VIEW ALL CTA', () => {
    render(
      <MemoryRouter>
        <CategoryGrid categories={mockCategories} />
      </MemoryRouter>
    )

    expect(screen.getByText('EXPLORE OUR COLLECTION')).toBeTruthy()
    expect(screen.getByText('Shop by Category')).toBeTruthy()
    expect(
      screen.getByText('Discover your signature scent from our exclusive range')
    ).toBeTruthy()

    const viewAllLink = screen.getByRole('link', { name: /view all/i })
    expect(viewAllLink).toBeTruthy()
    expect(viewAllLink.getAttribute('href')).toBe('/categories')
  })

  it('renders exactly 6 categories when 8 categories are provided', () => {
    render(
      <MemoryRouter>
        <CategoryGrid categories={mockCategories} />
      </MemoryRouter>
    )

    // Should only have 6 category card links (+ 1 view all link)
    const categoryLinks = screen.getAllByRole('link').filter((l) => l.getAttribute('href') !== '/categories')
    expect(categoryLinks).toHaveLength(6)

    expect(screen.getByText('Attars')).toBeTruthy()
    expect(screen.getByText('Oud')).toBeTruthy()
    expect(screen.getByText('Bakhoor')).toBeTruthy()
    expect(screen.getByText('Perfume Oils')).toBeTruthy()
    expect(screen.getByText('Dahab Series')).toBeTruthy()
    expect(screen.getByText('Musk Collection')).toBeTruthy()

    // 7th and 8th items should NOT be on the homepage
    expect(screen.queryByText('Amber Special')).toBeNull()
    expect(screen.queryByText('Luxury Gift Sets')).toBeNull()
  })

  it('links category cards correctly to their respective category pages', () => {
    render(
      <MemoryRouter>
        <CategoryGrid categories={mockCategories.slice(0, 3)} />
      </MemoryRouter>
    )

    const attarsLink = screen.getByRole('link', { name: /attars/i })
    expect(attarsLink.getAttribute('href')).toBe('/categories/attars')

    const oudLink = screen.getByRole('link', { name: /oud/i })
    expect(oudLink.getAttribute('href')).toBe('/categories/oud')
  })
})
