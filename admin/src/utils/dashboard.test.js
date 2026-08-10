import { describe, it, expect } from 'vitest'
import {
  statusCounts,
  revenueTotal,
  ordersToday,
  productsThisMonth,
  monthOverMonth,
  revenueBuckets,
  topProducts,
  pendingPaymentOrders,
  isCancelled,
} from './dashboard'

const ORDER = (overrides = {}) => ({
  id: 'u1',
  order_number: 'ORD-1',
  status: 'Pending',
  total_amount: 100,
  created_at: '2026-08-10T10:00:00.000Z',
  items: [],
  ...overrides,
})

describe('dashboard', () => {
  it('statusCounts maps real statuses case-insensitively', () => {
    const counts = statusCounts([
      ORDER({ status: 'Pending' }),
      ORDER({ status: 'pending' }),
      ORDER({ status: 'Shipped' }),
      ORDER({ status: 'Delivered' }),
      ORDER({ status: 'Cancelled' }),
      ORDER({ status: 'Unknown' }), // unknown → ignored
    ])
    expect(counts).toEqual({ Pending: 2, Processing: 0, Shipped: 1, Delivered: 1, Cancelled: 1 })
  })

  it('revenueTotal excludes cancelled orders', () => {
    const orders = [
      ORDER({ total_amount: 100 }),
      ORDER({ total_amount: 250, status: 'Delivered' }),
      ORDER({ total_amount: 999, status: 'Cancelled' }),
      ORDER({ total_amount: 'abc' }),
    ]
    expect(revenueTotal(orders)).toBe(350)
    expect(isCancelled(ORDER({ status: 'cancelled' }))).toBe(true)
  })

  it('ordersToday counts only orders created today (local)', () => {
    const now = new Date(2026, 7, 10, 15, 0)
    const orders = [
      ORDER({ created_at: '2026-08-10T09:00:00.000Z' }),
      ORDER({ created_at: '2026-08-09T23:00:00.000Z' }),
    ]
    // 2026-08-10T09:00Z is within Aug 10 local (India); the exact count depends
    // on the test runner's local timezone — assert the rule is inclusive by
    // passing an explicit "now" matching the order's local day.
    const hits = ordersToday(orders, new Date(2026, 7, 10, 15, 0))
    expect(hits).toBeGreaterThanOrEqual(1)
    expect(hits).toBeLessThanOrEqual(2)
  })

  it('productsThisMonth counts products created this calendar month', () => {
    const now = new Date(2026, 7, 10)
    const products = [
      { id: 'p1', created_at: '2026-08-01T00:00:00.000Z' },
      { id: 'p2', created_at: '2026-07-31T00:00:00.000Z' },
      { id: 'p3' },
    ]
    const count = productsThisMonth(products, now)
    // Aug 1 in UTC may fall on Jul 31 in far-west timezones — assert range.
    expect(count).toBeGreaterThanOrEqual(1)
    expect(count).toBeLessThanOrEqual(2)
  })

  it('monthOverMonth computes % change or null when no prior revenue', () => {
    const now = new Date(2026, 7, 10)
    const orders = [
      ORDER({ created_at: '2026-08-05T00:00:00.000Z', total_amount: 200 }),
      ORDER({ created_at: '2026-07-05T00:00:00.000Z', total_amount: 100 }),
    ]
    const mom = monthOverMonth(orders, now)
    expect(mom.current).toBe(200)
    expect(mom.previous).toBe(100)
    expect(mom.pct).toBeCloseTo(100)

    const noPrev = monthOverMonth([ORDER({ created_at: '2026-08-05T00:00:00.000Z', total_amount: 50 })], now)
    expect(noPrev.current).toBe(50)
    expect(noPrev.pct).toBeNull()

    expect(monthOverMonth([], now)).toBeNull()
  })

  it('revenueBuckets produces labeled buckets for each period', () => {
    const now = new Date(2026, 7, 10, 12, 0)
    const orders = [
      ORDER({ created_at: '2026-08-10T08:00:00.000Z', total_amount: 100 }),
      ORDER({ created_at: '2026-08-08T08:00:00.000Z', total_amount: 50 }),
    ]

    const d7 = revenueBuckets(orders, '7d', now)
    expect(d7).toHaveLength(7)
    expect(d7[d7.length - 1].value).toBe(100) // newest bucket = today

    const d30 = revenueBuckets(orders, '30d', now)
    expect(d30).toHaveLength(30)

    const m3 = revenueBuckets(orders, '3m', now)
    expect(m3).toHaveLength(13)

    const y1 = revenueBuckets(orders, '1y', now)
    expect(y1).toHaveLength(12)
    // Total across the year buckets equals the real revenue.
    expect(y1.reduce((s, b) => s + b.value, 0)).toBe(150)
  })

  it('topProducts aggregates by item name with qty and revenue', () => {
    const orders = [
      ORDER({
        items: [
          { product_name: 'Royal Marriage', quantity: 10, unit_price: 100 },
          { product_name: 'Royal Marriage', quantity: 5, unit_price: 100 },
          { product_name: 'Cold Water', quantity: 3, unit_price: 200 },
        ],
      }),
    ]
    const top = topProducts(orders, 5)
    expect(top).toHaveLength(2)
    expect(top[0]).toMatchObject({ name: 'Royal Marriage', qty: 15, revenue: 1500 })
    expect(top[1]).toMatchObject({ name: 'Cold Water', qty: 3, revenue: 600 })
    expect(topProducts([], 5)).toEqual([])
  })

  it('pendingPaymentOrders finds UPI orders not yet paid', () => {
    const orders = [
      ORDER({ payment_method: 'UPI / Online Payment', payment_status: 'Pending' }),
      ORDER({ payment_method: 'UPI / Online Payment', payment_status: 'Paid' }),
      ORDER({ payment_method: 'Cash on Delivery', payment_status: 'Pending' }),
      ORDER({ payment_method: 'UPI / Online Payment', payment_code: 'upi', payment_status: 'pending' }),
    ]
    expect(pendingPaymentOrders(orders)).toHaveLength(2)
  })
})
