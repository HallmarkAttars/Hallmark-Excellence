import { describe, it, expect } from 'vitest'
import { normalizeOrderId, normalizePhone, matchesOrderSearch } from './format'

// Sample orders shaped like the admin API enrichment (E.164 phones).
const orders = [
  { order_number: 'ORD-519550', phone: '+919087650120', customer_name: 'dolphin web' },
  { order_number: 'ORD-697062', phone: '+919876543210', customer_name: 'mohamed' },
  { order_number: 'ORD-884411', phone: '9080501144', customer_name: 'legacy row' },
]

describe('normalizeOrderId', () => {
  it('uppercases and trims', () => {
    expect(normalizeOrderId('  ord-519550 ')).toBe('ORD-519550')
  })
  it('strips a leading # (success-screen marker)', () => {
    expect(normalizeOrderId('#ORD-519550')).toBe('ORD-519550')
  })
})

describe('normalizePhone', () => {
  it('keeps only the last 10 digits of an E.164 number', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210')
    expect(normalizePhone('+919876543210')).toBe('9876543210')
  })
  it('handles local / spaced / dashed formats', () => {
    expect(normalizePhone('91 9876543210')).toBe('9876543210')
    expect(normalizePhone('987-654-3210')).toBe('9876543210')
  })
  it('is tolerant of empty / non-numeric input', () => {
    expect(normalizePhone('')).toBe('')
    expect(normalizePhone('abc')).toBe('')
  })
})

describe('matchesOrderSearch', () => {
  it('matches an Order ID case-insensitively', () => {
    expect(matchesOrderSearch(orders[0], 'ORD-519550')).toBe(true)
    expect(matchesOrderSearch(orders[0], 'ord-519550')).toBe(true)
  })
  it('does NOT match a different Order ID', () => {
    expect(matchesOrderSearch(orders[1], 'ORD-519550')).toBe(false)
  })
  it('matches a mobile number in every common format', () => {
    expect(matchesOrderSearch(orders[1], '+91 98765 43210')).toBe(true)
    expect(matchesOrderSearch(orders[1], '9876543210')).toBe(true)
    expect(matchesOrderSearch(orders[1], '91 9876543210')).toBe(true)
    expect(matchesOrderSearch(orders[1], '+919876543210')).toBe(true)
  })
  it('matches a legacy national-format phone (no country code)', () => {
    expect(matchesOrderSearch(orders[2], '9080501144')).toBe(true)
    expect(matchesOrderSearch(orders[2], '+91 90805 01144')).toBe(true)
  })
  it('does NOT match an unrelated phone', () => {
    expect(matchesOrderSearch(orders[1], '+91 90000 00000')).toBe(false)
  })
  it('returns no match for an unknown value', () => {
    expect(matchesOrderSearch(orders[0], 'INVALID-ORDER')).toBe(false)
  })
  it('matches everything for an empty / whitespace query', () => {
    expect(matchesOrderSearch(orders[0], '')).toBe(true)
    expect(matchesOrderSearch(orders[0], '   ')).toBe(true)
  })
  it('matches a partial Order ID (as-you-type)', () => {
    expect(matchesOrderSearch(orders[0], '5195')).toBe(true)
  })
  it('is safe when order has no phone', () => {
    expect(matchesOrderSearch({ order_number: 'ORD-1' }, '9876543210')).toBe(false)
    expect(matchesOrderSearch({ order_number: 'ORD-1' }, 'ORD-1')).toBe(true)
  })
})
