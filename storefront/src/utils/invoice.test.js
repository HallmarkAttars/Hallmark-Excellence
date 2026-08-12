// ============================================================================
// Invoice formatter — unit tests for storefront/src/utils/invoice.js
//
// Covers the presentation-only fields added for the premium invoice:
//   - item.image        (thumbnail from the saved snapshot)
//   - item.brand/size   (BRAND · SIZE detail line)
// plus regression guards that money math and order metadata are untouched.
//
// Run with:  npm test  (storefront)
// ============================================================================

import { describe, expect, it } from 'vitest'
import { formatOrderForInvoice, paymentMethodLabel } from './invoice'

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

describe('per-piece RATE/QTY display (reference design)', () => {
  it('piece-count line shows QTY = pieces and RATE = bulk per-unit price', () => {
    // 126 Pieces @ ₹42 — the whole line IS one piece selection.
    const inv = formatOrderForInvoice(
      baseOrder([{
        product_name: 'Own Man Show',
        brand_name: 'AREES',
        quantity_unit: 'Pieces',
        quantity_value: 126,
        unit_pieces: 126,
        pieces: 126,
        unit_price: 5292,
        quantity: 1,
        bulk_per_unit: 42,
        normal_per_piece: 50,
      }])
    )
    const it = inv.items[0]
    expect(it.qty).toBe(126)
    expect(it.rate).toBe(42)
    expect(it.ratePerPiece).toBe(true)
    // AMOUNT is the SAVED line total (42 × 126), never re-derived from RATE.
    expect(it.amount).toBe(5292)
  })

  it('variant bought N× keeps the customer quantity with per-unit RATE', () => {
    // 2 × "100 Pieces" variant — QTY stays 2, RATE = the per-unit price.
    const inv = formatOrderForInvoice(
      baseOrder([{
        product_name: 'Musk',
        variant_label: '100 Pieces',
        quantity_unit: 'Pieces',
        quantity_value: 100,
        unit_pieces: 100,
        pieces: 200,
        unit_price: 1000,
        quantity: 2,
        variant_price_per_unit: 10,
      }])
    )
    const it = inv.items[0]
    expect(it.qty).toBe(2)
    expect(it.rate).toBe(10)
    expect(it.ratePerPiece).toBe(true)
    expect(it.amount).toBe(2000)
  })

  it('pack purchases keep their pack price/QTY and no /pcs. suffix', () => {
    const inv = formatOrderForInvoice(
      baseOrder([{
        product_name: 'Oud',
        pack_id: 'p1',
        pack_name: 'Pack of 10',
        pack_size: 10,
        number_of_packs: 3,
        actual_piece_quantity: 30,
        pack_price: 500,
        unit_price: 500,
        quantity: 3,
      }])
    )
    const it = inv.items[0]
    expect(it.qty).toBe(3)
    expect(it.rate).toBe(500)
    expect(it.ratePerPiece).toBe(false)
    expect(it.amount).toBe(1500)
  })

  it('non-piece lines keep plain rate without /pcs.', () => {
    const inv = formatOrderForInvoice(
      baseOrder([{ product_name: 'Black Oud', unit_price: 200, quantity: 90 }])
    )
    const it = inv.items[0]
    expect(it.qty).toBe(90)
    expect(it.rate).toBe(200)
    expect(it.ratePerPiece).toBe(false)
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

describe('company block — brand title vs legal name', () => {
  it('exposes the premium header brandTitle separately from the legal name', () => {
    const inv = formatOrderForInvoice(
      baseOrder([{ product_name: 'A', unit_price: 100, quantity: 1 }])
    )
    // Header brand + thank-you sign-off use the luxury title…
    expect(inv.company.brandTitle).toBe('Arees Perfumes')
    // …while the footer copyright keeps the legal company name.
    expect(inv.company.name).toBe('Hallmark of Excellence')
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
    // The business now takes only advance payments — the legacy stored
    // 'Cash On Delivery' value DISPLAYS as 'Advance Payment'.
    expect(inv.paymentMethod).toBe('Advance Payment')
  })

  it('maps the stored payment method to the customer-facing label', () => {
    // Legacy COD value → Advance Payment (stored data never rewritten).
    expect(paymentMethodLabel('Cash On Delivery')).toBe('Advance Payment')
    expect(paymentMethodLabel('cod')).toBe('Advance Payment')
    expect(paymentMethodLabel(undefined)).toBe('Advance Payment')
    // UPI keeps its own label.
    expect(paymentMethodLabel('UPI / Online Payment')).toBe('UPI / Online Payment')
    expect(paymentMethodLabel('upi')).toBe('UPI / Online Payment')
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
