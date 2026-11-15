// @vitest-environment jsdom
//
// Behavioral tests for the Google review prompt (ReviewPrompt.jsx):
//  - the primary CTA points at the canonical Place-ID write-review link
//  - the listing fallback and private help path are present
//  - "Not now" hides the card persistently (per-order localStorage)
//  - clicking either review link marks the order as reviewed
//  - nothing renders when no Google review URL is configured
//  - both placements render, with placement-aware copy
//  - guarded GA4 event fires with the click source

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ReviewPrompt, {
  reviewDismissedKey,
  reviewClickedKey,
} from './ReviewPrompt'
import { BUSINESS } from '../../data/content'

const REVIEW_URL =
  'https://search.google.com/local/writereview?placeid=ChIJa5hHrcdvUjoRdEjj7LYXrvs'
const FALLBACK_URL = 'https://www.google.com/maps?cid=18135458823893370996'

vi.mock('../../data/content', () => {
  const state = {
    url: 'https://search.google.com/local/writereview?placeid=ChIJa5hHrcdvUjoRdEjj7LYXrvs',
    fallback: 'https://www.google.com/maps?cid=18135458823893370996',
  }
  return {
    BUSINESS: {
      get googleReviewUrl() {
        return state.url
      },
      set googleReviewUrl(value) {
        state.url = value
      },
      get googleReviewFallbackUrl() {
        return state.fallback
      },
      set googleReviewFallbackUrl(value) {
        state.fallback = value
      },
    },
  }
})

const renderPrompt = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

beforeEach(() => {
  BUSINESS.googleReviewUrl = REVIEW_URL
  BUSINESS.googleReviewFallbackUrl = FALLBACK_URL
  window.localStorage.clear()
  delete window.gtag
})

afterEach(() => cleanup())

