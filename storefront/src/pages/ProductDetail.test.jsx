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

  it('selects 216 Pieces and initializes quantity to 216', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    expect(btn216.classList.contains('is-active')).toBe(true)
    expect(screen.getByText('216 Pieces selected')).toBeTruthy()
    expect(screen.getByText('216')).toBeTruthy()
    // No error boundary message
    expect(screen.queryByText(/Something went wrong/i)).toBeNull()
  })

  it('clicking + increments quantity 216 → 217 without changing selectedVariant', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plusBtn)

    // Quantity is now 217
    expect(screen.getByText('217')).toBeTruthy()
    // selectedVariant is still 216 Pieces
    expect(screen.getByText('216 Pieces selected')).toBeTruthy()
    expect(btn216.classList.contains('is-active')).toBe(true)
    // No error occurred
    expect(screen.queryByText(/Something went wrong/i)).toBeNull()
  })

  it('clicking + twice increments quantity 216 → 217 → 218', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plusBtn)
    fireEvent.click(plusBtn)

    expect(screen.getByText('218')).toBeTruthy()
    expect(screen.getByText('216 Pieces selected')).toBeTruthy()
    expect(screen.queryByText(/Something went wrong/i)).toBeNull()
  })

  it('clicking - decrements quantity 218 → 217', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plusBtn)
    fireEvent.click(plusBtn)
    expect(screen.getByText('218')).toBeTruthy()

    const minusBtn = screen.getByRole('button', { name: /Decrease quantity/i })
    fireEvent.click(minusBtn)
    expect(screen.getByText('217')).toBeTruthy()
    expect(screen.getByText('216 Pieces selected')).toBeTruthy()
  })

  it('quantity cannot go below selectedVariant', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    const minusBtn = screen.getByRole('button', { name: /Decrease quantity/i })
    // At 216, the minus button should be disabled
    expect(minusBtn.disabled).toBe(true)

    // Even if clicked, quantity stays at 216
    fireEvent.click(minusBtn)
    expect(screen.getByText('216')).toBeTruthy()
    expect(screen.queryByText('215')).toBeNull()
  })

  it('total price updates correctly when quantity changes (total = unitPrice × quantity)', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    // unitPrice is 30, so for 216 pieces: 30 * 216 = 6,480
    expect(screen.getByText(/6,480/)).toBeTruthy()

    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plusBtn)

    // for 217 pieces: 30 * 217 = 6,510
    expect(screen.getByText(/6,510/)).toBeTruthy()

    fireEvent.click(plusBtn)
    // for 218 pieces: 30 * 218 = 6,540
    expect(screen.getByText(/6,540/)).toBeTruthy()
  })

  it('Add to Cart sends selectedVariant and quantity separately', async () => {
    const onAddToCart = vi.fn()
    renderProductDetail({ onAddToCart })

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    // Select 216 Pieces
    const btn216 = screen.getByRole('button', { name: /216 Pieces/i })
    fireEvent.click(btn216)

    // Click + to make quantity 217
    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plusBtn)

    // Click Add to Cart
    const addBtn = screen.getByRole('button', { name: /Add to Cart/i })
    fireEvent.click(addBtn)

    expect(onAddToCart).toHaveBeenCalledTimes(1)
    expect(onAddToCart).toHaveBeenCalledWith({
      productId: 10,
      variantId: 110,
      selectedVariant: 216,
      quantity: 217,
    })
  })

  it('quantity control works for other variants (e.g. 60 Pieces: 60 → 61 → 62)', async () => {
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Royal Musk' })).toBeTruthy()
    })

    const btn60 = screen.getByRole('button', { name: /60 Pieces/i })
    fireEvent.click(btn60)

    expect(btn60.classList.contains('is-active')).toBe(true)
    expect(screen.getByText('60 Pieces selected')).toBeTruthy()
    expect(screen.getByText('60')).toBeTruthy()

    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i })
    fireEvent.click(plusBtn)
    expect(screen.getByText('61')).toBeTruthy()
    expect(screen.getByText('60 Pieces selected')).toBeTruthy()

    fireEvent.click(plusBtn)
    expect(screen.getByText('62')).toBeTruthy()
    expect(screen.getByText('60 Pieces selected')).toBeTruthy()
    // It must NOT switch variant to 72 Pieces
    expect(btn60.classList.contains('is-active')).toBe(true)
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
