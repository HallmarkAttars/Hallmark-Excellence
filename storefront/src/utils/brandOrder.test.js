// Brand display ordering — unit tests for storefront/src/utils/brandOrder.js
// (the rule that keeps the header dropdown, footer and homepage in the same
// admin-configured order). No I/O.
//
// Run with:  npm test  (storefront)

import { describe, expect, it } from 'vitest'
import { sortBrandsByDisplayOrder } from './brandOrder'

const brand = (id, slug, extra = {}) => ({ id, slug, name: slug, ...extra })

describe('sortBrandsByDisplayOrder', () => {
  it('sorts by display_order ascending (admin position, lowest first)', () => {
    const list = [
      brand('a', 'arees', { display_order: 3 }),
      brand('b', 'dahab', { display_order: 1 }),
      brand('c', 'misk-al-arab', { display_order: 2 }),
    ]
    expect(sortBrandsByDisplayOrder(list).map((b) => b.slug)).toEqual(['dahab', 'misk-al-arab', 'arees'])
  })

  it('drops inactive brands', () => {
    const list = [
      brand('a', 'arees', { display_order: 1 }),
      brand('b', 'dahab', { display_order: 2, is_active: false }),
    ]
    expect(sortBrandsByDisplayOrder(list).map((b) => b.slug)).toEqual(['arees'])
  })

  it('sorts brands without a position last, in fallback slug order', () => {
    const list = [
      brand('x', 'amber-oud'),
      brand('a', 'arees', { display_order: 1 }),
      brand('y', 'oud-al-haramain'),
    ]
    expect(sortBrandsByDisplayOrder(list).map((b) => b.slug)).toEqual(['arees', 'oud-al-haramain', 'amber-oud'])
  })

  it('resolves equal positions by the fallback slug order', () => {
    const list = [
      brand('b', 'dahab', { display_order: 0 }),
      brand('a', 'arees', { display_order: 0 }),
    ]
    // Equal positions → fallback order keeps Arees before Dahab.
    expect(sortBrandsByDisplayOrder(list).map((b) => b.slug)).toEqual(['arees', 'dahab'])
  })

  it('keeps a custom fallback order when provided (ties only)', () => {
    const list = [
      brand('z', 'zzz'),
      brand('a', 'aaa', { display_order: 5 }),
      brand('m', 'mmm'),
    ]
    expect(sortBrandsByDisplayOrder(list, ['zzz', 'mmm']).map((b) => b.slug)).toEqual(['aaa', 'zzz', 'mmm'])
  })

  it('handles empty / non-array input', () => {
    expect(sortBrandsByDisplayOrder([])).toEqual([])
    expect(sortBrandsByDisplayOrder(null)).toEqual([])
  })
})
