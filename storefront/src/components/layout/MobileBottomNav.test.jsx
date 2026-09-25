// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MobileBottomNav from './MobileBottomNav'
import * as CartContext from '../../context/CartContext'

// Mock useCart hook
vi.mock('../../context/CartContext', () => ({
  useCart: vi.fn(),
}))

function renderWithRoute(route = '/', itemCount = 0) {
  CartContext.useCart.mockReturnValue({
    itemCount,
  })

  return render(
    <MemoryRouter initialEntries={[route]}>
      <MobileBottomNav />
    </MemoryRouter>
  )
}

describe('MobileBottomNav Component', () => {
  afterEach(() => cleanup())

  it('renders all 5 navigation items with correct accessible labels and links', () => {
    renderWithRoute('/')

    const homeLink = screen.getByRole('link', { name: 'Home' })
    const categoriesLink = screen.getByRole('link', { name: 'Categories' })
    const brandsLink = screen.getByRole('link', { name: 'Brands' })
    const cartLink = screen.getByRole('link', { name: 'Cart' })
    const trackLink = screen.getByRole('link', { name: 'Track Order' })

    expect(homeLink).toBeTruthy()
    expect(homeLink.getAttribute('href')).toBe('/')

    expect(categoriesLink).toBeTruthy()
    expect(categoriesLink.getAttribute('href')).toBe('/categories')

    expect(brandsLink).toBeTruthy()
    expect(brandsLink.getAttribute('href')).toBe('/brands')

    expect(cartLink).toBeTruthy()
    expect(cartLink.getAttribute('href')).toBe('/cart')

    expect(trackLink).toBeTruthy()
    expect(trackLink.getAttribute('href')).toBe('/track-order')
  })

  it('marks Home as active when on homepage ("/")', () => {
    renderWithRoute('/')

    const homeLink = screen.getByRole('link', { name: 'Home' })
    expect(homeLink.classList.contains('is-active')).toBe(true)
    expect(homeLink.getAttribute('aria-current')).toBe('page')

    const categoriesLink = screen.getByRole('link', { name: 'Categories' })
    expect(categoriesLink.classList.contains('is-active')).toBe(false)
    expect(categoriesLink.getAttribute('aria-current')).toBeNull()
  })

  it('marks Categories as active when on "/categories" or subcategory', () => {
    const { unmount } = renderWithRoute('/categories')
    const categoriesLink = screen.getByRole('link', { name: 'Categories' })
    expect(categoriesLink.classList.contains('is-active')).toBe(true)
    unmount()

    renderWithRoute('/categories/attars')
    expect(screen.getByRole('link', { name: 'Categories' }).classList.contains('is-active')).toBe(true)
  })

  it('marks Brands as active when on "/brands" or "/brand/:slug"', () => {
    const { unmount } = renderWithRoute('/brands')
    expect(screen.getByRole('link', { name: 'Brands' }).classList.contains('is-active')).toBe(true)
    unmount()

    renderWithRoute('/brand/arees')
    expect(screen.getByRole('link', { name: 'Brands' }).classList.contains('is-active')).toBe(true)
  })

  it('marks Cart as active when on "/cart"', () => {
    renderWithRoute('/cart')
    const cartLink = screen.getByRole('link', { name: 'Cart' })
    expect(cartLink.classList.contains('is-active')).toBe(true)
    expect(screen.getByRole('link', { name: 'Home' }).classList.contains('is-active')).toBe(false)
  })

  it('marks Track Order as active when on "/track-order"', () => {
    renderWithRoute('/track-order')
    const trackLink = screen.getByRole('link', { name: 'Track Order' })
    expect(trackLink.classList.contains('is-active')).toBe(true)
    expect(screen.getByRole('link', { name: 'Home' }).classList.contains('is-active')).toBe(false)
  })

  it('does NOT render cart badge when itemCount is 0', () => {
    renderWithRoute('/', 0)
    expect(screen.queryByLabelText(/items in cart/i)).toBeNull()
  })

  it('renders cart quantity badge when itemCount > 0', () => {
    renderWithRoute('/', 3)
    const badge = screen.getByLabelText('3 items in cart')
    expect(badge).toBeTruthy()
    expect(badge.textContent).toBe('3')
  })
})
