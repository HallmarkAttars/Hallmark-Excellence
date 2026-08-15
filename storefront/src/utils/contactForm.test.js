// ============================================================================
// Contact form → Formspree submission — unit tests
//   storefront/src/utils/contactForm.js
//
// Covers the contract the Contact page relies on:
//   - buildContactPayload: EXACTLY {name, email, phone, message}, trimmed,
//     and never leaks extra keys from the caller's object.
//   - submitContactForm: POSTs to the one Formspree endpoint, resolves only on
//     a genuine 2xx (res.ok), and throws the friendly message on any non-OK
//     response or network failure — so the caller can keep the user's input.
//   - failure never mutates the caller's values (input is preserved for retry).
//
// fetch is injected — no network is ever touched in these tests.
//
// Run with:  npm test  (storefront)
// ============================================================================

import { describe, expect, it, vi } from 'vitest'
import {
  FORMSPREE_ENDPOINT,
  FORMSPREE_ERROR_MESSAGE,
  buildContactPayload,
  submitContactForm,
} from './contactForm'

// A minimal Response-shaped object — only `ok` is consumed by the helper.
const response = (ok) => ({ ok })

describe('buildContactPayload — exact payload shape', () => {
  it('returns exactly the four contact fields', () => {
    expect(
      buildContactPayload({ name: 'A', email: 'B', phone: 'C', message: 'D' })
    ).toEqual({ name: 'A', email: 'B', phone: 'C', message: 'D' })
  })

  it('trims whitespace from every field', () => {
    expect(
      buildContactPayload({
        name: '  Test Customer  ',
        email: '  a@b.com  ',
        phone: ' 9876543210 ',
        message: '  hello  ',
      })
    ).toEqual({ name: 'Test Customer', email: 'a@b.com', phone: '9876543210', message: 'hello' })
  })

  it('never leaks extra keys from the caller object (no cart/order/auth data)', () => {
    const payload = buildContactPayload({
      name: 'A',
      email: 'B',
      phone: 'C',
      message: 'D',
      // Anything extra must be dropped — these would be a data-leak bug.
      cart: [{ id: 'x' }],
      orders: ['o1'],
      idempotencyKey: 'secret-key',
      total: 9999,
    })
    expect(Object.keys(payload)).toEqual(['name', 'email', 'phone', 'message'])
    expect(payload).toEqual({ name: 'A', email: 'B', phone: 'C', message: 'D' })
  })

  it('defaults missing fields to empty strings instead of undefined', () => {
    expect(buildContactPayload({ name: 'A' })).toEqual({
      name: 'A',
      email: '',
      phone: '',
      message: '',
    })
  })

  it('handles a missing/empty argument safely', () => {
    expect(buildContactPayload()).toEqual({ name: '', email: '', phone: '', message: '' })
    expect(buildContactPayload(null)).toEqual({ name: '', email: '', phone: '', message: '' })
  })
})

describe('submitContactForm — request contract', () => {
  it('POSTs the exact payload to the exact Formspree endpoint', async () => {
    const fetchImpl = vi.fn(async () => response(true))
    await submitContactForm({ name: 'A', email: 'B', phone: 'C', message: 'D' }, fetchImpl)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, options] = fetchImpl.mock.calls[0]
    expect(url).toBe(FORMSPREE_ENDPOINT)
    expect(url).toBe('https://formspree.io/f/mjybybdy')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ name: 'A', email: 'B', phone: 'C', message: 'D' })
  })

  it('sends JSON content + accept headers', async () => {
    const fetchImpl = vi.fn(async () => response(true))
    await submitContactForm({}, fetchImpl)
    const options = fetchImpl.mock.calls[0][1]
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers.Accept).toBe('application/json')
  })
})

describe('submitContactForm — res.ok gating', () => {
  it('resolves on a genuine 2xx (res.ok = true)', async () => {
    await expect(submitContactForm({ name: 'A' }, vi.fn(async () => response(true)))).resolves.toEqual({ ok: true })
  })

  it('throws the friendly message on a non-OK response (e.g. Formspree 500)', async () => {
    await expect(
      submitContactForm({ name: 'A' }, vi.fn(async () => response(false)))
    ).rejects.toThrow(FORMSPREE_ERROR_MESSAGE)
  })

  it('throws the friendly message on any non-OK status, not just 500', async () => {
    for (const status of [400, 404, 429, 500, 502]) {
      const fetchImpl = vi.fn(async () => ({ ok: false, status }))
      await expect(submitContactForm({}, fetchImpl)).rejects.toThrow(FORMSPREE_ERROR_MESSAGE)
    }
  })

  it('throws the friendly message on a network failure (fetch rejects)', async () => {
    await expect(
      submitContactForm({}, vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    ).rejects.toThrow(FORMSPREE_ERROR_MESSAGE)
  })

  it('never reports success when fetch is missing (e.g. SSR/defensive)', async () => {
    // null (NOT undefined) — undefined would trigger the default parameter
    // and fall back to the real global fetch, hitting the network.
    await expect(submitContactForm({}, null)).rejects.toThrow(FORMSPREE_ERROR_MESSAGE)
  })

  it('throws the friendly message when a broken fetch resolves to a non-Response', async () => {
    // A malformed impl resolving to undefined/null must never surface a raw
    // TypeError to the user — always the friendly message.
    await expect(submitContactForm({}, vi.fn(async () => undefined))).rejects.toThrow(FORMSPREE_ERROR_MESSAGE)
    await expect(submitContactForm({}, vi.fn(async () => null))).rejects.toThrow(FORMSPREE_ERROR_MESSAGE)
  })
})

describe('submitContactForm — failure preserves the caller input', () => {
  it('does not mutate the caller values object on success', async () => {
    const values = { name: 'A', email: 'B', phone: 'C', message: 'D' }
    const snapshot = { ...values }
    await submitContactForm(values, vi.fn(async () => response(true)))
    expect(values).toEqual(snapshot)
  })

  it('does not mutate the caller values object on failure (input kept for retry)', async () => {
    const values = { name: 'Test Customer', email: 'a@b.com', phone: '9876543210', message: 'keep me' }
    const snapshot = { ...values }
    await expect(
      submitContactForm(values, vi.fn(async () => response(false)))
    ).rejects.toThrow(FORMSPREE_ERROR_MESSAGE)
    expect(values).toEqual(snapshot)
  })

  it('throws a message the page shows verbatim (error state contract)', async () => {
    // The Contact page sets the thrown message as the visible error.
    expect(FORMSPREE_ERROR_MESSAGE).toBe('Unable to send your message. Please try again.')
  })
})
