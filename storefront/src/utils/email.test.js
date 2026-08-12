// ============================================================================
// Email validation (frontend mirror) — unit tests for storefront/src/utils/email.js
//
// Run with:  npm test  (storefront)
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
  EMAIL_ERRORS,
  normalizeEmail,
  validateEmailSyntax,
  isDisposableEmail,
  getEmailError,
} from './email'

describe('normalizeEmail', () => {
  it('trims and lowercases only the domain', () => {
    expect(normalizeEmail('  John.Doe@GMAIL.COM  ').normalized).toBe('John.Doe@gmail.com')
  })
  it('returns null for malformed splits', () => {
    expect(normalizeEmail('user')).toBeNull()
    expect(normalizeEmail('@gmail.com')).toBeNull()
    expect(normalizeEmail('user@')).toBeNull()
  })
})

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
      'contact@company.ai',
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
      'x@guerrillamail.com',
      'x@tempmail.com',
      'x@temp-mail.org',
      'x@yopmail.com',
      'x@throwaway.email',
      'x@getnada.com',
      'anything@mailinator.com',
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
    expect(getEmailError('student@university.edu')).toBeNull()
  })

  it('returns the friendly invalid message', () => {
    expect(getEmailError('user@domain..com')).toBe(EMAIL_ERRORS.invalid)
    expect(getEmailError('')).toBe(EMAIL_ERRORS.invalid)
  })

  it('uses the caller-provided required message for empty input', () => {
    expect(getEmailError('', 'Email is required.')).toBe('Email is required.')
  })

  it('returns the friendly disposable message', () => {
    expect(getEmailError('user@mailinator.com')).toBe(EMAIL_ERRORS.disposable)
  })
})
