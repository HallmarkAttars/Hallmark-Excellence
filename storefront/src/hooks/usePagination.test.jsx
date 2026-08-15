// @vitest-environment jsdom
//
// Hook tests for usePagination (storefront/src/hooks/usePagination.js).
//
// Covers the URL-state acceptance criteria: ?page=N drives the rendered
// page, page changes push history and preserve every other query parameter,
// filter/sort/search changes reset to page 1, browser back/forward restores
// the previous page, and an invalid ?page= is clamped to the last valid
// page (without touching the URL while data is still loading).
//
// The real history wiring is react-router's useSearchParams; here we feed
// the hook a mocked setSearchParams and inspect exactly what it is asked
// to write, so the page state logic is proven independent of the router.
//
// Run with:  npm test  (storefront)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import usePagination from './usePagination'

// Vitest runs without global test hooks by default, so @testing-library's
// auto-cleanup never registers — unmount between tests explicitly.
afterEach(() => cleanup())

const products = (n) => Array.from({ length: n }, (_, i) => ({ id: `p-${i + 1}` }))

// Run the hook with a stubbed router (setSearchParams) and capture every
// write. The updater form (prev) => next is applied to a fresh
// URLSearchParams copy so we can assert the exact URL that would be pushed.
function setup(search, totalItems, options = {}) {
  const setSearchParams = vi.fn()
  const utils = renderHook(
    (props) => usePagination(props.searchParams, props.setSearchParams, props.totalItems, props.options),
    {
      initialProps: {
        searchParams: new URLSearchParams(search),
        setSearchParams,
        totalItems,
        options,
      },
    }
  )
  return { ...utils, setSearchParams }
}

// Apply the updater passed to setSearchParams to a starting search string.
function appliedUpdate(setSearchParams, fromSearch) {
  const call = setSearchParams.mock.calls.find((c) => typeof c[0] === 'function')
  if (!call) return null
  return call[0](new URLSearchParams(fromSearch)).toString()
}

