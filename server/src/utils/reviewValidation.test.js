// Unit tests for the pure review-submission validator used by
// POST /api/reviews. No Supabase, no Express, no environment keys — the
// validator module is import-free by design.
//
// Run with:  npm test  (server)

import { describe, expect, it } from 'vitest'
import {
  validateReviewSubmission,
  normalizeIndianPhone,
  normalizeStoredPhone,
  normalizeOrderId,
  MAX_TEXT_LENGTH,
} from './reviewValidation'

describe('normalizeIndianPhone', () => {
  it.each([
    ['9876543210', '9876543210'],
    ['+919876543210', '9876543210'],
    ['+91 98765 43210', '9876543210'],
    ['91-9876543210', '9876543210'],
    ['98765432101', ''],
    ['not-a-phone', ''],
    ['', ''],
  ])('normalizes %s → %s', (raw, expected) => {
    expect(normalizeIndianPhone(raw)).toBe(expected)
  })
})

describe('normalizeStoredPhone (stored E.164/legacy formats match search)', () => {
  it.each([
    ['+919876543210', '9876543210'],
    ['9876543210', '9876543210'],
    ['919876543210', '9876543210'],
    ['+449876543210', ''],
  ])('stored %s → %s', (raw, expected) => {
    expect(normalizeStoredPhone(raw)).toBe(expected)
  })
})

describe('normalizeOrderId', () => {
  it('strips # and is case-insensitive', () => {
    expect(normalizeOrderId('#ord-592546')).toBe('ORD-592546')
  })
})

describe('validateReviewSubmission', () => {
  const valid = {
    orderId: 'ORD-592546',
    phone: '+91 98765 43210',
    rating: 5,
    reviewText: 'Excellent attar, fast delivery.',
    consentShow: true,
  }

  it('accepts a valid submission and normalizes fields', () => {
    const r = validateReviewSubmission(valid)
    expect(r.ok).toBe(true)
    expect(r.orderNumber).toBe('ORD-592546')
    expect(r.phone).toBe('9876543210')
    expect(r.rating).toBe(5)
    expect(r.reviewText).toBe('Excellent attar, fast delivery.')
    expect(r.consentShow).toBe(true)
  })

  it('accepts a star-only review (text and consent optional)', () => {
    const r = validateReviewSubmission({ orderId: 'ORD-1234', phone: '9876543210', rating: 4 })
    expect(r.ok).toBe(true)
    expect(r.reviewText).toBeNull()
    expect(r.consentShow).toBe(false)
  })

  it.each([
    ['missing rating', { ...valid, rating: undefined }],
    ['rating 0', { ...valid, rating: 0 }],
    ['rating 6', { ...valid, rating: 6 }],
    ['rating "3.5"', { ...valid, rating: 3.5 }],
  ])('rejects %s', (_label, body) => {
    expect(validateReviewSubmission(body).ok).toBe(false)
  })

  it.each([
    ['missing order number', { ...valid, orderId: undefined }],
    ['garbage order number', { ...valid, orderId: 'hello' }],
    ['missing phone', { ...valid, phone: '123' }],
  ])('rejects %s', (_label, body) => {
    expect(validateReviewSubmission(body).ok).toBe(false)
  })

  it('rejects text over the limit', () => {
    expect(
      validateReviewSubmission({
        ...valid,
        reviewText: 'a'.repeat(MAX_TEXT_LENGTH + 1),
      }).ok
    ).toBe(false)
  })

  it('does not treat truthy consent strings as consent', () => {
    expect(validateReviewSubmission({ ...valid, consentShow: 'yes' }).consentShow).toBe(false)
  })
})
