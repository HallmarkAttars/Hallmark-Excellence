import { describe, it, expect } from 'vitest'
import {
  formatDateKey,
  presetBounds,
  ordersInDateRange,
  buildAddressLines,
  packingLabelData,
  packingItemLabel,
  packingLabelFileName,
  packingLabelsFileName,
  paymentShortLabel,
} from './packing'
import { buildPackingLabelsPdf } from '../components/packing/packingLabelPdf'

describe('packing', () => {
  it('formatDateKey renders local YYYY-MM-DD', () => {
    expect(formatDateKey(new Date(2026, 7, 9))).toBe('2026-08-09')
    expect(formatDateKey(new Date(2026, 11, 1))).toBe('2026-12-01')
    expect(formatDateKey('not a date')).toBe('')
  })

  it('presetBounds covers the expected windows', () => {
    const now = new Date(2026, 7, 11, 14, 30) // 11 Aug 2026, 2:30pm local
    const today = presetBounds('today', now)
    expect(today.from.getTime()).toBe(new Date(2026, 7, 11, 0, 0, 0, 0).getTime())
    expect(today.to.getTime()).toBe(new Date(2026, 7, 11, 23, 59, 59, 999).getTime())

    const yesterday = presetBounds('yesterday', now)
    expect(yesterday.from.getTime()).toBe(new Date(2026, 7, 10, 0, 0, 0, 0).getTime())
    expect(yesterday.to.getTime()).toBe(new Date(2026, 7, 10, 23, 59, 59, 999).getTime())

    const week = presetBounds('7d', now)
    expect(week.from.getTime()).toBe(new Date(2026, 7, 5, 0, 0, 0, 0).getTime())
    expect(week.to.getTime()).toBe(new Date(2026, 7, 11, 23, 59, 59, 999).getTime())

    const month = presetBounds('30d', now)
    expect(month.from.getTime()).toBe(new Date(2026, 6, 13, 0, 0, 0, 0).getTime())
    expect(month.to.getTime()).toBe(new Date(2026, 7, 11, 23, 59, 59, 999).getTime())
  })

  it('ordersInDateRange filters by created_at inclusive of boundaries', () => {
    const orders = [
      { id: 'a', created_at: '2026-08-09T10:00:00.000Z' },
      { id: 'b', created_at: '2026-08-10T23:00:00.000Z' },
      { id: 'c', created_at: '2026-08-11T01:00:00.000Z' },
      { id: 'd' }, // no timestamp — never included
    ]
    const from = new Date('2026-08-10T00:00:00.000Z')
    const to = new Date('2026-08-10T23:59:59.999Z')
    const hit = ordersInDateRange(orders, { from, to })
    expect(hit.map((o) => o.id)).toEqual(['b'])
    expect(ordersInDateRange(orders, { from: null, to: null })).toHaveLength(3)
  })

  it('buildAddressLines composes available fields and never emits undefined', () => {
    expect(
      buildAddressLines({
        address: 'Hosel 1',
        locality: 'Adirampattinam',
        city: 'Thanjavur',
        state: 'Tamil Nadu',
        pincode: '614701',
      })
    ).toEqual(['Hosel 1', 'Adirampattinam, Thanjavur, Tamil Nadu - 614701'])

    expect(buildAddressLines({ pincode: '600002' })).toEqual(['600002'])
    expect(buildAddressLines({})).toEqual([])
    expect(buildAddressLines(null)).toEqual([])
  })

  it('paymentShortLabel maps cash/upi to COD/UPI', () => {
    expect(paymentShortLabel('Cash on Delivery')).toBe('COD')
    expect(paymentShortLabel('COD')).toBe('COD')
    expect(paymentShortLabel('UPI / Online Payment')).toBe('UPI')
    expect(paymentShortLabel('upi')).toBe('UPI')
    expect(paymentShortLabel('')).toBe('COD')
    expect(paymentShortLabel(undefined)).toBe('COD')
  })

  it('packingItemLabel reduces an item to name/quantity/size', () => {
    expect(
      packingItemLabel({
        product_name: 'CR7',
        name: 'ignored',
        quantity: 1,
        variant_label: '60 Pieces',
        unit_price: 42,
      })
    ).toEqual({ name: 'CR7', quantity: 1, size: '60 Pieces' })

    expect(
      packingItemLabel({ name: 'Pink Musk', qty: 2, quantity_value: 100, quantity_unit: 'Pieces' })
    ).toEqual({ name: 'Pink Musk', quantity: 2, size: '100 Pieces' })

    // No size known — carried as an empty string, never "undefined".
    expect(packingItemLabel({ name: 'X' })).toEqual({ name: 'X', quantity: 1, size: '' })
  })

  it('packingLabelData carries only packing-safe fields', () => {
    const data = packingLabelData({
      id: 'u1',
      order_number: 'ORD-519550',
      customer_name: 'Mohamed Suhail',
      phone: '+91 90805 01144',
      address: 'Hosel 1',
      city: 'Thanjavur',
      pincode: '614701',
      total_amount: 99999,
      payment_method: 'Cash on Delivery',
      items: [
        { product_name: 'CR7', quantity: 1, variant_label: '60 Pieces' },
        { product_name: 'Pink Musk', quantity: 2, variant_label: '100 Pieces', unit_price: 999 },
      ],
    })
    expect(data.orderId).toBe('ORD-519550')
    expect(data.customerName).toBe('Mohamed Suhail')
    expect(data.phone).toBe('+91 90805 01144')
    expect(data.addressLines.join(' ')).toContain('Thanjavur')
    expect(data.payment).toBe('COD')
    expect(data.items).toEqual([
      { name: 'CR7', quantity: 1, size: '60 Pieces' },
      { name: 'Pink Musk', quantity: 2, size: '100 Pieces' },
    ])
    // Prices, totals and raw payment strings never travel onto a label.
    expect(data).not.toHaveProperty('total_amount')
    expect(data).not.toHaveProperty('payment_method')
    expect(JSON.stringify(data)).not.toContain('999')
  })

  it('generates the required filenames', () => {
    expect(packingLabelFileName('ORD-519550')).toBe('packing-label-ORD-519550.pdf')
    expect(packingLabelFileName('').endsWith('.pdf')).toBe(true)
    expect(packingLabelsFileName(new Date(2026, 7, 9), new Date(2026, 7, 10))).toBe(
      'packing-labels-2026-08-09-to-2026-08-10.pdf'
    )
  })

  describe('buildPackingLabelsPdf', () => {
    const fullOrder = {
      id: 'u1',
      order_number: 'ORD-519550',
      customer_name: 'Mohamed Suhail',
      phone: '+91 90805 01144',
      address: 'Hosel 1',
      locality: 'Adirampattinam',
      city: 'Thanjavur',
      state: 'Tamil Nadu',
      pincode: '614701',
      created_at: '2026-08-10T11:23:00.000Z',
    }

    it('renders one label per order (one page each)', async () => {
      const one = await buildPackingLabelsPdf([fullOrder])
      expect(one.getNumberOfPages()).toBe(1)

      const two = await buildPackingLabelsPdf([fullOrder, { ...fullOrder, id: 'u2', order_number: 'ORD-697062' }])
      expect(two.getNumberOfPages()).toBe(2)
    })

    it('reports progress and tolerates partial/empty order data', async () => {
      const calls = []
      const doc = await buildPackingLabelsPdf([fullOrder, { id: 'u3', order_number: 'ORD-901253' }], {
        onProgress: (done, total) => calls.push([done, total]),
      })
      expect(doc.getNumberOfPages()).toBe(2)
      expect(calls).toEqual([[1, 2], [2, 2]])
      // Empty list → empty document, never a crash.
      const empty = await buildPackingLabelsPdf([])
      expect(empty.getNumberOfPages()).toBe(1)
    })
  })
})