// Option flags used on the setSearchParams call (e.g. { replace: true }).
function updateOptions(setSearchParams, index = 0) {
  const call = setSearchParams.mock.calls[index]
  return call ? call[1] : undefined
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('page state from the URL', () => {
  it('?page=2 renders page 2 of 120 products (50 items, 3 pages)', () => {
    const { result } = setup('?page=2', products(120))
    expect(result.current.currentPage).toBe(2)
    expect(result.current.items).toHaveLength(50)
    expect(result.current.total).toBe(120)
    expect(result.current.totalPages).toBe(3)
  })

  it('no page param means page 1', () => {
    const { result } = setup('', products(69))
    expect(result.current.currentPage).toBe(1)
    expect(result.current.items).toHaveLength(50)
  })
})

describe('goToPage — push navigation that preserves all other params', () => {
  it('navigates to the requested page keeping the category filter', () => {
    const { result, setSearchParams } = setup('?category=attar&page=1', products(120))
    act(() => result.current.goToPage(3))
    expect(setSearchParams).toHaveBeenCalled()
    // Functional updater form (push navigation), not a plain string.
    expect(typeof setSearchParams.mock.calls[0][0]).toBe('function')
    expect(appliedUpdate(setSearchParams, 'category=attar&page=1')).toBe(
      'category=attar&page=3'
    )
  })

  it('browser-back path: a changed URL simply renders the new page', () => {
    // Back/forward only changes the URL; the hook must follow it.
    const { result, rerender } = setup('?page=3', products(120))
    expect(result.current.currentPage).toBe(3)

    rerender({
      searchParams: new URLSearchParams('?page=2'),
      setSearchParams: vi.fn(),
      totalItems: products(120),
      options: {},
    })
    expect(result.current.currentPage).toBe(2)

    rerender({
      searchParams: new URLSearchParams('?page=1'),
      setSearchParams: vi.fn(),
      totalItems: products(120),
      options: {},
    })
    expect(result.current.currentPage).toBe(1)
    expect(result.current.items[0].id).toBe('p-1')
  })

  it('goToPage does not use replace (push navigation preserves history)', () => {
    const { result, setSearchParams } = setup('?page=1', products(120))
    act(() => result.current.goToPage(2))
    expect(updateOptions(setSearchParams)).toBeUndefined()
  })

  it('goToPage is a no-op for the already-current page (no duplicate entry)', () => {
    const { result, setSearchParams } = setup('?page=2', products(120))
    act(() => result.current.goToPage(2))
    expect(setSearchParams).not.toHaveBeenCalled()
  })
})

describe('resetToFirstPage — filter/sort/search changes reset to page 1', () => {
  // Note: the setup URL uses a VALID page (page 2 of 3) so the invalid-page
  // normalization effect stays silent and the only write is the reset.
  it.each(['filter', 'sort', 'search'])('%s change resets ?page=N to page 1', () => {
    const { result, setSearchParams } = setup('?category=attar&page=2', products(120))
    act(() => result.current.resetToFirstPage())
    expect(appliedUpdate(setSearchParams, 'category=attar&page=2')).toBe(
      'category=attar&page=1'
    )
  })

  it('reset uses replace:true (a filter change is not a navigation)', () => {
    const { result, setSearchParams } = setup('?page=2', products(120))
    act(() => result.current.resetToFirstPage())
    expect(updateOptions(setSearchParams)).toEqual({ replace: true })
  })

  it('reset preserves every other query parameter', () => {
    const { result, setSearchParams } = setup('?category=attar&sort=price-asc&page=2', products(120))
    act(() => result.current.resetToFirstPage())
    expect(appliedUpdate(setSearchParams, 'category=attar&sort=price-asc&page=2')).toBe(
      'category=attar&sort=price-asc&page=1'
    )
  })
})

describe('invalid ?page= handling', () => {
  it('?page=999 with 69 products (2 pages) renders page 2, never empty', () => {
    const { result, setSearchParams } = setup('?page=999', products(69))
    expect(result.current.currentPage).toBe(2)
    expect(result.current.items).toHaveLength(19)
    // And the URL is rewritten to the clamped page (replace).
    expect(appliedUpdate(setSearchParams, '?page=999')).toBe('page=2')
  })

  it('rewrites the invalid URL with replace so history is not polluted', () => {
    const { result, setSearchParams } = setup('?page=999', products(69))
    expect(result.current.currentPage).toBe(2)
    const normalizeCall = setSearchParams.mock.calls.find(
      (c) => typeof c[0] === 'function'
    )
    expect(normalizeCall[1]).toEqual({ replace: true })
  })

  it('?page=0 and ?page=-5 render page 1', () => {
    expect(setup('?page=0', products(69)).result.current.currentPage).toBe(1)
    expect(setup('?page=-5', products(69)).result.current.currentPage).toBe(1)
  })

  it('does NOT rewrite the URL while data is still loading (deep links survive)', () => {
    const { result, setSearchParams } = setup('?page=2', [], { loading: true })
    expect(result.current.currentPage).toBe(1) // clamped render (nothing loaded)
    // No URL rewrite while loading — ?page=2 must survive until data arrives.
    const writes = setSearchParams.mock.calls.filter((c) => typeof c[0] === 'function')
    expect(writes).toHaveLength(0)
  })

  it('a page beyond the new total after filtering clamps to the last page', () => {
    // Filtered result set: 69 → 38 products (1 page). ?page=4 must render page 1.
    const { result, setSearchParams } = setup('?page=4', products(38))
    expect(result.current.currentPage).toBe(1)
    expect(result.current.totalPages).toBe(1)
    expect(appliedUpdate(setSearchParams, '?page=4')).toBe('page=1')
  })
})

describe('scroll to the product grid', () => {
  it('scrolls to the anchor when the page changes', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const el = document.createElement('div')
    el.id = 'grid-anchor'
    document.body.appendChild(el)

    const { rerender } = setup('?page=1', products(120), { scrollAnchorId: 'grid-anchor' })
    expect(scrollIntoView).not.toHaveBeenCalled() // first mount — no scroll

    rerender({
      searchParams: new URLSearchParams('?page=2'),
      setSearchParams: vi.fn(),
      totalItems: products(120),
      options: { scrollAnchorId: 'grid-anchor' },
    })
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    document.body.removeChild(el)
  })

  it('does not scroll on first mount', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    setup('?page=2', products(120), { scrollAnchorId: 'grid-anchor' })
    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
