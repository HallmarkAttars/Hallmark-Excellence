// ============================================================================
// Centralized email validation — unit tests for server/src/utils/emailValidation.js
//
// Run with:  npm test  (server)
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
  EMAIL_ERRORS,
  normalizeEmail,
  validateEmailSyntax,
  isDisposableEmail,
  validateEmail,
  validateEmailWithHost,
} from './emailValidation'

describe('normalizeEmail', () => {
  it('trims whitespace and lowercases only the domain', () => {
    expect(normalizeEmail('  John.Doe@GMAIL.COM  ')).toEqual({
      local: 'John.Doe',
      domain: 'gmail.com',
      normalized: 'John.Doe@gmail.com',
    })
  })

  it('preserves the local part exactly as typed', () => {
    expect(normalizeEmail('Support@Company.co.in')).toEqual({
      local: 'Support',
      domain: 'company.co.in',
      normalized: 'Support@company.co.in',
    })
  })

  it('returns null for values without a valid @ split', () => {
    expect(normalizeEmail('')).toBeNull()
    expect(normalizeEmail('user')).toBeNull()
    expect(normalizeEmail('user@')).toBeNull()
    expect(normalizeEmail('@gmail.com')).toBeNull()
    expect(normalizeEmail(undefined)).toBeNull()
    expect(normalizeEmail(null)).toBeNull()
  })
})

describe('validateEmailSyntax — valid emails', () => {
  const valid = [
    'user@gmail.com',
    'john.doe@gmail.com',
    'sales@company.com',
    'support@company.co.in',
    'admin@business.org',
    'hello@startup.io',
    'student@university.edu',
    'contact@company.ai',
    'User+tag@example.com',
    'a-b_c.d@example-domain.org',
    'x@sub.example.co.uk',
  ]
  it.each(valid)('accepts %s', (email) => {
    expect(validateEmailSyntax(email)).toBe(true)
  })
})

describe('validateEmailSyntax — invalid emails', () => {
  const invalid = [
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
    'user@-domain.com',
    'user@domain-.com',
    'user@123',
    'user@.com',
    'plain address',
  ]
  it.each(invalid)('rejects %s', (email) => {
    expect(validateEmailSyntax(email)).toBe(false)
  })
})

describe('isDisposableEmail', () => {
  const disposable = [
    'user@mailinator.com',
    'x@10minutemail.com',
    'x@guerrillamail.com',
    'x@tempmail.com',
    'x@temp-mail.org',
    'x@yopmail.com',
    'x@throwaway.email',
    'x@getnada.com',
    // Subdomain trick on a blocklisted registrable domain.
    'anything@mailinator.com',
  ]
  it.each(disposable)('rejects %s', (email) => {
    expect(isDisposableEmail(email)).toBe(true)
  })

  it('accepts legitimate providers and domains', () => {
    for (const email of [
      'user@gmail.com',
      'sales@company.com',
      'support@company.co.in',
      'student@university.edu',
      'hello@startup.io',
    ]) {
      expect(isDisposableEmail(email)).toBe(false)
    }
  })

  it('is safe for invalid input', () => {
    expect(isDisposableEmail('')).toBe(false)
    expect(isDisposableEmail('user')).toBe(false)
    expect(isDisposableEmail(null)).toBe(false)
  })
})

describe('validateEmail — combined syntax + disposable', () => {
  it('returns null (valid) for legitimate addresses', () => {
    expect(validateEmail('user@gmail.com')).toBeNull()
    expect(validateEmail('support@company.co.in')).toBeNull()
    expect(validateEmail('student@university.edu')).toBeNull()
  })

  it('returns the friendly invalid-format message', () => {
    expect(validateEmail('user')).toBe(EMAIL_ERRORS.invalid)
    expect(validateEmail('user@domain..com')).toBe(EMAIL_ERRORS.invalid)
  })

  it('returns the friendly disposable message before any other', () => {
    expect(validateEmail('user@mailinator.com')).toBe(EMAIL_ERRORS.disposable)
  })
})

describe('validateEmailWithHost', () => {
  const host = async (domain) => domain === 'real.com'

  it('rejects syntax and disposable before consulting DNS', async () => {
    const spy = { calls: 0, async fn(domain) { spy.calls += 1; return true } }
    expect(await validateEmailWithHost('not-an-email', spy.fn)).toBe(EMAIL_ERRORS.invalid)
    expect(await validateEmailWithHost('user@mailinator.com', spy.fn)).toBe(EMAIL_ERRORS.disposable)
    expect(spy.calls).toBe(0)
  })

  it('rejects a domain that authoritatively has no host', async () => {
    expect(await validateEmailWithHost('user@fake.nonexistent.com', host)).toBe(EMAIL_ERRORS.noHost)
  })

  it('accepts when the domain has hosts', async () => {
    expect(await validateEmailWithHost('user@real.com', host)).toBeNull()
  })
})
