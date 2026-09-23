// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Cart from './Cart'
import { CartProvider, useCart } from '../context/CartContext'

// Mock getBrands
vi.mock('../services/mockApi', () => ({
  getBrands: vi.fn(() => Promise.resolve([])),
}))

// In-memory localStorage mock
const storage = {}
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, value) => {
    storage[key] = String(value)
  }),
  removeItem: vi.fn((key) => {
    delete storage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((k) => delete storage[k])
  }),
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Helper component to add items to cart and render Cart page
function CartTestWrapper({ initialActions }) {
  function Inner() {
    const { addItem } = useCart()
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            if (initialActions) initialActions(addItem)
          }}
        >
          Setup Cart
        </button>
        <Cart />
      </div>
    )
  }

  return (
    <MemoryRouter>
      <CartProvider>
        <Inner />
      </CartProvider>
    </MemoryRouter>
  )
}

describe('Cart Page & Price Priority Integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  // TEST 1: Product with default variant
  it('TEST 1: correctly prices product with default variant (6 Pieces -> ₹240)', () => {
    const product = {
      id: 'p1',
      name: 'Sports Polo',
      price: 0,
      variants: [
        { id: 'v1', display_label: '6 Pieces', quantity_value: 6, quantity_unit: 'Pieces', price: 240, is_default: true, active: true },
        { id: 'v2', display_label: '12 Pieces', quantity_value: 12, quantity_unit: 'Pieces', price: 480, is_default: false, active: true },
      ],
    }

    const { getByRole, getByText, getAllByText } = render(
      <CartTestWrapper
        initialActions={(addItem) => {
          const defVar = product.variants.find((v) => v.is_default)
          addItem(product, 1, defVar)
        }}
      />
    )

    fireEvent.click(getByRole('button', { name: /setup cart/i }))

    expect(getByText('Sports Polo')).toBeTruthy()
    expect(getByText(/6 Pieces/i)).toBeTruthy()
    expect(getAllByText('₹240').length).toBeGreaterThan(0)
  })

  // TEST 2: Customer selects another variant (24 Pieces -> ₹960)
  it('TEST 2: correctly prices explicitly selected non-default variant (24 Pieces -> ₹960)', () => {
    const product = {
      id: 'p1',
      name: 'Sports Polo',
      price: 0,
      variants: [
        { id: 'v1', display_label: '6 Pieces', quantity_value: 6, quantity_unit: 'Pieces', price: 240, is_default: true, active: true },
        { id: 'v2', display_label: '12 Pieces', quantity_value: 12, quantity_unit: 'Pieces', price: 480, is_default: false, active: true },
        { id: 'v3', display_label: '24 Pieces', quantity_value: 24, quantity_unit: 'Pieces', price: 960, is_default: false, active: true },
      ],
    }

    const { getByRole, getByText, queryByText, getAllByText } = render(
      <CartTestWrapper
        initialActions={(addItem) => {
          const selectedVar = product.variants.find((v) => v.id === 'v3')
          addItem(product, 1, selectedVar)
        }}
      />
    )

    fireEvent.click(getByRole('button', { name: /setup cart/i }))

    expect(getByText('Sports Polo')).toBeTruthy()
    expect(getByText(/24 Pieces/i)).toBeTruthy()
    expect(getAllByText('₹960').length).toBeGreaterThan(0)
    // Must NOT be ₹240
    expect(queryByText('₹240')).toBeNull()
  })

  // TEST 3: Product with no default variant
  it('TEST 3: falls back to first active valid variant when no default exists (₹240)', () => {
    const product = {
      id: 'p1',
      name: 'Sports Polo',
      price: 0,
      variants: [
        { id: 'v1', display_label: '6 Pieces', quantity_value: 6, quantity_unit: 'Pieces', price: 240, is_default: false, active: true },
        { id: 'v2', display_label: '12 Pieces', quantity_value: 12, quantity_unit: 'Pieces', price: 480, is_default: false, active: true },
      ],
    }

    const { getByRole, getByText, getAllByText } = render(
      <CartTestWrapper
        initialActions={(addItem) => {
          // Add product without explicitly picking a variant
          addItem(product, 1)
        }}
      />
    )

    fireEvent.click(getByRole('button', { name: /setup cart/i }))

    expect(getByText('Sports Polo')).toBeTruthy()
    expect(getAllByText('₹240').length).toBeGreaterThan(0)
  })

  // TEST 4: Product with no variants (product.price = ₹500)
  it('TEST 4: correctly prices variant-less product at product.price (₹500)', () => {
    const product = {
      id: 'p-no-variants',
      name: 'Pure Oud Wood',
      price: 500,
      variants: [],
    }

    const { getByRole, getByText, getAllByText } = render(
      <CartTestWrapper
        initialActions={(addItem) => {
          addItem(product, 1)
        }}
      />
    )

    fireEvent.click(getByRole('button', { name: /setup cart/i }))

    expect(getByText('Pure Oud Wood')).toBeTruthy()
    expect(getAllByText('₹500').length).toBeGreaterThan(0)
  })

  // TEST 5: product.price = ₹0, valid variant = ₹240
  it('TEST 5: never uses product.price=0 when valid variant price exists (₹240)', () => {
    const product = {
      id: 'p-zero-price',
      name: 'Sports Polo Zero Price',
      price: 0,
      variants: [
        { id: 'v1', display_label: '6 Pieces', quantity_value: 6, quantity_unit: 'Pieces', price: 240, is_default: true, active: true },
      ],
    }

    const { getByRole, getByText, queryByText, getAllByText } = render(
      <CartTestWrapper
        initialActions={(addItem) => {
          addItem(product, 1, product.variants[0])
        }}
      />
    )

    fireEvent.click(getByRole('button', { name: /setup cart/i }))

    expect(getByText('Sports Polo Zero Price')).toBeTruthy()
    expect(getAllByText('₹240').length).toBeGreaterThan(0)
    expect(queryByText('₹0')).toBeNull()
  })

  // TEST 6: Out-of-stock product
  it('TEST 6: loads out-of-stock product normally and displays Out of Stock badge', () => {
    const product = {
      id: 'p-oos',
      name: 'Sold Out Scent',
      price: 450,
      is_in_stock: false,
    }

    const { getByRole, getByText } = render(
      <CartTestWrapper
        initialActions={(addItem) => {
          addItem(product, 1)
        }}
      />
    )

    fireEvent.click(getByRole('button', { name: /setup cart/i }))

    expect(getByText('Sold Out Scent')).toBeTruthy()
    expect(getByText('Out of Stock')).toBeTruthy()

    // Confirm checkout warning displays instead of navigating
    const checkoutBtn = getByRole('button', { name: /confirm order/i })
    fireEvent.click(checkoutBtn)
    expect(getByText(/sold out scent is currently out of stock/i)).toBeTruthy()
  })

  // TEST 7: Legacy cart item with missing variant_id
  it('TEST 7: safely renders legacy cart item without variant_id from localStorage', () => {
    const legacyItem = {
      product_id: 'leg-1',
      name: 'Legacy Rose Attar',
      price: 320,
      quantity: 1,
    }
    localStorage.setItem('ad_cart_v1', JSON.stringify([legacyItem]))

    const { getByText, getAllByText } = render(
      <MemoryRouter>
        <CartProvider>
          <Cart />
        </CartProvider>
      </MemoryRouter>
    )

    expect(getByText('Legacy Rose Attar')).toBeTruthy()
    expect(getAllByText('₹320').length).toBeGreaterThan(0)
  })

  // TEST 8: Missing variants array
  it('TEST 8: safely renders item when variants property is undefined or missing', () => {
    const itemWithoutVariants = {
      product_id: 'no-var-prop',
      name: 'No Variant Property Item',
      price: 600,
      variants: null,
      quantity: 1,
    }
    localStorage.setItem('ad_cart_v1', JSON.stringify([itemWithoutVariants]))

    const { getByText, getAllByText } = render(
      <MemoryRouter>
        <CartProvider>
          <Cart />
        </CartProvider>
      </MemoryRouter>
    )

    expect(getByText('No Variant Property Item')).toBeTruthy()
    expect(getAllByText('₹600').length).toBeGreaterThan(0)
  })

  // TEST 9: Invalid variant_id
  it('TEST 9: safely falls back when variant_id is invalid or missing in variants list', () => {
    const itemWithInvalidVariant = {
      product_id: 'invalid-v',
      name: 'Mismatched Variant Item',
      variant_id: 'non-existent-variant-999',
      price: 250,
      variants: [
        { id: 'v1', price: 250, is_default: true, active: true },
      ],
      quantity: 1,
    }
    localStorage.setItem('ad_cart_v1', JSON.stringify([itemWithInvalidVariant]))

    const { getByText, getAllByText } = render(
      <MemoryRouter>
        <CartProvider>
          <Cart />
        </CartProvider>
      </MemoryRouter>
    )

    expect(getByText('Mismatched Variant Item')).toBeTruthy()
    expect(getAllByText('₹250').length).toBeGreaterThan(0)
  })

  // TEST 10: Multiple cart items calculate independently and subtotal is sum
  it('TEST 10: calculates multiple items independently and sums to subtotal', () => {
    const cartItems = [
      {
        product_id: 'p1',
        name: 'Sports Polo',
        variant_total_price: 960,
        variant_label: '24 Pieces',
        quantity: 2, // 960 * 2 = 1920
      },
      {
        product_id: 'p2',
        name: 'Pure Oud',
        price: 500,
        quantity: 1, // 500 * 1 = 500
      },
    ]
    localStorage.setItem('ad_cart_v1', JSON.stringify(cartItems))

    const { getByText, getAllByText } = render(
      <MemoryRouter>
        <CartProvider>
          <Cart />
        </CartProvider>
      </MemoryRouter>
    )

    expect(getByText('Sports Polo')).toBeTruthy()
    expect(getByText('Pure Oud')).toBeTruthy()
    expect(getByText('₹1,920')).toBeTruthy() // Sports Polo line total
    expect(getByText('₹500')).toBeTruthy()   // Pure Oud line total
    // Subtotal: 1920 + 500 = 2420
    expect(getAllByText('₹2,420').length).toBeGreaterThan(0)
  })
})
