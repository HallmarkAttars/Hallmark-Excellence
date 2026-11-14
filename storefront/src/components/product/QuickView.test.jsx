// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import QuickView from './QuickView'
import { CartProvider } from '../../context/CartContext'
import { ToastProvider } from '../../context/ToastContext'

vi.mock('../../services/mockApi', () => ({
  getBrands: vi.fn().mockResolvedValue([]),
  getProductById: vi.fn().mockResolvedValue(null),
}))

describe('QuickView Component Pricing & Variant Logic', () => {
  afterEach(() => {
    cleanup()
  })

  const renderQuickView = (product, props = {}) =>
    render(
      <MemoryRouter>
        <CartProvider>
          <ToastProvider>
            <QuickView product={product} onClose={vi.fn()} {...props} />
          </ToastProvider>
        </CartProvider>
      </MemoryRouter>
    )

  const productWithVariants = {
    id: 1,
    name: 'Sports Polo',
    brand_name: 'Arees',
    price: 0,
    image: 'sports_polo.jpg',
    is_in_stock: true,
    rating: 4.3,
    review_count: 40,
    variants: [
      { id: 101, display_label: '6 Pieces', price: 240, is_default: true, active: true },
      { id: 102, display_label: '12 Pieces', price: 480, is_default: false, active: true },
      { id: 103, display_label: '24 Pieces', price: 960, is_default: false, active: true },
      { id: 104, display_label: '48 Pieces', price: 1920, is_default: false, active: true },
    ],
  }

  const productWithoutVariants = {
    id: 2,
    name: 'Simple Attar',
    brand_name: 'Arees',
    price: 500,
    image: 'simple_attar.jpg',
    is_in_stock: true,
    variants: [],
  }

  it('TEST 1 & 3: Displays default variant price initially and marks default variant as selected', () => {
    renderQuickView(productWithVariants)

    // Should display ₹240 (default variant price), NOT ₹0
    expect(screen.getByText('₹240')).toBeTruthy()
    expect(screen.queryByText('₹0')).toBeNull()

    // 6 Pieces button should be active
    const btn6 = screen.getByRole('button', { name: '6 Pieces' })
    expect(btn6.classList.contains('is-active')).toBe(true)
    expect(btn6.getAttribute('aria-pressed')).toBe('true')
  })

  it('TEST 2 & 4: Immediately updates price when customer selects another variant', () => {
    renderQuickView(productWithVariants)

    expect(screen.getByText('₹240')).toBeTruthy()

    // Click 24 Pieces
    const btn24 = screen.getByRole('button', { name: '24 Pieces' })
    fireEvent.click(btn24)

    // Price should immediately update to ₹960
    expect(screen.getByText('₹960')).toBeTruthy()
    expect(screen.queryByText('₹240')).toBeNull()
    expect(btn24.classList.contains('is-active')).toBe(true)
  })

  it('TEST 4: Product with no variants uses product.price', () => {
    renderQuickView(productWithoutVariants)

    expect(screen.getByText('₹500')).toBeTruthy()
    // No variant options rendered
    expect(screen.queryByText('Select Quantity')).toBeNull()
  })

  it('TEST 5: product.price = 0 with valid variants does not show ₹0', () => {
    const productZero = {
      ...productWithVariants,
      price: 0,
    }

    renderQuickView(productZero)

    expect(screen.getByText('₹240')).toBeTruthy()
    expect(screen.queryByText('₹0')).toBeNull()
  })

  it('TEST 6: Out of stock product disables Add to Cart button', () => {
    const oosProduct = {
      ...productWithVariants,
      is_in_stock: false,
    }

    renderQuickView(oosProduct)

    const btn = screen.getByRole('button', { name: /out of stock/i })
    expect(btn).toBeTruthy()
    expect(btn.disabled).toBe(true)
  })

  it('adds the selected variant directly to the cart and closes', () => {
    const onClose = vi.fn()
    renderQuickView(productWithVariants, { onClose })

    fireEvent.click(screen.getByRole('button', { name: '24 Pieces' }))
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
