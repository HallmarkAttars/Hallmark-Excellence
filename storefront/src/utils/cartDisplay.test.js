// ============================================================================
// Cart line-item DISPLAY gating — unit tests for storefront/src/utils/cartDisplay.js
//
// These are the render gates used by Cart.jsx:
//   showStruckUnitPrice  — "bulkBadge && normalPrice > effectivePrice"
//   hasLineSavings       — "lineSavings > 0"
//   lineTotalDisplay     — the "lineSavings > 0 ? struck plain total :
//                           ₹X × qty breakdown" ternary
//
// They only decide what the row SHOWS — pricing is computed upstream by the
// cart context and utils/bulk.js (already covered in bulk.test.js).
//
// Run with:  npm test  (storefront)
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
  showStruckUnitPrice,
  hasLineSavings,
  lineTotalDisplay,
  formatINR,
} from './cartDisplay'

describe('showStruckUnitPrice (guard: bulkBadge && normalPrice > effectivePrice)', () => {
  it('shows the struck price when a BRAND bulk discount is active and genuine', () => {
    // 16 + 7 Arees pieces → brand bulk 42 beats the line's 45.
    expect(showStruckUnitPrice('Arees Bulk Applied', 45, 42)).toBe(true)
    expect(showStruckUnitPrice('Dahab Bulk Applied', 45, 42)).toBe(true)
  })

  it('shows the struck price when PER-PRODUCT bulk is active and genuine', () => {
    expect(showStruckUnitPrice('Bulk Price Applied', 45, 42)).toBe(true)
  })

  it('never shows a strike without a bulk badge, even if prices differ', () => {
    // No discount on this line → no badge, no strikethrough — prices must
    // never be compared in isolation.
    expect(showStruckUnitPrice(null, 45, 42)).toBe(false)
    expect(showStruckUnitPrice(undefined, 45, 42)).toBe(false)
    expect(showStruckUnitPrice('', 45, 42)).toBe(false)
    expect(showStruckUnitPrice(0, 45, 42)).toBe(false)
  })

  it('never strikes a price identical to itself (no genuine discount)', () => {
    // Bulk badge can be present while the charged price equals the line's own
    // price — the strict `>` guard keeps the strikethrough hidden.
    expect(showStruckUnitPrice('Arees Bulk Applied', 45, 45)).toBe(false)
    expect(showStruckUnitPrice('Bulk Price Applied', 45, 45)).toBe(false)
  })

  it('never strikes when the charged price is ABOVE the normal price', () => {
    // Weird/defensive data: bulk "discount" higher than normal → no strike.
    expect(showStruckUnitPrice('Bulk Price Applied', 42, 45)).toBe(false)
  })

  it('line CHEAPER than the brand bulk price: badge present, own price kept, no strike', () => {
    // Edge case: brand bulk is active (badge set) but the brand price is not
    // below THIS line's price — the line is charged at its own price, so
    // effective === normal and nothing is struck. This is exactly the guard
    // that keeps the display honest in Cart.jsx.
    expect(showStruckUnitPrice('Dahab Bulk Applied', 40, 40)).toBe(false)
  })

  it('coerces string prices from the database', () => {
    expect(showStruckUnitPrice('Bulk Price Applied', '45', '42')).toBe(true)
    expect(showStruckUnitPrice('Bulk Price Applied', '45', '45')).toBe(false)
  })
})

describe('hasLineSavings (guard: lineSavings > 0)', () => {
  it('is true only for a positive saving', () => {
    expect(hasLineSavings(12)).toBe(true)
    expect(hasLineSavings('12')).toBe(true)
  })

  it('is false for zero, negatives and missing values', () => {
    expect(hasLineSavings(0)).toBe(false)
    expect(hasLineSavings(-5)).toBe(false)
    expect(hasLineSavings(null)).toBe(false)
    expect(hasLineSavings(undefined)).toBe(false)
    expect(hasLineSavings('')).toBe(false)
    expect(hasLineSavings(NaN)).toBe(false)
  })
})

describe('lineTotalDisplay (ternary: discount → struck plain total, else ₹X × qty)', () => {
  it('discount active: renders the PLAIN normal total, marked struck', () => {
    // 45 × 4 = 180 — the "₹180" example from the spec.
    expect(lineTotalDisplay(45, 4, 12)).toEqual({ struck: true, text: '₹180' })
  })

  it('no discount: keeps the existing ₹X × qty breakdown, not struck', () => {
    expect(lineTotalDisplay(45, 4, 0)).toEqual({ struck: false, text: '₹45 × 4' })
    expect(lineTotalDisplay(45, 4, -1)).toEqual({ struck: false, text: '₹45 × 4' })
  })

  it('uses en-IN grouping for the struck total', () => {
    // 999 × 2 = 1,998 (thousand separator)
    expect(lineTotalDisplay(999, 2, 12)).toEqual({ struck: true, text: '₹1,998' })
    // 1,200 × 100 = 1,20,000 (lakh-style Indian grouping)
    expect(lineTotalDisplay(1200, 100, 12)).toEqual({ struck: true, text: '₹1,20,000' })
  })

  it('no-discount breakdown keeps the price formatted but the qty raw', () => {
    expect(lineTotalDisplay(2499, 10, 0)).toEqual({ struck: false, text: '₹2,499 × 10' })
  })

  it('coerces string inputs', () => {
    expect(lineTotalDisplay('45', '4', '12')).toEqual({ struck: true, text: '₹180' })
    expect(lineTotalDisplay('45', '4', '0')).toEqual({ struck: false, text: '₹45 × 4' })
  })

  it('edge case: brand active but line cheaper than brand price → plain breakdown, no strike', () => {
    // Brand threshold reached (badge present) but this line is charged at its
    // own ₹40 — lineSavings is 0, so the display falls back to the breakdown
    // and the strike guard stays off. The two helpers agree with each other.
    const normal = 40
    const effective = 40 // own price kept, brand price not a discount
    const lineSavings = 0
    expect(showStruckUnitPrice('Dahab Bulk Applied', normal, effective)).toBe(false)
    expect(lineTotalDisplay(normal, 5, lineSavings)).toEqual({ struck: false, text: '₹40 × 5' })
  })
})

describe('formatINR', () => {
  it('formats with Indian grouping', () => {
    expect(formatINR(0)).toBe('0')
    expect(formatINR(720)).toBe('720')
    expect(formatINR(1998)).toBe('1,998')
    expect(formatINR(120000)).toBe('1,20,000')
  })
})
