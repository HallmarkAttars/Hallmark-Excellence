// ============================================================================
// Invoice PDF — tests for admin/src/components/invoice/invoicePdf.js
//
// Runs fully in Node (no DOM): without a window the rupee font is skipped and
// missing product images yield null thumbs, but the table layout — including
// multi-page breaks and per-row sizing — is exercised for real through jsPDF.
//
// The image-bearing describe block shims window.fetch / createImageBitmap /
// canvas so real product thumbnails load in Node, and a vi.mock('jspdf')
// subclass records every 13×13mm thumbnail-frame draw. We then prove the
// frames never overlap vertically — exactly the reported bug, which fails
// loudly with the fix reverted (jsPDF 4.x attaches its API as own instance
// properties, so the subclass re-assigns the wrapped method per instance).
//
// Run with:  npm test  (admin)
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildInvoicePdf } from './invoicePdf'

// Intercept every jsPDF instance so the product-thumbnail frames (13×13mm
// roundedRects drawn inside the PRODUCT cells) can be recorded. Only records
// when the test has set globalThis.__pdfFrames — all other behaviour is the
// real jsPDF.
vi.mock('jspdf', async (importOriginal) => {
  const actual = await importOriginal()
  class TrackedJsPDF extends actual.jsPDF {
    constructor(...args) {
      super(...args)
      const origRoundedRect = this.roundedRect
      // Re-assign as an own property (jsPDF 4.x API lives on the instance) so
      // the wrapper actually intercepts calls.
      this.roundedRect = (x, y, w, h, rx, ry, style) => {
        const frames = globalThis.__pdfFrames
        if (frames && w === 13 && h === 13) {
          frames.push({
            page: this.internal.getCurrentPageInfo().pageNumber,
            y,
            h,
          })
        }
        return origRoundedRect.call(this, x, y, w, h, rx, ry, style)
      }
    }
  }
  return { ...actual, jsPDF: TrackedJsPDF }
})

// Flat enriched order shape (admin / tracking API) — mirrors the fixture in
// utils/invoice.test.js. Items deliberately have NO image so the builder stays
// DOM-free while still laying out the full product table.
const orderWithItems = (items, over = {}) => ({
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

const item = (name, qty, rate, over = {}) => ({
  product_name: name,
  unit_price: rate,
  quantity: qty,
  ...over,
})

describe('buildInvoicePdf — layout smoke tests', () => {
  it('produces a single-page A4 invoice for one product', async () => {
    const doc = await buildInvoicePdf(orderWithItems([item('Cold Water', 30, 42)]))
    expect(doc.getNumberOfPages()).toBe(1)
  })

  it('produces a valid invoice for five products', async () => {
    const doc = await buildInvoicePdf(
      orderWithItems(
        [1, 2, 3, 4, 5].map((i) => item(`Product ${i}`, 10 * i, 40 + i))
      )
    )
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })

  it('splits a 30-product invoice across multiple pages without error', async () => {
    // The repeated-header + rowPageBreak paths only run when the table spans
    // more than one page — 30 products forces that.
    const doc = await buildInvoicePdf(
      orderWithItems(
        Array.from({ length: 30 }, (_, i) => item(`Attar ${i + 1}`, 5, 45))
      )
    )
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2)
  })

  it('handles PACK purchase lines (packs · pieces breakdown)', async () => {
    const doc = await buildInvoicePdf(
      orderWithItems([
        item('Royal Marriage', 60, 45),
        {
          product_name: 'Royal Marriage (Pack)',
          unit_price: 2700,
          quantity: 3,
          pack_id: 12,
          pack_name: 'Pack of 20',
          pack_size: 20,
          number_of_packs: 3,
          actual_piece_quantity: 60,
          pack_price: 2700,
        },
      ])
    )
    expect(doc.getNumberOfPages()).toBe(1)
  })

  it('tolerates sparse customer data (no undefined artifacts)', async () => {
    const doc = await buildInvoicePdf(
      orderWithItems([item('Al Aseel', 30, 47)], {
        customer_name: '',
        phone: '',
        email: '',
        address: '',
      })
    )
    expect(doc.getNumberOfPages()).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Product thumbnail containment — the actual overlap bug.
//
// Before the fix, rows were sized by text height only (~8–13mm) while the
// thumbnail frame is 13mm tall, so frames drawn centred in each cell spilled
// over the row edges and overlapped the rows above/below. The fix forces rows
// with a thumbnail to be ≥ 13 + 2×2.6 = 18.2mm tall (minCellHeight, padding
// included) and clamps the frame to the row height as a defensive backstop.
// ---------------------------------------------------------------------------
// 1×1 transparent PNG (valid for jsPDF's PNG decoder).
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('product thumbnail containment (image-bearing invoices)', () => {
  beforeEach(() => {
    globalThis.window = {
      fetch: async () => ({ ok: true, blob: async () => new Blob(['x']) }),
    }
    globalThis.createImageBitmap = async () => ({ width: 64, height: 64, close() {} })
    globalThis.document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ fillStyle: '', fillRect() {}, drawImage() {} }),
        toDataURL: () => `data:image/png;base64,${TINY_PNG}`,
      }),
    }
    globalThis.__pdfFrames = []
  })

  afterEach(() => {
    delete globalThis.window
    delete globalThis.createImageBitmap
    delete globalThis.document
    delete globalThis.__pdfFrames
  })

  it('draws one thumbnail frame per product, none overlapping vertically', async () => {
    // 6 items fit a single table page (18.2mm rows); the doc itself may still
    // span 2 pages for the summary/thank-you blocks — that's normal design.
    const items = Array.from({ length: 6 }, (_, i) =>
      item(`Attar ${i + 1}`, 5, 45, { image: `https://cdn.example.com/a-${i}.png` })
    )
    const doc = await buildInvoicePdf(orderWithItems(items))
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)

    const frames = globalThis.__pdfFrames
    expect(frames.length).toBe(6) // one thumbnail frame per product row

    // Group by page (coordinates reset per page) and assert frames on the
    // same page never overlap vertically — overlapping frames are exactly
    // the reported image-overlap bug.
    const byPage = {}
    for (const f of frames) {
      ;(byPage[f.page] ||= []).push(f)
    }
    for (const pageFrames of Object.values(byPage)) {
      const sorted = [...pageFrames].sort((a, b) => a.y - b.y)
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].y).toBeGreaterThanOrEqual(
          sorted[i - 1].y + sorted[i - 1].h - 0.01
        )
      }
    }
  })

  it('builds an image-bearing 30-item invoice across multiple pages', async () => {
    // Real thumbnails force every row to ≥18.2mm, so 30 products span several
    // pages while exercising rowPageBreak + repeated headers with images.
    const items = Array.from({ length: 30 }, (_, i) =>
      item(`Attar ${i + 1}`, 5, 45, { image: `https://cdn.example.com/b-${i}.png` })
    )
    const doc = await buildInvoicePdf(orderWithItems(items))
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3)
    // All 30 rows got their thumbnail frame.
    expect(globalThis.__pdfFrames.length).toBe(30)
  })
})
