// ============================================================================
// Invoice formatter — unit tests for admin/src/utils/invoice.js
//
// Mirror of storefront/src/utils/invoice.test.js — the admin app keeps a
// synced copy of the formatter, so it gets the same coverage. Covers the
// presentation-only fields added for the premium invoice (image / brand ·
// size detail) plus regression guards that money math and order metadata
// are untouched.
//
// Run with:  npm test  (admin)
// ============================================================================

import { describe, expect, it } from 'vitest'
import { formatOrderForInvoice } from './invoice'

// Flat enriched order shape (admin / tracking API).
const baseOrder = (items, over = {}) => ({
  order_number: 'ORD-123456',
  created_at: '2026-08-09T12:03:00+05:30',
  status: 'Pending',
  payment_method: 'Cash On Delivery',
  total_amount: 18045,
  customer_name: 'dolphin web',
  phone: '+919525525523',
  email: 'hamadhismail04@gmail.com',
  address: 'Chennai - 600001',
  items,
  ...over,
})

describe('item.image (thumbnail from the saved snapshot)', () => {
  it('carries the product image through', () => {
    const inv = formatOrderForInvoice(
      baseOrder([
        { product_name: 'Black Oud', image: 'https://img.cloudinary.com/black-oud.jpg', unit_price: 200, quantity: 90 },
      ])
    )
    expect(inv.items[0].image).toBe('https://img.cloudinary.com/black-oud.jpg')
  })

  it('uses an empty string when the snapshot has no image (no broken thumbnail)', () => {
    const inv = formatOrderForInvoice(
      baseOrder([{ product_name: 'Black Oud', unit_price: 200, quantity: 90 }])
    )
    expect(inv.items[0].image).toBe('')
  })
})

describe('detail line — BRAND · SIZE (real values only)', () => {
  it('joins brand and size with a middle dot', () => {
    const inv = formatOrderForInvoice(
      baseOrder([
        { product_name: 'Own Man Show', brand_name: 'AREES', variant_label: '100 ML', unit_price: 45, quantity: 1 },
      ])
    )
    const it = inv.items[0]
    expect(it.brand).toBe('AREES')
    expect(it.size).toBe('100 ML')
    expect(it.detail).toBe('AREES · 100 ML')
  })

  it('falls back to quantity_value + quantity_unit for the size', () => {
    const inv = formatOrderForInvoice(
      baseOrder([
        { product_name: 'Own Man Show', brand_name: 'DAHAB', quantity_value: 50, quantity_unit: 'ML', unit_price: 45, quantity: 1 },
      ])
    )
    expect(inv.items[0].detail).toBe('DAHAB · 50 ML')
  })

  it('shows only the size when no brand exists', () => {
    const inv = formatOrderForInvoice(
      baseOrder([{ product_name: 'Musk', variant_label: '30 ML', unit_price: 45, quantity: 1 }])
    )
    expect(inv.items[0].detail).toBe('30 ML')
  })

  it('shows only the brand when no size exists', () => {
    const inv = formatOrderForInvoice(
      baseOrder([{ product_name: 'Oud', brand_name: 'AREES', unit_price: 45, quantity: 1 }])
    )
    expect(inv.items[0].detail).toBe('AREES')
  })

  it('renders an empty detail when neither exists', () => {
    const inv = formatOrderForInvoice(
      baseOrder([{ product_name: 'Plain', unit_price: 45, quantity: 1 }])
    )
    expect(inv.items[0].detail).toBe('')
  })
})

describe('money math is untouched (regression guard)', () => {
  it('line amounts stay rate × quantity and subtotal sums them', () => {
    const inv = formatOrderForInvoice(
      baseOrder([
        { product_name: 'Black Oud', unit_price: 200, quantity: 90 },
        { product_name: 'Own Man Show', unit_price: 45, quantity: 1 },
      ])
    )
    expect(inv.items[0].rate).toBe(200)
    expect(inv.items[0].qty).toBe(90)
    expect(inv.items[0].amount).toBe(18000)
    expect(inv.items[1].amount).toBe(45)
    expect(inv.subtotal).toBe(18045)
    // The SAVED order total remains the authoritative figure on the invoice.
    expect(inv.total).toBe(18045)
  })

  it('delivery stays null ("To be confirmed") when no stored charge exists', () => {
    const inv = formatOrderForInvoice(
      baseOrder([{ product_name: 'A', unit_price: 100, quantity: 1 }])
    )
    expect(inv.delivery).toBeNull()
  })
})

describe('order metadata + notes-shaped orders', () => {
  it('reads order id / date / time from the stored timestamp', () => {
    const inv = formatOrderForInvoice(
      baseOrder([{ product_name: 'A', unit_price: 100, quantity: 1 }])
    )
    expect(inv.orderId).toBe('ORD-123456')
    expect(inv.date).toBe('09 Aug 2026')
    expect(inv.time).toBe('12:03 PM')
    expect(inv.status).toBe('Pending')
    expect(inv.paymentMethod).toBe('Cash On Delivery')
  })

  it('flows the same item fields through a raw row whose data lives in the notes JSON string', () => {
    const raw = {
      order_number: 'ORD-777',
      created_at: '2026-08-09T12:03:00+05:30',
      order_status: 'Processing',
      total_amount: 220,
      notes: JSON.stringify({
        customer_name: 'dolphin web',
        phone: '+919525525523',
        items: [
          {
            product_name: 'Own Man Show',
            image: 'https://img/x.jpg',
            brand_name: 'AREES',
            variant_label: '100 ML',
            unit_price: 110,
            quantity: 2,
          },
        ],
      }),
    }
    const inv = formatOrderForInvoice(raw)
    expect(inv.orderId).toBe('ORD-777')
    expect(inv.status).toBe('Processing')
    expect(inv.customer.name).toBe('dolphin web')
    expect(inv.items[0].image).toBe('https://img/x.jpg')
    expect(inv.items[0].detail).toBe('AREES · 100 ML')
    expect(inv.items[0].amount).toBe(220)
  })
})
