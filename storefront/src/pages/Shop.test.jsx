// @vitest-environment jsdom
//
// INTEGRATION test for the real <Shop> page (storefront/src/pages/Shop.jsx).
//
// Only the data layer is mocked (mockApi) — the page, ProductGrid,
// ProductCard, the filter drawer, <Pagination> and the shared usePagination
// hook all run for real, inside a real MemoryRouter. Proves end-to-end that:
//
//   • a deep link to /shop?page=2 renders the products 51–69 slice (19 cards),
//   • the highlighted current page matches the rendered slice,
//   • page-number / prev / next clicks navigate through the real router,
//   • invalid ?page= values fall back to page 1,
//   • selecting a category that shrinks the list resets page 3 → page 1.
//
// Browser back/forward itself lives in the router + usePagination (unit-tested
// in hooks/usePagination.test.jsx); here every assertion goes through a
// genuine URL → render → slice round-trip.
//
// Run with:  npm test  (storefront)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Shop from './Shop'
import { CartProvider } from '../context/CartContext'
import { getProducts, getCategories, getBrands } from '../services/mockApi'

// Mock ONLY the data layer. Everything else is the real production code.
vi.mock('../services/mockApi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    getBrands: vi.fn(),
  }
})

// Vitest runs without global test hooks by default, so @testing-library's
// auto-cleanup never registers — unmount between tests explicitly.
afterEach(() => cleanup())

// n dummy products. `start` offsets the ids/names (used to build a 3-page
// list whose 3rd page holds a separate category), so the filter test can
// narrow a multi-page list down to a single page.
function makeProducts(n, { categoryId = 'cat-1', categoryName = 'Attar', start = 1 } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const idx = start + i
    return {
      id: `p-${idx}`,
      name: `Product ${idx}`,
      image: `https://example.com/img/${idx}.jpg`,
      price: 100 + idx,
      category_id: categoryId,
      category_name: categoryName,
      brand_id: 'brand-1',
      brand_name: 'Arees',
      is_featured: false,
    }
  })
}

const CATEGORIES = [
  { id: 'cat-1', name: 'Attar', slug: 'attar' },
  { id: 'cat-2', name: 'Oud', slug: 'oud' },
]
const BRANDS = [{ id: 'brand-1', name: 'Arees', slug: 'arees', is_active: true }]

beforeEach(() => {
  vi.clearAllMocks()
  getCategories.mockResolvedValue(CATEGORIES)
  getBrands.mockResolvedValue(BRANDS)
})

function renderShop(initialEntry = '/shop') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <CartProvider>
        <Shop />
      </CartProvider>
    </MemoryRouter>
  )
}

// One per product card — the image link carries aria-label "View <name>".
const productCards = () => screen.getAllByRole('link', { name: /^View Product/ })
const pageButton = (n) => screen.getByRole('button', { name: `Page ${n}` })
const prevButton = () => screen.getByRole('button', { name: 'Previous page' })
const nextButton = () => screen.getByRole('button', { name: 'Next page' })

