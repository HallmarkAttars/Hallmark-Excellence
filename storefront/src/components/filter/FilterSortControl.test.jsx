// @vitest-environment jsdom
//
// Behavioral tests for the mobile FILTER & SORT bottom sheet
// (storefront/src/components/filter/FilterSortControl.jsx).
//
// Regression guard for the layering fix: the sheet and its full-screen
// backdrop are portaled to <body> so no ancestor stacking context can trap
// them (footer / WhatsApp / navbar must never paint above the backdrop),
// body scroll is locked while the sheet is open, tapping the backdrop
// closes it, and the desktop popover path is untouched.
//
// Run with:  npm test  (storefront)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import FilterSortControl, { SORT_OPTIONS } from './FilterSortControl'

// jsdom has no matchMedia; emulate it so the component's viewport guards run
// for real. `mobile` flips the <768px / >=768px answers.
let isMobile = true
beforeEach(() => {
  isMobile = true
  window.matchMedia = vi.fn((query) => ({
    matches: query.includes('min-width: 768px') ? !isMobile : isMobile,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }))
})

afterEach(() => cleanup())

const openButton = () => screen.getByRole('button', { name: /Filter & Sort/i })

// The sheet/backdrop live OUTSIDE the rendered container (portal to body).
const sheetInBody = () =>
  [...document.body.querySelectorAll('.filter-sort-sheet')].find((el) => el.parentElement === document.body)
const backdropInBody = () =>
  [...document.body.querySelectorAll('.filter-sort-sheet-backdrop')].find((el) => el.parentElement === document.body) ?? null

describe('FilterSortControl — mobile bottom sheet layering', () => {
  it('portals the sheet and backdrop to <body> when opened on mobile', () => {
    render(<FilterSortControl filterOptions={[{ id: 'c1', name: 'Attar' }]} />)

    // Closed: the sheet exists but is hidden (no backdrop, scroll free).
    expect(sheetInBody()).toBeTruthy()
    expect(sheetInBody().classList.contains('is-open')).toBe(false)
    expect(backdropInBody()).toBeNull()
    expect(document.body.style.overflow).toBe('')

    fireEvent.click(openButton())

    // Sheet visible AND both sheet + backdrop are direct children of <body>
    // — no ancestor stacking context can reorder them under the footer.
    expect(sheetInBody().classList.contains('is-open')).toBe(true)
    expect(backdropInBody()).toBeTruthy()
    expect(document.body.contains(backdropInBody())).toBe(true)

    // Background scroll is locked while the sheet is open.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('tapping the backdrop closes the sheet and restores page scroll', () => {
    render(<FilterSortControl filterOptions={[{ id: 'c1', name: 'Attar' }]} />)
    fireEvent.click(openButton())
    expect(backdropInBody()).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.click(backdropInBody())

    expect(sheetInBody().classList.contains('is-open')).toBe(false)
    expect(backdropInBody()).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('Escape closes the sheet and restores page scroll', () => {
    render(<FilterSortControl filterOptions={[{ id: 'c1', name: 'Attar' }]} />)
    fireEvent.click(openButton())
    expect(sheetInBody().classList.contains('is-open')).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(sheetInBody().classList.contains('is-open')).toBe(false)
    expect(backdropInBody()).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('mobile sheet keeps every option and the Apply Filters button', () => {
    const options = [
      { id: 'c1', name: 'Attar' },
      { id: 'c2', name: 'Oud' },
    ]
    render(<FilterSortControl filterLabel="Brand" allLabel="All Brands" filterOptions={options} />)
    fireEvent.click(openButton())

    const dialog = screen.getByRole('dialog', { name: 'Filter and sort' })
    expect(dialog).toBeTruthy()
    // Filter options
    expect(dialog.textContent).toContain('All Brands')
    expect(dialog.textContent).toContain('Attar')
    expect(dialog.textContent).toContain('Oud')
    // Sort options
    SORT_OPTIONS.forEach((o) => expect(dialog.textContent).toContain(o.label))
    // Close + apply controls
    expect(screen.getByRole('button', { name: 'Close filter and sort' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Apply Filters' })).toBeTruthy()
  })

  it('desktop still opens the popover — no backdrop, no body scroll lock', () => {
    isMobile = false
    render(<FilterSortControl filterOptions={[{ id: 'c1', name: 'Attar' }]} />)
    fireEvent.click(openButton())

    // Desktop popover dialog renders in place; no portaled backdrop, no lock.
    expect(screen.getByRole('dialog', { name: 'Filter and sort' })).toBeTruthy()
    expect(backdropInBody()).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })

  it('stylesheet contract: opaque sheet above a full-screen backdrop above page content', () => {
    // The fix lives in the stylesheet too — guard the layering/opacity values
    // so a future edit cannot reintroduce the see-through modal. Resolved
    // from the vitest cwd (storefront), same root the npm test script runs in.
    const css = readFileSync('src/components/filter/FilterSortControl.css', 'utf8')

    // Backdrop covers the whole viewport above the page (above navbar 100,
    // WhatsApp 95, search 140) — token --z-backdrop = 150.
    const backdropRule = css.match(/\.filter-sort-sheet-backdrop\s*{[^}]*}/)?.[0] ?? ''
    expect(backdropRule).toContain('position: fixed')
    expect(backdropRule).toContain('inset: 0')
    expect(backdropRule).toContain('z-index: var(--z-backdrop)')

    // Sheet sits above the backdrop (--z-overlay = 160) with an OPAQUE cream
    // background — never transparent, never glass.
    const sheetRule = css.match(/\.filter-sort-sheet\s*{[^}]*}/)?.[0] ?? ''
    expect(sheetRule).toContain('z-index: var(--z-overlay)')
    const sheetBg = sheetRule.match(/background:\s*([^;]+);/)?.[1] ?? ''
    expect(sheetBg).toBe('#f8f4ea')
  })
})
