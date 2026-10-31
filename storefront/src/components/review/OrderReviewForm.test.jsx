// @vitest-environment jsdom
//
// Behavioral tests for OrderReviewForm (on-site order review, Phase B):
//  - renders fields and posts { orderId, phone, rating, consentShow, text }
//  - star-only reviews are valid; text optional
//  - success persists a per-order localStorage flag and shows the thank you
//  - 409 (already reviewed) is treated as done
//  - 400/403 surface the server's user-facing message
//  - an order missing a phone renders the extra phone input

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import OrderReviewForm, { orderReviewPostedKey } from './OrderReviewForm'
import { api } from '../../services/api'

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}))

const order = {
  orderId: 'ORD-592546',
  status: 'Delivered',
  customer_name: 'Mubarak',
  phone: '+919876543210',
  items: [],
  total: 1200,
}

beforeEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
  api.post.mockReset()
})

afterEach(() => cleanup())

const open = (props = {}) => render(<OrderReviewForm order={order} {...props} />)

describe('OrderReviewForm', () => {
  it('renders the rating group, comment field and submit button', () => {
    open()
    expect(screen.getByRole('radiogroup', { name: 'Star rating' })).toBeTruthy()
    expect(screen.getByLabelText(/Your comments/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Submit Review' })).toBeTruthy()
    // Phone is NOT asked for when the order carries the customer's phone.
    expect(screen.queryByLabelText(/Mobile number/)).toBeNull()
  })

  it('asks for the order phone when the order has none', () => {
    open({ order: { ...order, phone: undefined } })
    expect(screen.getByLabelText(/Mobile number/)).toBeTruthy()
  })

  it('blocks submit without a rating', async () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('submits a star-only review and shows the thank-you state', async () => {
    api.post.mockResolvedValue({ ok: true, status: 'pending' })
    open()
    fireEvent.click(screen.getByRole('radio', { name: '4 stars — Good' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }))

    await screen.findByText(/Thank you for rating this order/)
    expect(api.post).toHaveBeenCalledWith('/reviews', {
      orderId: 'ORD-592546',
      rating: 4,
      consentShow: false,
      phone: '+919876543210',
    })
    expect(window.localStorage.getItem(orderReviewPostedKey('ORD-592546'))).toBe('1')
  })

  it('submits text + consent and persists the posted flag', async () => {
    api.post.mockResolvedValue({ ok: true, status: 'pending' })
    open()
    fireEvent.click(screen.getByRole('radio', { name: '5 stars — Excellent' }))
    fireEvent.change(screen.getByLabelText(/Your comments/), {
      target: { value: 'Beautiful attar, quick delivery.' },
    })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }))

    await screen.findByText(/Thank you for rating this order/)
    expect(api.post).toHaveBeenCalledWith('/reviews', {
      orderId: 'ORD-592546',
      rating: 5,
      consentShow: true,
      phone: '+919876543210',
      reviewText: 'Beautiful attar, quick delivery.',
    })
  })

  it('does not resend after 409 (already reviewed) and hides the form', async () => {
    api.post.mockRejectedValue(Object.assign(new Error('This order already has a review. Thank you!'), { status: 409 }))
    open()
    fireEvent.click(screen.getByRole('radio', { name: '5 stars — Excellent' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }))

    await screen.findByText(/Thank you for rating this order/)
    expect(window.localStorage.getItem(orderReviewPostedKey('ORD-592546'))).toBe('1')
  })

  it('surfaces the server message for a failed verification (403)', async () => {
    api.post.mockRejectedValue(Object.assign(new Error('We could not verify this order with the details provided.'), { status: 403 }))
    open()
    fireEvent.click(screen.getByRole('radio', { name: '5 stars — Excellent' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    // Form stays up so the customer can retry.
    expect(screen.getByRole('button', { name: 'Submit Review' })).toBeTruthy()
  })

  it('stays hidden once the posted flag exists (remount)', async () => {
    window.localStorage.setItem(orderReviewPostedKey('ORD-592546'), '1')
    const { container } = render(<OrderReviewForm order={order} />)
    await screen.findByText(/Thank you for rating this order/)
    expect(container.querySelector('form')).toBeNull()
  })

  it('renders nothing without an order id', () => {
    const { container } = render(<OrderReviewForm order={{ status: 'Delivered' }} />)
    expect(container.firstChild).toBeNull()
  })
})
