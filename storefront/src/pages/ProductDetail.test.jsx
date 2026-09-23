// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProductDetail from './ProductDetail'
import { CartProvider } from '../context/CartContext'
import { ToastProvider } from '../context/ToastContext'

const mockSampleProduct = {
  id: 10,
  name: 'Royal Musk',
  brand_name: 'Arees',
  category_name: 'Attar',
  price: 0,
  image: 'royal_musk.jpg',
  is_in_stock: true,
  rating: 4.8,
  review_count: 55,
  variants: [
    { id: 101, display_label: '6 Pieces', price: 240, is_default: true, active: true },
    { id: 102, display_label: '12 Pieces', price: 450, is_default: false, active: true },
    { id: 103, display_label: '24 Pieces', price: 800, is_default: false, active: true },
    { id: 104, display_label: '48 Pieces', price: 1500, is_default: false, active: true },
  ],
}

vi.mock('../services/mockApi', () => ({
  getProductById: vi.fn(() => Promise.resolve(mockSampleProduct)),
  getRelatedProducts: vi.fn(() => Promise.resolve([])),
  getBrands: vi.fn(() => Promise.resolve([])),
}))

describe('ProductDetail Component Pricing & Variant Logic', () => {
  afterEach(() => {
    cleanup()
  })

  it('TEST 1 & 3: Automatically selects default active variant and displays its price on load', async () => {
    render(
      <MemoryRouter initialEntries={['/product/10']}>
        <ToastProvider>
          <CartProvider>
            <Routes>
              <Route path="/product/:id" element={<ProductDetail />} />
            </Routes>
          </CartProvider>
        </ToastProvider>
      </MemoryRouter>
    )

    // Wait for product to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    // 6 Pieces should be automatically selected
    const btn6 = screen.getByRole('button', { name: /6 Pieces/i })
    expect(btn6.classList.contains('is-active')).toBe(true)

    // Price should display ₹240, NOT ₹0
    expect(screen.getAllByText(/240/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/₹0/)).toBeNull()
  })

  it('TEST 2: Changing variant immediately updates the price to that variant price', async () => {
    render(
      <MemoryRouter initialEntries={['/product/10']}>
        <ToastProvider>
          <CartProvider>
            <Routes>
              <Route path="/product/:id" element={<ProductDetail />} />
            </Routes>
          </CartProvider>
        </ToastProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    expect(screen.getAllByText(/240/).length).toBeGreaterThan(0)

    // Click 24 Pieces
    const btn24 = screen.getByRole('button', { name: /24 Pieces/i })
    fireEvent.click(btn24)

    // Price should now show ₹800
    await waitFor(() => {
      expect(screen.getAllByText(/800/).length).toBeGreaterThan(0)
      expect(btn24.classList.contains('is-active')).toBe(true)
    })
  })
})
