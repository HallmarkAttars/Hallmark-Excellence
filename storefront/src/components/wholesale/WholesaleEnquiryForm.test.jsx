// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import WholesaleEnquiryForm from './WholesaleEnquiryForm'
import { submitWholesaleEnquiry } from '../../utils/wholesaleEnquiry'

vi.mock('../../utils/wholesaleEnquiry', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    submitWholesaleEnquiry: vi.fn(),
  }
})

beforeEach(() => {
  submitWholesaleEnquiry.mockReset()
  submitWholesaleEnquiry.mockResolvedValue({ ok: true })
})

afterEach(() => cleanup())

const fillRequired = () => {
  fireEvent.change(screen.getByLabelText(/^Name/), {
    target: { value: 'Asha Rao' },
  })
  fireEvent.change(screen.getByLabelText(/^Email/), {
    target: { value: 'asha@example.com' },
  })
  fireEvent.change(screen.getByLabelText(/^Phone \/ WhatsApp/), {
    target: { value: '+91 98407 50467' },
  })
  fireEvent.change(screen.getByLabelText(/^Products and quantities/), {
    target: { value: 'Arees 8ml roll-ons — 240 pieces' },
  })
  fireEvent.change(screen.getByLabelText(/^Delivery city/), {
    target: { value: 'Chennai' },
  })
}

describe('WholesaleEnquiryForm', () => {
  it('renders the B2B fields and a prefilled product request', () => {
    render(<WholesaleEnquiryForm initialProduct={'Product: Arees Oud\nRequested: 120 pieces'} />)
    expect(screen.getByRole('heading', { name: 'Tell us what you need a quote for' })).toBeTruthy()
    expect(screen.getByLabelText('Company / shop')).toBeTruthy()
    expect(screen.getByLabelText(/^GSTIN/)).toBeTruthy()
    expect(screen.getByLabelText('Buyer type')).toBeTruthy()
    expect(screen.getByLabelText(/^Products and quantities/).value).toContain(
      'Arees Oud'
    )
    expect(
      screen.getByRole('link', { name: 'Or send these details on WhatsApp' }).getAttribute('href')
    ).toContain('https://wa.me/919840750467')
  })

  it('blocks submission, shows field errors and focuses the first invalid field', async () => {
    render(<WholesaleEnquiryForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Send wholesale enquiry' }))

    expect(await screen.findByText('Please enter your name.')).toBeTruthy()
    expect(screen.getByText('Please enter your email address.')).toBeTruthy()
    expect(screen.getByText('Please enter your phone number.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText(/^Name/))
    expect(submitWholesaleEnquiry).not.toHaveBeenCalled()
  })

  it('submits valid details and shows the WhatsApp follow-up', async () => {
    render(<WholesaleEnquiryForm />)
    fillRequired()
    fireEvent.click(screen.getByRole('button', { name: 'Send wholesale enquiry' }))

    await waitFor(() => expect(submitWholesaleEnquiry).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('heading', { name: /Thank you/ })).toBeTruthy()
    const whatsapp = screen.getByRole('link', { name: 'Continue on WhatsApp' })
    expect(whatsapp.getAttribute('href')).toContain('https://wa.me/919840750467')
    expect(decodeURIComponent(whatsapp.getAttribute('href'))).toContain(
      'Products: Arees 8ml roll-ons — 240 pieces'
    )
  })

  it('keeps the entered details when Formspree fails', async () => {
    submitWholesaleEnquiry.mockRejectedValueOnce(
      new Error('Unable to send your message. Please try again.')
    )
    render(<WholesaleEnquiryForm />)
    fillRequired()
    fireEvent.click(screen.getByRole('button', { name: 'Send wholesale enquiry' }))

    expect(
      (await screen.findByRole('alert')).textContent
    ).toContain('Unable to send your message. Please try again.')
    expect(screen.getByLabelText(/^Products and quantities/).value).toContain(
      'Arees 8ml roll-ons'
    )
  })
})
