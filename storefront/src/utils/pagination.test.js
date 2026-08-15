// Pagination math — unit tests for storefront/src/utils/pagination.js
//
// Covers the full acceptance matrix from the pagination spec:
//   0/1/49/50 → 1 page (no pagination), 51/69/100 → 2 pages,
//   101/150 → 3 pages, 151 → 4 pages, max 50 cards per page,
//   invalid page numbers, page truncation, URL parameter preservation,
//   and the count label.
//
// Run with:  npm test  (storefront)

import { describe, it, expect } from 'vitest'
import {
  PRODUCTS_PER_PAGE,
  totalPages,
  clampPage,
  pageFromSearch,
  setPageParam,
  pageItems,
  productCountLabel,
  paginate,
} from './pagination'

// n dummy products with stable ids (1-based).
const products = (n) => Array.from({ length: n }, (_, i) => ({ id: `p-${i + 1}` }))

describe('PRODUCTS_PER_PAGE — 50 products per page', () => {
  it('is exactly 50', () => {
    expect(PRODUCTS_PER_PAGE).toBe(50)
  })
})

describe('totalPages — page-count matrix', () => {
  it('0 products → 0 pages (pagination hidden entirely)', () => {
    expect(totalPages(0)).toBe(0)
  })

  it('1 product → 1 page', () => {
    expect(totalPages(1)).toBe(1)
  })

  it('49 products → 1 page', () => {
    expect(totalPages(49)).toBe(1)
  })

  it('50 products → 1 page', () => {
    expect(totalPages(50)).toBe(1)
  })

  it('51 products → 2 pages', () => {
    expect(totalPages(51)).toBe(2)
  })

  it('69 products → 2 pages', () => {
    expect(totalPages(69)).toBe(2)
  })

  it('100 products → 2 pages', () => {
    expect(totalPages(100)).toBe(2)
  })

  it('101 products → 3 pages', () => {
    expect(totalPages(101)).toBe(3)
  })

  it('150 products → 3 pages', () => {
    expect(totalPages(150)).toBe(3)
  })

  it('151 products → 4 pages', () => {
    expect(totalPages(151)).toBe(4)
  })
})

describe('paginate — slices the current page, max 50 items', () => {
  it('69 products: page 1 → 50 items, page 2 → 19 items, 2 pages', () => {
    const list = products(69)
    const page1 = paginate(list, 1)
    const page2 = paginate(list, 2)
    expect(page1.items).toHaveLength(50)
    expect(page2.items).toHaveLength(19)
    expect(page1.items[0].id).toBe('p-1')
    expect(page2.items[0].id).toBe('p-51')
    expect(page1.totalPages).toBe(2)
    expect(page2.totalPages).toBe(2)
    expect(page1.total).toBe(69)
  })

  it('120 products: 50 / 50 / 20 across 3 pages', () => {
    const list = products(120)
    const pages = [paginate(list, 1), paginate(list, 2), paginate(list, 3)]
    expect(pages.map((p) => p.items.length)).toEqual([50, 50, 20])
    expect(pages.map((p) => p.currentPage)).toEqual([1, 2, 3])
  })

  it('150 products: exactly 50 per page across 3 pages', () => {
    const list = products(150)
    expect(paginate(list, 1).items).toHaveLength(50)
    expect(paginate(list, 2).items).toHaveLength(50)
    expect(paginate(list, 3).items).toHaveLength(50)
  })

  it('never renders more than 50 cards, whatever the page', () => {
    const list = products(500)
    for (let page = 1; page <= 10; page += 1) {
      expect(paginate(list, page).items.length).toBeLessThanOrEqual(50)
    }
  })

  it('50 products → 1 page of 50', () => {
    const result = paginate(products(50), 1)
    expect(result.items).toHaveLength(50)
    expect(result.totalPages).toBe(1)
  })
})

