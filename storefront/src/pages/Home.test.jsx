// @vitest-environment jsdom
//
// INTEGRATION test for the real <Home> page (storefront/src/pages/Home.jsx).
//
// Only the data layer is mocked (mockApi) — the hero, the category section,
// the brands skeleton and the reveal system all run for real inside a real
// MemoryRouter. Proves end-to-end that:
//
//   • the "Shop by Category" heading and VIEW ALL CTA paint IMMEDIATELY,
//     before the categories API resolves (this heading is the mobile LCP
//     element and must never wait on data or a scroll-reveal fade),
//   • once categories arrive the real CategoryGrid renders inside the same
//     section, linked to /categories/<slug>,
//   • the heading stays a single copy — the grid body no longer renders one.
//
// Run with:  npm test  (storefront)

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

// Mock ONLY the data layer. Everything else is the real production code.
vi.mock('../services/mockApi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getCategories: vi.fn(),
    getBrands: vi.fn(),
    getFeaturedProducts: vi.fn(),
  }
})

import { getCategories, getBrands, getFeaturedProducts } from '../services/mockApi'

// vitest registers no global cleanup — unmount between tests explicitly.
afterEach(() => cleanup())

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

describe('Home Category Section', () => {
  it('renders the Shop by Category heading immediately while data is still loading', () => {
    // Never-resolving promises: the heading must render regardless.
    getCategories.mockImplementation(() => new Promise(() => {}))
    getBrands.mockImplementation(() => new Promise(() => {}))
    getFeaturedProducts.mockImplementation(() => new Promise(() => {}))

    renderHome()

    expect(screen.getByText('EXPLORE OUR COLLECTION')).toBeTruthy()
    const heading = screen.getByRole('heading', { level: 2, name: 'Shop by Category' })
    expect(heading).toBeTruthy()

    const viewAll = screen.getByRole('link', { name: /view all/i })
    expect(viewAll).toBeTruthy()
    expect(viewAll.getAttribute('href')).toBe('/categories')
  })

  it('renders the real category grid inside the section once data arrives', async () => {
    getCategories.mockResolvedValue([
      { id: 'c1', name: 'Attars', slug: 'attars', image: 'https://res.cloudinary.com/example/attar.jpg' },
      { id: 'c2', name: 'Oud', slug: 'oud', image: 'https://res.cloudinary.com/example/oud.jpg' },
    ])
    getBrands.mockResolvedValue([])
    getFeaturedProducts.mockResolvedValue([])

    renderHome()

    // Loading state first, then the real cards in the same section. Query by
    // href — the hero CTA "Explore Attars" also matches the /attars/i regex.
    await waitFor(() => {
      const attarsCard = screen
        .getAllByRole('link')
        .find((link) => link.getAttribute('href') === '/categories/attars')
      expect(attarsCard).toBeTruthy()
    })
    // The heading has always been there — and exactly once.
    expect(screen.getAllByText('Shop by Category')).toHaveLength(1)
  })
})
