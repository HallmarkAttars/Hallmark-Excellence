// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CategoryGrid from './CategoryGrid'

const mockImage = (id) =>
  `https://res.cloudinary.com/llo1vkiz/image/upload/v1788000000/perfume-ecommerce/${id}.webp`

const mockCategories = [
  { id: '1', name: 'Attars', slug: 'attars', image: mockImage('attar') },
  { id: '2', name: 'Oud', slug: 'oud', image: mockImage('oud') },
  { id: '3', name: 'Bakhoor', slug: 'bakhoor', image: mockImage('bakhoor') },
  { id: '4', name: 'Perfume Oils', slug: 'perfume-oils', image: mockImage('oils') },
  { id: '5', name: 'Dahab Series', slug: 'dahab-series', image: mockImage('dahab') },
  { id: '6', name: 'Musk Collection', slug: 'musk-collection', image: mockImage('musk') },
  { id: '7', name: 'Amber Special', slug: 'amber-special', image: mockImage('amber') },
  { id: '8', name: 'Luxury Gift Sets', slug: 'luxury-gift-sets', image: mockImage('gifts') },
]

describe('CategoryGrid Component', () => {
  afterEach(() => {
    cleanup()
  })

  // The "Shop by Category" header lives in <Home> now (paints before the
  // categories API resolves — the mobile LCP element). CategoryGrid is the
  // grid body only and must NOT render a duplicate heading.
  it('renders the grid body only — no section header owned here', () => {
    render(
      <MemoryRouter>
        <CategoryGrid categories={mockCategories} />
      </MemoryRouter>
    )

    expect(screen.queryByText('Shop by Category')).toBeNull()
    expect(screen.queryByText('EXPLORE OUR COLLECTION')).toBeNull()
    expect(screen.queryByText(/view all/i)).toBeNull()
  })

  it('renders exactly 6 categories when 8 categories are provided', () => {
    render(
      <MemoryRouter>
        <CategoryGrid categories={mockCategories} />
      </MemoryRouter>
    )

    // Should only have 6 category card links
    const categoryLinks = screen.getAllByRole('link')
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

  // Performance contract: category images stay small on mobile via srcSet +
  // sizes, and never race the LCP paint with a high fetch priority.
  it('serves responsive category images with a low fetch priority', () => {
    render(
      <MemoryRouter>
        <CategoryGrid categories={mockCategories.slice(0, 1)} />
      </MemoryRouter>
    )

    const img = screen.getByAltText('Attars')
    expect(img.getAttribute('src')).toContain('w_500')
    const srcSet = img.getAttribute('srcset') || ''
    expect(srcSet).toContain('w_300')
    expect(srcSet).toContain('w_400')
    expect(srcSet).toContain('w_500')
    expect(img.getAttribute('sizes')).toBe('(max-width: 767px) 45vw, 300px')
    expect(img.getAttribute('fetchpriority')).toBe('low')
  })
})