describe('clampPage — invalid page numbers are never rendered empty', () => {
  it('?page=999 with 2 pages clamps to the last valid page (2)', () => {
    expect(clampPage(999, 2)).toBe(2)
  })

  it('never allows page 0 or negative pages', () => {
    expect(clampPage(0, 5)).toBe(1)
    expect(clampPage(-3, 5)).toBe(1)
    expect(clampPage('0', 5)).toBe(1)
  })

  it('clamps high pages to the last valid page', () => {
    expect(clampPage(4, 3)).toBe(3)
    expect(clampPage(100, 3)).toBe(3)
  })

  it('falls back to 1 for non-numeric input', () => {
    expect(clampPage('abc', 5)).toBe(1)
    expect(clampPage(undefined, 5)).toBe(1)
    expect(clampPage(NaN, 5)).toBe(1)
  })

  it('handles an empty result set without crashing', () => {
    expect(clampPage(2, 0)).toBe(1)
  })
})

describe('paginate — invalid ?page= yields a valid non-empty page', () => {
  it('?page=999 with 69 products renders page 2 (19 items), never empty', () => {
    const result = paginate(products(69), 999)
    expect(result.currentPage).toBe(2)
    expect(result.items).toHaveLength(19)
  })

  it('?page=0 renders page 1', () => {
    const result = paginate(products(69), 0)
    expect(result.currentPage).toBe(1)
    expect(result.items).toHaveLength(50)
  })
})

describe('pageFromSearch — reads ?page=N from the URL', () => {
  it('reads a valid page number', () => {
    expect(pageFromSearch('?page=2')).toBe(2)
    expect(pageFromSearch('category=attar&page=3')).toBe(3)
  })

  it('missing / invalid / out-of-range page values mean page 1', () => {
    expect(pageFromSearch('')).toBe(1)
    expect(pageFromSearch('?page=abc')).toBe(1)
    expect(pageFromSearch('?page=0')).toBe(1)
    expect(pageFromSearch('?page=-1')).toBe(1)
  })
})

describe('setPageParam — only the page changes, everything else is preserved', () => {
  it('preserves a category filter (category pages)', () => {
    expect(setPageParam('category=attar', 2)).toBe('category=attar&page=2')
  })

  it('preserves a brand filter (brand pages)', () => {
    expect(setPageParam('brand=example-brand', 2)).toBe('brand=example-brand&page=2')
  })

  it('preserves every existing query parameter', () => {
    expect(setPageParam('category=attar&sort=price-asc&q=oud', 3)).toBe(
      'category=attar&sort=price-asc&q=oud&page=3'
    )
  })

  it('overwrites an existing page parameter instead of duplicating it', () => {
    expect(setPageParam('category=attar&page=4', 1)).toBe('category=attar&page=1')
  })

  it('adds the page parameter when the URL has none', () => {
    expect(setPageParam('', 1)).toBe('page=1')
  })
})

describe('pageItems — compact page-number truncation', () => {
  it('page 1 of 20 → 1 2 3 … 20', () => {
    expect(pageItems(1, 20)).toEqual([1, 2, 3, '…', 20])
  })

  it('page 10 of 20 → 1 … 9 10 11 … 20 (current always visible)', () => {
    expect(pageItems(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20])
  })

  it('page 20 of 20 → 1 … 18 19 20', () => {
    expect(pageItems(20, 20)).toEqual([1, '…', 18, 19, 20])
  })

  it('few pages render in full, no ellipsis', () => {
    expect(pageItems(2, 3)).toEqual([1, 2, 3])
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('never renders dozens of buttons for many pages (compact)', () => {
    for (let page = 1; page <= 20; page += 1) {
      expect(pageItems(page, 20).length).toBeLessThanOrEqual(7)
    }
    expect(pageItems(1, 100).length).toBeLessThanOrEqual(7)
  })

  it('clamps an out-of-range current page before building items', () => {
    expect(pageItems(999, 20)).toEqual([1, '…', 18, 19, 20])
  })
})

describe('productCountLabel — accurate count above the grid', () => {
  it('multi-page: "Showing 50 of 69 products" (page 1)', () => {
    expect(productCountLabel(69, 2, 50)).toBe('Showing 50 of 69 products')
  })

  it('multi-page: "Showing 19 of 69 products" (page 2)', () => {
    expect(productCountLabel(69, 2, 19)).toBe('Showing 19 of 69 products')
  })

  it('single page (filtered): "Showing 38 products"', () => {
    expect(productCountLabel(38, 1, 38)).toBe('Showing 38 products')
  })

  it('no products → null (count line hidden)', () => {
    expect(productCountLabel(0, 0, 0)).toBeNull()
  })
})