describe('Shop page — URL-driven pagination (integration)', () => {
  it('?page=2 renders products 51–69 (19 cards) and highlights page 2', async () => {
    getProducts.mockResolvedValue(makeProducts(69))
    renderShop('/shop?page=2')

    // The page-2 slice loads: Product 51 present, Product 1 absent.
    expect(await screen.findByText('Product 51')).toBeTruthy()
    expect(screen.getByText('Product 69')).toBeTruthy()
    expect(screen.queryByText('Product 1')).toBeNull()

    // Exactly 19 product cards on page 2 of 69.
    expect(productCards()).toHaveLength(19)

    // No product-count text is rendered, and the highlighted page matches.
    expect(screen.queryByText(/Showing \d+ (of \d+ )?products/i)).toBeNull()
    expect(pageButton(2).getAttribute('aria-current')).toBe('page')
    expect(pageButton(1).hasAttribute('aria-current')).toBe(false)
    // On the LAST page: next is disabled, prev is enabled.
    expect(nextButton().disabled).toBe(true)
    expect(prevButton().disabled).toBe(false)
  })

  it('no ?page= renders page 1 — products 1–50, next enabled, prev disabled', async () => {
    getProducts.mockResolvedValue(makeProducts(69))
    renderShop('/shop')

    expect(await screen.findByText('Product 1')).toBeTruthy()
    expect(screen.getByText('Product 50')).toBeTruthy()
    expect(screen.queryByText('Product 51')).toBeNull()

    expect(productCards()).toHaveLength(50)
    expect(screen.queryByText(/Showing \d+ (of \d+ )?products/i)).toBeNull()
    expect(pageButton(1).getAttribute('aria-current')).toBe('page')
    // On the FIRST page: prev is disabled, next is enabled.
    expect(prevButton().disabled).toBe(true)
    expect(nextButton().disabled).toBe(false)
  })

  it('clicking → on page 1 navigates to page 2 (51–69) through the router', async () => {
    getProducts.mockResolvedValue(makeProducts(69))
    renderShop('/shop')

    expect(await screen.findByText('Product 1')).toBeTruthy()
    fireEvent.click(nextButton())

    expect(await screen.findByText('Product 51')).toBeTruthy()
    expect(screen.queryByText('Product 1')).toBeNull()
    expect(productCards()).toHaveLength(19)
    expect(screen.queryByText(/Showing \d+ (of \d+ )?products/i)).toBeNull()
    expect(pageButton(2).getAttribute('aria-current')).toBe('page')
    expect(nextButton().disabled).toBe(true) // now on the last page
  })

  it('clicking a page number jumps directly (page 2 → page 1)', async () => {
    getProducts.mockResolvedValue(makeProducts(69))
    renderShop('/shop?page=2')

    expect(await screen.findByText('Product 51')).toBeTruthy()
    fireEvent.click(pageButton(1))

    expect(await screen.findByText('Product 1')).toBeTruthy()
    expect(screen.queryByText('Product 51')).toBeNull()
    expect(productCards()).toHaveLength(50)
    expect(screen.queryByText(/Showing \d+ (of \d+ )?products/i)).toBeNull()
    expect(pageButton(1).getAttribute('aria-current')).toBe('page')
  })

  it('an invalid ?page= value falls back to page 1', async () => {
    getProducts.mockResolvedValue(makeProducts(69))
    renderShop('/shop?page=abc')

    expect(await screen.findByText('Product 1')).toBeTruthy()
    expect(screen.queryByText(/Showing \d+ (of \d+ )?products/i)).toBeNull()
    expect(pageButton(1).getAttribute('aria-current')).toBe('page')
  })

  it('an out-of-range ?page= clamps to the last page, never an empty page', async () => {
    getProducts.mockResolvedValue(makeProducts(69))
    renderShop('/shop?page=999')

    // 69 products → 2 pages; page 999 clamps to page 2 (19 items).
    expect(await screen.findByText('Product 51')).toBeTruthy()
    expect(screen.queryByText(/Showing \d+ (of \d+ )?products/i)).toBeNull()
    expect(pageButton(2).getAttribute('aria-current')).toBe('page')
  })

  it('selecting a category that shrinks the list resets page 3 → page 1', async () => {
    // 120 products: 100 Attar (pages 1–2) + 20 Oud (page 3 only).
    getProducts.mockResolvedValue([
      ...makeProducts(100, { categoryId: 'cat-1', categoryName: 'Attar', start: 1 }),
      ...makeProducts(20, { categoryId: 'cat-2', categoryName: 'Oud', start: 101 }),
    ])
    renderShop('/shop?page=3')

    // Page 3 of 3 shows the 20 Oud products.
    expect(await screen.findByText('Product 101')).toBeTruthy()
    expect(screen.queryByText(/Showing \d+ (of \d+ )?products/i)).toBeNull()
    expect(pageButton(3).getAttribute('aria-current')).toBe('page')
    expect(nextButton().disabled).toBe(true)

    // Filter to Oud only → 20 products → single page → must land on page 1.
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = screen.getByRole('dialog', { name: 'Product filters' })
    fireEvent.click(within(dialog).getByText('Oud'))

    // Back on page 1 of a 1-page result set: pagination disappears entirely,
    // and only Oud products remain — no count text anywhere.
    await waitFor(() => expect(screen.queryByText('Product 1')).toBeNull()) // Attar product gone
    expect(screen.queryByText(/Showing \d+ (of \d+ )?products/i)).toBeNull()
    expect(screen.getByText('Product 101')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Page 2' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull()
  })
})