describe('ReviewPrompt — order success placement', () => {
  it('renders neutral copy, Google attribution, CTA, fallback and help link', () => {
    renderPrompt(<ReviewPrompt placement="order-success" orderId="ORD-123" />)

    const cta = screen.getByRole('link', {
      name: 'Write a Google review (opens in a new tab)',
    })
    expect(cta.getAttribute('href')).toBe(REVIEW_URL)
    expect(cta.getAttribute('target')).toBe('_blank')
    expect(cta.getAttribute('rel')).toContain('noopener')
    expect(cta.getAttribute('rel')).toContain('noreferrer')

    expect(screen.getByText('Google review')).toBeTruthy()
    expect(
      screen.getByRole('heading', {
        name: 'Once your order arrives, share it on Google',
      })
    ).toBeTruthy()
    expect(screen.queryByText('Loved your order?')).toBeNull()

    const fallback = screen.getByRole('link', {
      name: 'Open our Google listing (opens in a new tab)',
    })
    expect(fallback.getAttribute('href')).toBe(FALLBACK_URL)
    expect(
      screen.getByRole('link', { name: 'Need help with this order? Contact us' })
        .getAttribute('href')
    ).toBe('/contact')
    expect(screen.getByRole('button', { name: 'Not now' })).toBeTruthy()
  })

  it('hides permanently after "Not now" and stays hidden on remount', () => {
    const { unmount } = renderPrompt(
      <ReviewPrompt placement="order-success" orderId="ORD-123" />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(window.localStorage.getItem(reviewDismissedKey('ORD-123'))).toBe('1')
    unmount()
    renderPrompt(<ReviewPrompt placement="order-success" orderId="ORD-123" />)

    expect(
      screen.queryByRole('link', {
        name: 'Write a Google review (opens in a new tab)',
      })
    ).toBeNull()
  })

  it('only dismisses for its own order id', () => {
    renderPrompt(<ReviewPrompt placement="order-success" orderId="ORD-123" />)
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    cleanup()

    renderPrompt(<ReviewPrompt placement="order-success" orderId="ORD-456" />)
    expect(
      screen.getByRole('link', {
        name: 'Write a Google review (opens in a new tab)',
      })
    ).toBeTruthy()
  })

  it('marks the order reviewed on primary click and never shows again', () => {
    const { unmount } = renderPrompt(
      <ReviewPrompt placement="order-success" orderId="ORD-123" />
    )
    fireEvent.click(
      screen.getByRole('link', {
        name: 'Write a Google review (opens in a new tab)',
      })
    )

    expect(window.localStorage.getItem(reviewClickedKey('ORD-123'))).toBe('1')
    unmount()
    renderPrompt(<ReviewPrompt placement="order-success" orderId="ORD-123" />)

    expect(
      screen.queryByRole('link', {
        name: 'Write a Google review (opens in a new tab)',
      })
    ).toBeNull()
  })

  it('marks the order reviewed when the listing fallback is opened', () => {
    renderPrompt(<ReviewPrompt placement="order-success" orderId="ORD-123" />)
    fireEvent.click(
      screen.getByRole('link', {
        name: 'Open our Google listing (opens in a new tab)',
      })
    )
    expect(window.localStorage.getItem(reviewClickedKey('ORD-123'))).toBe('1')
  })

  it('fires the guarded GA4 event with placement and click source', () => {
    window.gtag = vi.fn()
    renderPrompt(<ReviewPrompt placement="order-success" orderId="ORD-123" />)
    fireEvent.click(
      screen.getByRole('link', {
        name: 'Write a Google review (opens in a new tab)',
      })
    )

    expect(window.gtag).toHaveBeenCalledWith('event', 'google_review_click', {
      placement: 'order-success',
      source: 'primary',
    })
  })

  it('tracks the fallback source separately', () => {
    window.gtag = vi.fn()
    renderPrompt(<ReviewPrompt placement="order-success" orderId="ORD-123" />)
    fireEvent.click(
      screen.getByRole('link', {
        name: 'Open our Google listing (opens in a new tab)',
      })
    )

    expect(window.gtag).toHaveBeenCalledWith('event', 'google_review_click', {
      placement: 'order-success',
      source: 'fallback',
    })
  })

  it('does not throw when gtag is absent (mobile loader / blockers)', () => {
    delete window.gtag
    renderPrompt(<ReviewPrompt placement="order-success" orderId="ORD-123" />)
    expect(() =>
      fireEvent.click(
        screen.getByRole('link', {
          name: 'Write a Google review (opens in a new tab)',
        })
      )
    ).not.toThrow()
  })

  it('renders nothing when no Google review URL is configured', () => {
    BUSINESS.googleReviewUrl = ''
    const { container } = renderPrompt(
      <ReviewPrompt placement="order-success" orderId="ORD-123" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('omits the listing fallback when it is missing or identical', () => {
    BUSINESS.googleReviewFallbackUrl = REVIEW_URL
    renderPrompt(<ReviewPrompt placement="order-success" orderId="ORD-123" />)
    expect(
      screen.queryByRole('link', {
        name: 'Open our Google listing (opens in a new tab)',
      })
    ).toBeNull()
  })

  it('renders nothing when storage access throws', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked (private mode)')
      },
    })
    const { container } = renderPrompt(
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
    renderPrompt(<ReviewPrompt placement="order-success" />)
    expect(
      screen.getByRole('link', {
        name: 'Write a Google review (opens in a new tab)',
      })
    ).toBeTruthy()
  })
})

describe('ReviewPrompt — delivered placement (Track Order)', () => {
  it('renders the delivered variant with its class and placement-aware copy', () => {
    renderPrompt(<ReviewPrompt placement="delivered" orderId="ORD-123" />)
    expect(document.querySelector('.review-prompt-delivered')).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Share your experience on Google' })
    ).toBeTruthy()
    expect(
      screen.getByText(/honest review helps other fragrance lovers/i)
    ).toBeTruthy()
    expect(
      screen.getByRole('link', {
        name: 'Write a Google review (opens in a new tab)',
      })
    ).toBeTruthy()
  })
})
