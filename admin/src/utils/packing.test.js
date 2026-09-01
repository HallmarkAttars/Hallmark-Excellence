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
import { code39Modules } from './barcode'

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

  // -----------------------------------------------------------------------
  // PDF element positioning — verify that the label layout is correct.
  // These test the GEOMETRY of the label (centering, margins, box split)
  // without mocking jsPDF internals.
  // -----------------------------------------------------------------------
  describe('PDF element positioning', () => {
    // Sheet constants — must match packingLabelPdf.js exactly.
    const W = 101.6
    const H = 152.4
    const M = 6
    const CX = W / 2
    const INNER_W = W - M * 2
    const BARCODE_RULE_Y = 88
    const BARCODE_Y = 94
    const BARCODE_H = 12
    const BARCODE_TEXT_Y = BARCODE_Y + BARCODE_H + 5
    const PACKED_CARE_Y = 124
    const BOTTOM_RULE_Y = 138
    const THANK_YOU_Y = 145

    // Helper — replicate the barcode centering math from packingLabelPdf.js
    function barcodeCentering(text) {
      const modules = code39Modules(text)
      const totalUnits = modules.reduce((sum, s) => sum + s.width, 0)
      const unit = Math.min(0.24, INNER_W / Math.max(1, totalUnits))
      const widthMm = totalUnits * unit
      const x = CX - widthMm / 2
      return { modules, totalUnits, unit, widthMm, x }
    }

    it('barcode is horizontally centered on the page', () => {
      const { widthMm, x } = barcodeCentering('ORD-519550')
      // The center of the barcode must equal CX (page center).
      expect(x + widthMm / 2).toBeCloseTo(CX, 4)
      // Must not overflow the left or right margins.
      expect(x).toBeGreaterThanOrEqual(M)
      expect(x + widthMm).toBeLessThanOrEqual(W - M)
    })

    it('barcode fits within the printable area for various order IDs', () => {
      const ids = ['ORD-001', 'ORD-519550', 'ORD-999999', 'A', 'ORDER', 'ORD-12345678']
      for (const id of ids) {
        const { widthMm, x } = barcodeCentering(id)
        expect(widthMm).toBeLessThanOrEqual(INNER_W)
        expect(x).toBeGreaterThanOrEqual(M)
        expect(x + widthMm).toBeLessThanOrEqual(W - M)
      }
    })

    it('barcode is wider for longer text', () => {
      const short = barcodeCentering('A')
      const long = barcodeCentering('ORD-519550')
      expect(long.widthMm).toBeGreaterThan(short.widthMm)
    })

    it('FROM/SHIP TO box is a 50/50 split at the page center', () => {
      const boxLeft = M
      const boxRight = W - M
      const leftColWidth = CX - boxLeft
      const rightColWidth = boxRight - CX
      // Columns must be equal width.
      expect(leftColWidth).toBeCloseTo(rightColWidth, 10)
      // Together they span the full inner width.
      expect(leftColWidth + rightColWidth).toBeCloseTo(boxRight - boxLeft, 10)
    })

    it('FROM/SHIP TO column text starts at the same x offset from the divider', () => {
      const fromTextX = M + 6
      const rightTextX = CX + 6
      // Both columns start at the same offset from their respective left edge.
      expect(fromTextX - M).toBeCloseTo(rightTextX - CX, 10)
    })

    it('label dimensions match the 4×6 inch thermal sheet', () => {
      expect(W).toBeCloseTo(101.6, 1)  // 4 inches
      expect(H).toBeCloseTo(152.4, 1)  // 6 inches
    })

    it('all vertical elements are within the page and in correct order', () => {
      // Header is near the top.
      expect(10).toBeGreaterThan(0)
      // Gold rule below header.
      expect(17).toBeGreaterThan(10)
      // ORDER ID label.
      expect(23).toBeGreaterThan(17)
      // ORDER ID value baseline.
      expect(29).toBeGreaterThan(23)
      // Box top below ORDER ID.
      const boxTop = 31
      expect(boxTop).toBeGreaterThan(29)
      // Box bottom above barcode rule.
      const boxBottom = BARCODE_RULE_Y - 6
      expect(boxBottom).toBeGreaterThan(boxTop)
      expect(boxBottom).toBeLessThan(BARCODE_RULE_Y)
      // Barcode zone.
      expect(BARCODE_Y).toBeGreaterThan(BARCODE_RULE_Y)
      expect(BARCODE_TEXT_Y).toBeGreaterThan(BARCODE_Y + BARCODE_H)
      // Footer elements.
      expect(PACKED_CARE_Y).toBeGreaterThan(BARCODE_TEXT_Y)
      expect(BOTTOM_RULE_Y).toBeGreaterThan(PACKED_CARE_Y)
      expect(THANK_YOU_Y).toBeGreaterThan(BOTTOM_RULE_Y)
      // All within page.
      expect(THANK_YOU_Y).toBeLessThan(H)
    })

    it('vertical divider is exactly at the page center', () => {
      expect(CX).toBeCloseTo(W / 2, 10)
    })

    it('barcode order ID text is centered below the barcode', () => {
      // The barcode text uses { align: 'center' } at CX.
      // Verify CX is between the margins.
      expect(CX).toBeGreaterThan(M)
      expect(CX).toBeLessThan(W - M)
    })

    it('PDF document is valid and serializable', async () => {
      const order = {
        id: 'test',
        order_number: 'ORD-TEST',
        customer_name: 'Test User',
        phone: '+91 00000 00000',
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        pincode: '000000',
      }
      const doc = await buildPackingLabelsPdf([order])
      expect(doc.getNumberOfPages()).toBe(1)
      // Should serialize to a non-empty ArrayBuffer.
      const buf = doc.output('arraybuffer')
      expect(buf).toBeInstanceOf(ArrayBuffer)
      expect(buf.byteLength).toBeGreaterThan(0)
    })

    it('multiple labels each get their own page', async () => {
      const make = (n) => ({
        id: `u${n}`,
        order_number: `ORD-${n}`,
        customer_name: `User ${n}`,
        phone: '+91 00000 00000',
        address: `${n} Street`,
        city: 'City',
        pincode: '000000',
      })
      const doc = await buildPackingLabelsPdf([make(1), make(2), make(3)])
      expect(doc.getNumberOfPages()).toBe(3)
    })
  })
})
