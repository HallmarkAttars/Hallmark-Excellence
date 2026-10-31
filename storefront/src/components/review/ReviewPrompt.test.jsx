// @vitest-environment jsdom
//
// Behavioral tests for the Google review prompt (ReviewPrompt.jsx):
//  - the CTA points at the canonical Place-ID write-review link with
//    target/_blank + noopener (never the expiring Google Search URLs)
//  - "Not now" hides the card persistently (per-order localStorage)
//  - clicking the CTA marks the order as reviewed → never shown again
//  - nothing renders when no Google review URL is configured
//  - both placements render, with the delivered placement on Track Order
//  - guarded GA4 event fires on click

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import ReviewPrompt, {
  reviewDismissedKey,
  reviewClickedKey,
} from './ReviewPrompt'
import { BUSINESS } from '../../data/content'

vi.mock('../../data/content', () => {
  const state = {
    url: 'https://search.google.com/local/writereview?placeid=ChIJa5hHrcdvUjoRdEjj7LYXrvs',
  }
  return {
    BUSINESS: {
      get googleReviewUrl() {
        return state.url
      },
      set googleReviewUrl(value) {
        state.url = value
      },
    },
  }
})

beforeEach(() => {
  BUSINESS.googleReviewUrl =
    'https://search.google.com/local/writereview?placeid=ChIJa5hHrcdvUjoRdEjj7LYXrvs'
  window.localStorage.clear()
  delete window.gtag
})

afterEach(() => cleanup())

describe('ReviewPrompt — order success placement', () => {
  it('renders the CTA linked to the canonical Place-ID review form with target/rel', () => {
    render(<ReviewPrompt placement="order-success" orderId="ORD-123" />)

    const cta = screen.getByRole('link', {
      name: 'Write a Google review (opens in a new tab)',
    })
    expect(cta.getAttribute('href')).toBe(
      'https://search.google.com/local/writereview?placeid=ChIJa5hHrcdvUjoRdEjj7LYXrvs'
    )
    expect(cta.getAttribute('target')).toBe('_blank')
    expect(cta.getAttribute('rel')).toContain('noopener')
    expect(cta.getAttribute('rel')).toContain('noreferrer')
    // The card never renders a dead link when unconfigured — sanity:
    expect(screen.getByRole('heading', { name: 'Loved your order?' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Not now' })).toBeTruthy()
  })

  it('hides permanently after "Not now" and stays hidden on remount', () => {
    const { unmount } = render(
      <ReviewPrompt placement="order-success" orderId="ORD-123" />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(window.localStorage.getItem(reviewDismissedKey('ORD-123'))).toBe('1')
    unmount()
    render(<ReviewPrompt placement="order-success" orderId="ORD-123" />)

    // queryByRole returns null — the dismissed card is gone.
    expect(
      screen.queryByRole('link', { name: 'Write a Google review (opens in a new tab)' })
    ).toBeNull()
  })

  it('only dismisses for its own order id', () => {
    render(<ReviewPrompt placement="order-success" orderId="ORD-123" />)
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    cleanup()

    render(<ReviewPrompt placement="order-success" orderId="ORD-456" />)
    // A different order is a different moment — the prompt shows again.
    expect(
      screen.getByRole('link', { name: 'Write a Google review (opens in a new tab)' })
    ).toBeTruthy()
  })

  it('marks the order reviewed on CTA click and never shows again on remount', () => {
    const { unmount } = render(
      <ReviewPrompt placement="order-success" orderId="ORD-123" />
    )
    fireEvent.click(screen.getByRole('link', { name: 'Write a Google review (opens in a new tab)' }))

    expect(window.localStorage.getItem(reviewClickedKey('ORD-123'))).toBe('1')
    unmount()
    render(<ReviewPrompt placement="order-success" orderId="ORD-123" />)

    expect(
      screen.queryByRole('link', { name: 'Write a Google review (opens in a new tab)' })
    ).toBeNull()
  })

  it('fires the guarded GA4 google_review_click event with the placement', () => {
    window.gtag = vi.fn()
    render(<ReviewPrompt placement="order-success" orderId="ORD-123" />)
    fireEvent.click(screen.getByRole('link', { name: 'Write a Google review (opens in a new tab)' }))

    // GA4 convention: gtag('event', <name>, <params>)
    expect(window.gtag).toHaveBeenCalledWith('event', 'google_review_click', {
      placement: 'order-success',
    })
  })

  it('does not throw when gtag is absent (mobile loader / blockers)', () => {
    delete window.gtag
    render(<ReviewPrompt placement="order-success" orderId="ORD-123" />)
    expect(() =>
      fireEvent.click(
        screen.getByRole('link', { name: 'Write a Google review (opens in a new tab)' })
      )
    ).not.toThrow()
  })

  it('renders nothing when no Google review URL is configured', () => {
    BUSINESS.googleReviewUrl = ''
    const { container } = render(
      <ReviewPrompt placement="order-success" orderId="ORD-123" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when storage access throws', () => {
    // Private-mode Safari and hardened browsers can throw on ANY storage
    // touch. jsdom's localStorage can't be method-spied reliably (its
    // property is re-created per access), so replace the window property
    // with a throwing getter — the component must fail closed: no card.
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked (private mode)')
      },
    })
    const { container } = render(
      <ReviewPrompt placement="order-success" orderId="ORD-123" />
    )
    if (originalDescriptor) {
      Object.defineProperty(window, 'localStorage', originalDescriptor)
    } else {
      delete window.localStorage
    }
    expect(container.firstChild).toBeNull()
  })

  it('still renders with an unknown order id (dismissal keyed defensively)', () => {
    render(<ReviewPrompt placement="order-success" />)
    expect(
      screen.getByRole('link', { name: 'Write a Google review (opens in a new tab)' })
    ).toBeTruthy()
  })
})

describe('ReviewPrompt — delivered placement (Track Order)', () => {
  it('renders the delivered variant with its placement class and copy', () => {
    render(<ReviewPrompt placement="delivered" orderId="ORD-123" />)
    expect(document.querySelector('.review-prompt-delivered')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Loved your order?' })).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Write a Google review (opens in a new tab)' })
    ).toBeTruthy()
  })
})
