import { describe, it, expect } from 'vitest'
import { getDefaultVariant, getDisplayPrice, getVariantPrice } from './productPricing'

describe('productPricing utility', () => {
  it('TEST 1: Product with variants and default variant finds default active variant', () => {
    const product = {
      id: 1,
      name: 'Sports Polo',
      price: 0,
      variants: [
        { id: 10, display_label: '6 Pieces', price: 240, is_default: true, active: true },
        { id: 11, display_label: '12 Pieces', price: 480, is_default: false, active: true },
        { id: 12, display_label: '24 Pieces', price: 960, is_default: false, active: true },
      ],
    }

    const defaultVariant = getDefaultVariant(product)
    expect(defaultVariant).not.toBeNull()
    expect(defaultVariant.id).toBe(10)
    expect(defaultVariant.price).toBe(240)
    expect(getDisplayPrice(product)).toBe(240)
  })

  it('TEST 2: Product with multiple variants where variant price can be obtained for any selected variant', () => {
    const product = {
      id: 2,
      name: 'Royal Musk',
      price: 0,
      variants: [
        { id: 20, display_label: '6 Pieces', price: 240, is_default: true, active: true },
        { id: 21, display_label: '12 Pieces', price: 450, is_default: false, active: true },
        { id: 22, display_label: '24 Pieces', price: 800, is_default: false, active: true },
        { id: 23, display_label: '48 Pieces', price: 1500, is_default: false, active: true },
      ],
    }

    expect(getDisplayPrice(product)).toBe(240)
    expect(getVariantPrice(product.variants[2])).toBe(800)
    expect(getVariantPrice(product.variants[3])).toBe(1500)
  })

  it('TEST 3: Product with no default variant marked uses first active variant as fallback', () => {
    const product = {
      id: 3,
      name: 'Oud Al Layl',
      price: 0,
      variants: [
        { id: 31, display_label: '12 Pieces', price: 480, is_default: false, active: true },
        { id: 32, display_label: '24 Pieces', price: 960, is_default: false, active: true },
      ],
    }

    const defaultVariant = getDefaultVariant(product)
    expect(defaultVariant).not.toBeNull()
    expect(defaultVariant.id).toBe(31)
    expect(defaultVariant.price).toBe(480)
    expect(getDisplayPrice(product)).toBe(480)
  })

  it('TEST 4: Product with no variants falls back to product.price', () => {
    const product = {
      id: 4,
      name: 'Simple Attar',
      price: 500,
      variants: [],
    }

    expect(getDefaultVariant(product)).toBeNull()
    expect(getDisplayPrice(product)).toBe(500)
  })

  it('TEST 5: product.price = 0 with valid variants returns valid default variant price', () => {
    const product = {
      id: 5,
      name: 'Sports Polo',
      price: 0,
      variants: [
        { id: 51, display_label: '6 Pieces', price: 240, is_default: true, active: true },
        { id: 52, display_label: '12 Pieces', price: 480, is_default: false, active: true },
      ],
    }

    expect(getDisplayPrice(product)).toBe(240)
  })

  it('filters out inactive variants and variants with price <= 0', () => {
    const product = {
      id: 6,
      name: 'Special Blend',
      price: 300,
      variants: [
        { id: 61, display_label: 'Test 0', price: 0, is_default: true, active: true },
        { id: 62, display_label: 'Inactive', price: 600, is_default: false, active: false },
        { id: 63, display_label: 'Valid 12 Pcs', price: 550, is_default: false, active: true },
      ],
    }

    const defaultVariant = getDefaultVariant(product)
    expect(defaultVariant).not.toBeNull()
    expect(defaultVariant.id).toBe(63)
    expect(getDisplayPrice(product)).toBe(550)
  })

  it('handles null, undefined, or empty product gracefully', () => {
    expect(getDefaultVariant(null)).toBeNull()
    expect(getDefaultVariant(undefined)).toBeNull()
    expect(getDefaultVariant({})).toBeNull()
    expect(getDisplayPrice(null)).toBe(0)
    expect(getDisplayPrice(undefined)).toBe(0)
    expect(getDisplayPrice({})).toBe(0)
    expect(getVariantPrice(null)).toBe(0)
  })
})
