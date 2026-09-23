// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProductCard from './ProductCard'

describe('ProductCard Component', () => {
  afterEach(() => {
    cleanup()
  })

  const sampleProduct = {
    id: 101,
    name: 'Sports Polo',
    category_name: 'Roll On Attars',
    brand_name: 'Arees',
    rating: 4.3,
    review_count: 40,
    price: 240,
    image: 'sample_sports_polo.jpg',
    is_in_stock: true,
    is_featured: true,
    variants: [
      { id: 1, quantity_value: 216, quantity_unit: 'Pieces', price: 240, is_default: true, active: true },
      { id: 2, quantity_value: 432, quantity_unit: 'Pieces', price: 480, is_default: false, active: true },
    ],
  }

  it('renders standard card with large product image and NO price when hideImage is false/omitted', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={sampleProduct} />
      </MemoryRouter>
    )

    // Media element and image should exist
    const media = container.querySelector('.product-card-media')
    expect(media).not.toBeNull()

    const img = screen.getByRole('img', { name: /sports polo/i })
    expect(img).toBeTruthy()

    // Status badges in media
    expect(screen.getByText('Featured')).toBeTruthy()

    // Quick view floating button in media
    const quickViewBtn = container.querySelector('.product-card-quickview')
    expect(quickViewBtn).not.toBeNull()

    // MUST NOT RENDER ANY PRICE
    expect(screen.queryByText(/₹/)).toBeNull()
  })

  it('hides large product image and shows info-first presentation with NO price when hideImage={true}', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={sampleProduct} hideImage />
      </MemoryRouter>
    )

    // No media element or large product image on card
    const media = container.querySelector('.product-card-media')
    expect(media).toBeNull()

    const img = screen.queryByRole('img', { name: /sports polo/i })
    expect(img).toBeNull()

    // Shows card with no-image class
    expect(container.querySelector('.product-card--no-image')).not.toBeNull()

    // Shows product info
    expect(screen.getByText('Sports Polo')).toBeTruthy()
    expect(screen.getByText(/4.3/)).toBeTruthy()
    expect(screen.getByText('(40)')).toBeTruthy()
    expect(screen.getAllByText(/Roll On Attars/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/216 Pieces/i)).toBeTruthy()
    expect(screen.getByText('🟢 In Stock')).toBeTruthy()

    // MUST NOT RENDER ANY PRICE ON THE MAIN CARD
    expect(screen.queryByText(/₹/)).toBeNull()

    // Shows Add to Cart button
    const addToCartBtn = screen.getByRole('button', { name: /add sports polo to cart/i })
    expect(addToCartBtn).toBeTruthy()
    expect(addToCartBtn.disabled).toBe(false)

    // Shows Quick View button and Full Details link
    const qvBtn = screen.getByRole('button', { name: /quick view sports polo/i })
    expect(qvBtn).toBeTruthy()

    const detailsLink = screen.getByRole('link', { name: /view full details for sports polo/i })
    expect(detailsLink).toBeTruthy()
    expect(detailsLink.getAttribute('href')).toBe('/product/101')
  })

  it('renders OUT OF STOCK state correctly on no-image card when product is out of stock', () => {
    const outOfStockProduct = {
      ...sampleProduct,
      is_in_stock: false,
    }

    render(
      <MemoryRouter>
        <ProductCard product={outOfStockProduct} hideImage />
      </MemoryRouter>
    )

    expect(screen.getByText('🔴 Out of Stock')).toBeTruthy()

    const btn = screen.getByRole('button', { name: /sports polo is out of stock/i })
    expect(btn).toBeTruthy()
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toContain('OUT OF STOCK')
  })

  it('opens Quick View modal with product image and DEFAULT VARIANT PRICE when clicking Quick View', () => {
    render(
      <MemoryRouter>
        <ProductCard product={sampleProduct} hideImage />
      </MemoryRouter>
    )

    const qvBtn = screen.getByRole('button', { name: /quick view sports polo/i })
    fireEvent.click(qvBtn)

    // Quick View modal should open and display the product image
    const modal = document.querySelector('.quickview-dialog')
    expect(modal).not.toBeNull()

    // Modal has product image
    const modalImg = modal.querySelector('.quickview-media img')
    expect(modalImg).not.toBeNull()

    // Modal DOES display the default variant price!
    expect(screen.getByText('₹240')).toBeTruthy()
  })

  it('renders search card with image, badge, eye icon, category, rating, name, Add to Cart, and NO price (showPrice={false})', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCard product={sampleProduct} showPrice={false} />
      </MemoryRouter>
    )

    // 1. Product image
    expect(screen.getByRole('img', { name: /sports polo/i })).toBeTruthy()

    // 2. Featured badge
    expect(screen.getByText('Featured')).toBeTruthy()

    // 3. Quick View eye icon button
    const eyeBtn = container.querySelector('.product-card-quickview')
    expect(eyeBtn).not.toBeNull()

    // 4. Category
    expect(screen.getAllByText(/Roll On Attars/i).length).toBeGreaterThan(0)

    // 5. Rating
    expect(screen.getByText(/4.3/)).toBeTruthy()
    expect(screen.getByText('(40)')).toBeTruthy()

    // 6. Product name
    expect(screen.getByText('Sports Polo')).toBeTruthy()

    // 7. Unit / variant info
    expect(screen.getByText(/216 Pieces/i)).toBeTruthy()

    // 8. Add to Cart button
    const addBtn = screen.getByRole('button', { name: /add sports polo to cart/i })
    expect(addBtn).toBeTruthy()
    expect(addBtn.textContent).toContain('Add to Cart')

    // 9. NO PRICE ON SEARCH CARD
    expect(screen.queryByText(/₹/)).toBeNull()

    // 10. Clicking eye icon opens Quick View with default variant price
    fireEvent.click(eyeBtn)
    expect(document.querySelector('.quickview-dialog')).not.toBeNull()
    expect(screen.getByText('₹240')).toBeTruthy()
  })
})
