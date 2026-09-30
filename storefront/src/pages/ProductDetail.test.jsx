// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
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
    { id: 101, display_label: '6 Pieces', quantity_value: 6, quantity_unit: 'Pieces', price: 240, price_per_unit: 40, is_default: true, active: true },
    { id: 102, display_label: '12 Pieces', quantity_value: 12, quantity_unit: 'Pieces', price: 450, price_per_unit: 37.5, is_default: false, active: true },
    { id: 103, display_label: '24 Pieces', quantity_value: 24, quantity_unit: 'Pieces', price: 800, price_per_unit: 33.33, is_default: false, active: true },
    { id: 104, display_label: '36 Pieces', quantity_value: 36, quantity_unit: 'Pieces', price: 1200, price_per_unit: 33.33, is_default: false, active: true },
    { id: 105, display_label: '60 Pieces', quantity_value: 60, quantity_unit: 'Pieces', price: 1800, price_per_unit: 30, is_default: false, active: true },
    { id: 106, display_label: '72 Pieces', quantity_value: 72, quantity_unit: 'Pieces', price: 2160, price_per_unit: 30, is_default: false, active: true },
    { id: 107, display_label: '96 Pieces', quantity_value: 96, quantity_unit: 'Pieces', price: 2880, price_per_unit: 30, is_default: false, active: true },
    { id: 108, display_label: '120 Pieces', quantity_value: 120, quantity_unit: 'Pieces', price: 3600, price_per_unit: 30, is_default: false, active: true },
    { id: 109, display_label: '180 Pieces', quantity_value: 180, quantity_unit: 'Pieces', price: 5400, price_per_unit: 30, is_default: false, active: true },
    { id: 110, display_label: '216 Pieces', quantity_value: 216, quantity_unit: 'Pieces', price: 6480, price_per_unit: 30, is_default: false, active: true },
  ],
}

vi.mock('../services/mockApi', () => ({
  getProductById: vi.fn(() => Promise.resolve(mockSampleProduct)),
  getRelatedProducts: vi.fn(() => Promise.resolve([])),
  getBrands: vi.fn(() => Promise.resolve([])),
}))

function renderProductDetail(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/product/10']}>
      <ToastProvider>
        <CartProvider>
          <Routes>
            <Route path="/product/:id" element={<ProductDetail {...props} />} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('ProductDetail Component Pricing & Variant Logic', () => {
  afterEach(() => {
    cleanup()
  })

  it('TEST 1 & 3: Automatically selects default active variant and displays its price on load', async () => {
    renderProductDetail()

    // Wait for product to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    // 6 Pieces should be automatically selected
    const btn6 = screen.getByRole('button', { name: /^6 Pieces/i })
    expect(btn6.classList.contains('is-active')).toBe(true)

    // Price should display ₹240, NOT ₹0
    expect(screen.getAllByText(/240/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/₹0/)).toBeNull()
  })

  it('TEST 2: Changing variant immediately updates the price to that variant price', async () => {
    renderProductDetail()

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

  it('selects 216 Pieces and initializes quantity to 1 with totalPieces = 216', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    expect(btn216.classList.contains('is-active')).toBe(true)
    expect(screen.getByText('216 Pieces × 1')).toBeTruthy()
    expect(screen.getByText('Total Pieces: 216')).toBeTruthy()
    expect(screen.getByText(/6,480/)).toBeTruthy()
    expect(screen.queryByText(/Something went wrong/i)).toBeNull()
  })

  it('clicking + increments quantity to 2 and totalPieces to 432 (216 × 2)', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plusBtn)

    // Quantity is now 2 packages
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('216 Pieces × 2')).toBeTruthy()
    expect(screen.getByText('Total Pieces: 432')).toBeTruthy()
    // 30 per piece * 432 pieces = 12,960
    expect(screen.getByText(/12,960/)).toBeTruthy()
    expect(btn216.classList.contains('is-active')).toBe(true)
    expect(screen.queryByText(/Something went wrong/i)).toBeNull()
  })

  it('clicking + twice increments quantity 1 → 2 → 3 and totalPieces 216 → 432 → 648', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plusBtn)
    fireEvent.click(plusBtn)

    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('216 Pieces × 3')).toBeTruthy()
    expect(screen.getByText('Total Pieces: 648')).toBeTruthy()
    // 30 per piece * 648 pieces = 19,440
    expect(screen.getByText(/19,440/)).toBeTruthy()
    expect(screen.queryByText(/Something went wrong/i)).toBeNull()
  })

  it('clicking - decrements quantity 3 → 2 → 1 and never drops below 1', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plusBtn)
    fireEvent.click(plusBtn)
    expect(screen.getByText('3')).toBeTruthy()

    const minusBtn = screen.getByRole('button', { name: /Decrease quantity/i })
    fireEvent.click(minusBtn)
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('216 Pieces × 2')).toBeTruthy()
    expect(screen.getByText('Total Pieces: 432')).toBeTruthy()

    fireEvent.click(minusBtn)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('216 Pieces × 1')).toBeTruthy()
    expect(screen.getByText('Total Pieces: 216')).toBeTruthy()

    // At 1, minus button is disabled and clicking it does not decrease below 1
    expect(minusBtn.disabled).toBe(true)
    fireEvent.click(minusBtn)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('Total Pieces: 216')).toBeTruthy()
  })

  it('when changing variant, quantity remains independent (e.g. 216 Pieces with qty 2 to 60 Pieces yields 60 Pieces × 2 = 120 Total Pieces)', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    // Select 216 Pieces
    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    // Increase quantity to 2
    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plusBtn)
    expect(screen.getByText('216 Pieces × 2')).toBeTruthy()
    expect(screen.getByText('Total Pieces: 432')).toBeTruthy()

    // Switch variant to 60 Pieces
    const btn60 = screen.getByRole('button', { name: /60 Pieces/i })
    fireEvent.click(btn60)

    // Quantity must remain 2!
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('60 Pieces × 2')).toBeTruthy()
    expect(screen.getByText('Total Pieces: 120')).toBeTruthy()
    // 30 per piece * 120 pieces = 3,600
    expect(screen.getByText(/3,600/)).toBeTruthy()
  })

  it('Add to Cart provides cart data { variantId, variantPieces, quantity, totalPieces, unitPrice, totalPrice }', async () => {
    const onAddToCart = vi.fn()
    renderProductDetail({ onAddToCart })

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    // Select 60 Pieces (variantId: 105, price_per_unit: 30)
    const btn60 = screen.getByRole('button', { name: /60 Pieces/i })
    fireEvent.click(btn60)

    // Quantity to 2
    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plusBtn)

    // Click Add to Cart
    const addBtn = screen.getByRole('button', { name: /Add to Cart/i })
    fireEvent.click(addBtn)

    expect(onAddToCart).toHaveBeenCalledTimes(1)
    expect(onAddToCart).toHaveBeenCalledWith({
      productId: 10,
      variantId: 105,
      variantPieces: 60,
      quantity: 2,
      totalPieces: 120,
      unitPrice: 30,
      totalPrice: 3600,
    })
  })

  it('no page reload or error occurs when interacting with quantity and variants', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    // Rapidly click various variants and plus/minus
    fireEvent.click(screen.getByRole('button', { name: /216 Pieces/i }))
    const plus = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plus)
    fireEvent.click(plus)
    const minus = screen.getByRole('button', { name: /Decrease quantity/i })
    fireEvent.click(minus)

    fireEvent.click(screen.getByRole('button', { name: /12 Pieces/i }))
    fireEvent.click(plus)

    expect(screen.queryByText(/Something went wrong/i)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
