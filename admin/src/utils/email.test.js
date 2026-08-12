// ============================================================================
// Email validation (admin mirror) — unit tests for admin/src/utils/email.js
//
// Run with:  npm test  (admin)
// ============================================================================

import { describe, expect, it } from 'vitest'
import { EMAIL_ERRORS, validateEmailSyntax, isDisposableEmail, getEmailError } from './email'

describe('validateEmailSyntax', () => {
  it('accepts legitimate formats across providers/domains', () => {
    for (const email of [
      'user@gmail.com',
      'john.doe@gmail.com',
      'sales@company.com',
      'support@company.co.in',
      'admin@business.org',
      'hello@startup.io',
      'student@university.edu',
    ]) {
      expect(validateEmailSyntax(email)).toBe(true)
    }
  })

  it('rejects malformed emails', () => {
    for (const email of [
      'user',
      'user@',
      '@gmail.com',
      'user@gmail',
      'user..name@gmail.com',
      '.user@gmail.com',
      'user.@gmail.com',
      'user @gmail.com',
      'user@.com',
      'user@domain.',
      'user@domain..com',
    ]) {
      expect(validateEmailSyntax(email)).toBe(false)
    }
  })
})

describe('isDisposableEmail', () => {
  it('rejects known disposable providers', () => {
    for (const email of [
      'user@mailinator.com',
      'x@10minutemail.com',
      'x@tempmail.com',
      'x@yopmail.com',
      'x@throwaway.email',
      'x@getnada.com',
    ]) {
      expect(isDisposableEmail(email)).toBe(true)
    }
  })

  it('accepts legitimate domains', () => {
    for (const email of ['user@gmail.com', 'support@company.co.in', 'student@university.edu']) {
      expect(isDisposableEmail(email)).toBe(false)
    }
  })
})

describe('getEmailError', () => {
  it('returns null for valid emails', () => {
    expect(getEmailError('user@gmail.com')).toBeNull()
    expect(getEmailError('admin@business.org')).toBeNull()
  })

  it('returns friendly messages', () => {
    expect(getEmailError('user@domain..com')).toBe(EMAIL_ERRORS.invalid)
    expect(getEmailError('')).toBe(EMAIL_ERRORS.invalid)
    expect(getEmailError('', 'Email is required.')).toBe('Email is required.')
    expect(getEmailError('user@mailinator.com')).toBe(EMAIL_ERRORS.disposable)
  })
})
