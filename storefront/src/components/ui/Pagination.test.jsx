// @vitest-environment jsdom
//
// Component tests for the reusable <Pagination> control
// (storefront/src/components/ui/Pagination.jsx).
//
// Covers the interactive acceptance criteria: no pagination for ≤1 page,
// previous button disabled on page 1, previous navigates back one page,
// page-number clicks navigate, the current page is highlighted, and
// compact ellipsis rendering for many pages.
//
// Run with:  npm test  (storefront)

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react'
import Pagination from './Pagination'

// Vitest runs without global test hooks by default, so @testing-library's
// auto-cleanup never registers — unmount between tests explicitly.
afterEach(() => cleanup())

function renderPagination(props) {
  const onPageChange = vi.fn()
  const utils = render(<Pagination onPageChange={onPageChange} {...props} />)
  return { ...utils, onPageChange }
}

const prevButton = () => screen.getByRole('button', { name: 'Previous page' })
const nextButton = () => screen.getByRole('button', { name: 'Next page' })
const pageButton = (n) => screen.getByRole('button', { name: `Page ${n}` })

describe('visibility', () => {
  it('0 pages → renders nothing', () => {
    const { container } = renderPagination({ currentPage: 1, totalPages: 0 })
    expect(container.innerHTML).toBe('')
  })

  it('1 page → renders nothing (no pagination for a single page)', () => {
    const { container } = renderPagination({ currentPage: 1, totalPages: 1 })
    expect(container.innerHTML).toBe('')
  })

  it('2+ pages → renders the control', () => {
    renderPagination({ currentPage: 1, totalPages: 2 })
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy()
  })
})

describe('previous button', () => {
  it('is disabled on page 1 (never allows page 0)', () => {
    renderPagination({ currentPage: 1, totalPages: 3 })
    expect(prevButton().disabled).toBe(true)
  })

  it('is enabled from page 2 and navigates to page 1', () => {
    const { onPageChange } = renderPagination({ currentPage: 2, totalPages: 3 })
    expect(prevButton().disabled).toBe(false)
    fireEvent.click(prevButton())
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('navigates back one page from any page (3 → 2)', () => {
    const { onPageChange } = renderPagination({ currentPage: 3, totalPages: 5 })
    fireEvent.click(prevButton())
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})

describe('next button', () => {
  it('is disabled on the final page (never allows a page past the last)', () => {
    renderPagination({ currentPage: 3, totalPages: 3 })
    expect(nextButton().disabled).toBe(true)
  })

  it('is enabled before the final page and navigates to the next page', () => {
    const { onPageChange } = renderPagination({ currentPage: 1, totalPages: 3 })
    expect(nextButton().disabled).toBe(false)
    fireEvent.click(nextButton())
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('navigates forward one page from any page (2 → 3)', () => {
    const { onPageChange } = renderPagination({ currentPage: 2, totalPages: 5 })
    fireEvent.click(nextButton())
    expect(onPageChange).toHaveBeenCalledWith(3)
  })
})

describe('page-number buttons', () => {
  it('clicking a page number navigates directly to that page', () => {
    const { onPageChange } = renderPagination({ currentPage: 1, totalPages: 4 })
    fireEvent.click(pageButton(3))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('renders every page number for a small page count', () => {
    renderPagination({ currentPage: 2, totalPages: 4 })
    expect(screen.getAllByRole('button')).toHaveLength(6) // prev + 1 2 3 4 + next
    for (const n of [1, 2, 3, 4]) {
      expect(pageButton(n)).toBeTruthy()
    }
  })

  it('never fires onPageChange for the already-current page', () => {
    const { onPageChange } = renderPagination({ currentPage: 2, totalPages: 4 })
    fireEvent.click(pageButton(2))
    expect(onPageChange).not.toHaveBeenCalled()
  })
})

describe('current page highlight', () => {
  it('marks the current page with is-current and aria-current="page"', () => {
    renderPagination({ currentPage: 2, totalPages: 5 })
    const current = pageButton(2)
    expect(current.className).toContain('is-current')
    expect(current.getAttribute('aria-current')).toBe('page')
  })

  it('does not mark the other pages as current', () => {
    renderPagination({ currentPage: 2, totalPages: 5 })
    for (const n of [1, 3, 4, 5]) {
      expect(pageButton(n).className).not.toContain('is-current')
      expect(pageButton(n).hasAttribute('aria-current')).toBe(false)
    }
  })
})

describe('many pages — compact truncation', () => {
  it('page 1 of 20 renders 1 2 3 … 20 (no dozens of buttons)', () => {
    renderPagination({ currentPage: 1, totalPages: 20 })
    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    // prev + numbered 1,2,3,20 + next = 6 buttons (+ 1 ellipsis span)
    expect(within(nav).getAllByRole('button')).toHaveLength(6)
    expect(within(nav).getByText('…')).toBeTruthy()
    for (const n of [1, 2, 3, 20]) expect(pageButton(n)).toBeTruthy()
  })

  it('page 10 of 20 renders 1 … 9 10 11 … 20 with the current page visible', () => {
    renderPagination({ currentPage: 10, totalPages: 20 })
    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    // prev + numbered 1,9,10,11,20 + next = 7 buttons (the two '…' are spans)
    expect(within(nav).getAllByRole('button')).toHaveLength(7)
    for (const n of [1, 9, 10, 11, 20]) expect(pageButton(n)).toBeTruthy()
    expect(pageButton(10).className).toContain('is-current')
    expect(within(nav).getAllByText('…')).toHaveLength(2)
  })

  it('stays compact even with 100 pages (≤9 buttons incl. prev + next)', () => {
    renderPagination({ currentPage: 50, totalPages: 100 })
    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    // prev + at most 7 page items + next
    expect(within(nav).getAllByRole('button').length).toBeLessThanOrEqual(9)
  })
})

describe('disabled prop', () => {
  it('disables every control when disabled is true', () => {
    renderPagination({ currentPage: 2, totalPages: 3, disabled: true })
    expect(prevButton().disabled).toBe(true)
    expect(nextButton().disabled).toBe(true)
    expect(pageButton(1).disabled).toBe(true)
    expect(pageButton(3).disabled).toBe(true)
  })
})
