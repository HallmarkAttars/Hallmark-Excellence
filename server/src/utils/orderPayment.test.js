// Payment-method mapping + payment-status validation — unit tests for
// server/src/utils/orderPayment.js (the pure helpers the orders controller
// uses for createOrder and updatePaymentStatus). No Supabase, no I/O.
//
// Run with:  npm test  (server)

import { describe, expect, it } from 'vitest'
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  resolvePaymentMethod,
  resolvePaymentStatus,
} from './orderPayment.js'

describe('resolvePaymentMethod', () => {
  it('maps the canonical codes to their display labels', () => {
    expect(resolvePaymentMethod('cod')).toEqual({ code: 'cod', label: 'Cash on Delivery' })
    expect(resolvePaymentMethod('upi')).toEqual({ code: 'upi', label: 'UPI / Online Payment' })
  })

  it('matches case-insensitively and trims surrounding whitespace', () => {
    expect(resolvePaymentMethod('COD')).toEqual({ code: 'cod', label: 'Cash on Delivery' })
    expect(resolvePaymentMethod('Upi')).toEqual({ code: 'upi', label: 'UPI / Online Payment' })
    expect(resolvePaymentMethod(' UPI ')).toEqual({ code: 'upi', label: 'UPI / Online Payment' })
  })

  it('defaults to Cash on Delivery when the value is missing', () => {
    expect(resolvePaymentMethod(undefined)).toEqual({ code: 'cod', label: 'Cash on Delivery' })
    expect(resolvePaymentMethod(null)).toEqual({ code: 'cod', label: 'Cash on Delivery' })
    expect(resolvePaymentMethod('')).toEqual({ code: 'cod', label: 'Cash on Delivery' })
    expect(resolvePaymentMethod('   ')).toEqual({ code: 'cod', label: 'Cash on Delivery' })
  })

  it('falls back to Cash on Delivery for unknown values — no other payment methods are ever accepted', () => {
    // There is no gateway, so only cod/upi may ever resolve; anything else
    // must never leak into the stored payment_method as a real label.
    expect(resolvePaymentMethod('credit')).toEqual({ code: 'cod', label: 'Cash on Delivery' })
    expect(resolvePaymentMethod('card')).toEqual({ code: 'cod', label: 'Cash on Delivery' })
    expect(resolvePaymentMethod('paypal')).toEqual({ code: 'cod', label: 'Cash on Delivery' })
    expect(resolvePaymentMethod('netbanking')).toEqual({ code: 'cod', label: 'Cash on Delivery' })
  })

  it('exposes exactly the two supported methods with distinct labels', () => {
    expect(PAYMENT_METHODS).toEqual({ cod: 'Cash on Delivery', upi: 'UPI / Online Payment' })
    expect(PAYMENT_METHODS.cod).not.toBe(PAYMENT_METHODS.upi)
  })
})

describe('resolvePaymentStatus', () => {
  it('accepts the canonical staff statuses', () => {
    expect(resolvePaymentStatus('Pending')).toBe('Pending')
    expect(resolvePaymentStatus('Paid')).toBe('Paid')
  })

  it('matches case-insensitively and trims surrounding whitespace', () => {
    expect(resolvePaymentStatus('pending')).toBe('Pending')
    expect(resolvePaymentStatus('PAID')).toBe('Paid')
    expect(resolvePaymentStatus(' Paid ')).toBe('Paid')
  })

  it('rejects anything that is not Pending/Paid', () => {
    // New orders always start Pending; nothing is ever auto-paid (no gateway),
    // so values like the legacy 'Cash On Delivery' status must be rejected.
    expect(resolvePaymentStatus(undefined)).toBeNull()
    expect(resolvePaymentStatus(null)).toBeNull()
    expect(resolvePaymentStatus('')).toBeNull()
    expect(resolvePaymentStatus('unpaid')).toBeNull()
    expect(resolvePaymentStatus('Cash On Delivery')).toBeNull()
    expect(resolvePaymentStatus('Processing')).toBeNull()
    expect(resolvePaymentStatus('paid-extra')).toBeNull()
  })

  it('exposes the canonical statuses in the order the UI expects', () => {
    expect(PAYMENT_STATUSES).toEqual(['Pending', 'Paid'])
  })
})
