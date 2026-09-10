// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useMobileBrandStack } from './useMobileBrandStack'

describe('useMobileBrandStack hook', () => {
  let container
  let card0, card1, card2
  let matchMediaMock
  let originalInnerWidth

  beforeEach(() => {
    originalInnerWidth = window.innerWidth
    window.innerWidth = 390 // mobile width

    // Mock matchMedia
    matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: false, // prefers-reduced-motion: false by default
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    window.matchMedia = matchMediaMock

    // Build DOM
    container = document.createElement('div')
    container.className = 'brands-showcase'

    card0 = document.createElement('div')
    card0.className = 'brands-showcase-cell'
    Object.defineProperty(card0, 'offsetHeight', { value: 520, configurable: true })

    card1 = document.createElement('div')
    card1.className = 'brands-showcase-cell'
    Object.defineProperty(card1, 'offsetHeight', { value: 520, configurable: true })

    card2 = document.createElement('div')
    card2.className = 'brands-showcase-cell'
    Object.defineProperty(card2, 'offsetHeight', { value: 520, configurable: true })

    container.appendChild(card0)
    container.appendChild(card1)
    container.appendChild(card2)
    document.body.appendChild(container)
  })

  afterEach(() => {
    window.innerWidth = originalInnerWidth
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.restoreAllMocks()
  })

  it('does not apply mobile stack variables when viewport is desktop (>= 768px)', () => {
    window.innerWidth = 1024
    const containerRef = { current: container }

    renderHook(() => useMobileBrandStack(containerRef))

    expect(card0.style.getPropertyValue('--stack-scale')).toBe('')
    expect(card0.style.getPropertyValue('--stack-y')).toBe('')
    expect(card0.style.getPropertyValue('--stack-opacity')).toBe('')
  })

  it('does not apply variables when prefers-reduced-motion is true', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))
    const containerRef = { current: container }

    renderHook(() => useMobileBrandStack(containerRef))

    expect(card0.style.getPropertyValue('--stack-scale')).toBe('')
  })

  it('calculates smooth transition when mobile and next card approaches', () => {
    // Card 0 at sticky top 78px
    card0.getBoundingClientRect = vi.fn(() => ({
      top: 78,
      bottom: 598,
      height: 520,
    }))

    // Card 1 is transitioning in (top: 250)
    card1.getBoundingClientRect = vi.fn(() => ({
      top: 250,
      bottom: 770,
      height: 520,
    }))

    // Card 2 is still far below
    card2.getBoundingClientRect = vi.fn(() => ({
      top: 900,
      bottom: 1420,
      height: 520,
    }))

    const containerRef = { current: container }
    renderHook(() => useMobileBrandStack(containerRef))

    // Trigger scroll
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    // Advance RAF
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    const scale = parseFloat(card0.style.getPropertyValue('--stack-scale'))
    const opacity = parseFloat(card0.style.getPropertyValue('--stack-opacity'))

    // Card 0 should have scaled down smoothly (< 1.0) and faded (< 1.0)
    expect(scale).toBeLessThan(1.0)
    expect(scale).toBeGreaterThanOrEqual(0.9)
    expect(opacity).toBeLessThan(1.0)
    expect(opacity).toBeGreaterThanOrEqual(0.0)

    // Card 2 remains un-scaled and fully opaque
    expect(card2.style.getPropertyValue('--stack-scale')).toBe('1.000')
    expect(card2.style.getPropertyValue('--stack-opacity')).toBe('1.000')
  })

  it('completely hides previous card (opacity: 0, pointer-events: none) when next card reaches sticky top', () => {
    // Card 0 covered
    card0.getBoundingClientRect = vi.fn(() => ({ top: 78, bottom: 598, height: 520 }))
    // Card 1 has docked at sticky top
    card1.getBoundingClientRect = vi.fn(() => ({ top: 78, bottom: 598, height: 520 }))
    // Card 2 is below
    card2.getBoundingClientRect = vi.fn(() => ({ top: 800, bottom: 1320, height: 520 }))

    const containerRef = { current: container }
    renderHook(() => useMobileBrandStack(containerRef))

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(card0.style.getPropertyValue('--stack-opacity')).toBe('0.000')
    expect(card0.style.pointerEvents).toBe('none')

    // Card 1 is now the primary visible card
    expect(card1.style.getPropertyValue('--stack-scale')).toBe('1.000')
    expect(card1.style.getPropertyValue('--stack-opacity')).toBe('1.000')
    expect(card1.style.pointerEvents).toBe('')
  })

  it('cleans up all custom properties on unmount', () => {
    card0.getBoundingClientRect = vi.fn(() => ({ top: 78, bottom: 598, height: 520 }))
    card1.getBoundingClientRect = vi.fn(() => ({ top: 100, bottom: 620, height: 520 }))
    card2.getBoundingClientRect = vi.fn(() => ({ top: 600, bottom: 1120, height: 520 }))

    const containerRef = { current: container }
    const { unmount } = renderHook(() => useMobileBrandStack(containerRef))

    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(card0.style.getPropertyValue('--stack-scale')).not.toBe('')

    act(() => {
      unmount()
    })

    expect(card0.style.getPropertyValue('--stack-scale')).toBe('')
    expect(card0.style.getPropertyValue('--stack-y')).toBe('')
    expect(card0.style.getPropertyValue('--stack-opacity')).toBe('')
    expect(card0.style.pointerEvents).toBe('')
  })
})
