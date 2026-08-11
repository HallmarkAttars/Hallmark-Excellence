// Admin JWT signing helper — unit tests for server/src/utils/authTokens.js.
// Covers the payload contract, the sliding 7-day expiry, and the re-issuance
// mechanic that powers sliding-session renewal. No Supabase, no I/O.
//
// Run with:  npm test  (server)

import { describe, expect, it, beforeAll } from 'vitest'
import jwt from 'jsonwebtoken'
import { signAdminToken, TOKEN_TTL } from './authTokens'

const ADMIN = {
  id: '3c46e939-d875-4a08-92b2-b5fff97b26c1',
  email: 'admin@example.com',
  name: 'Test Admin',
  role: 'admin',
}

describe('signAdminToken', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'unit-test-secret'
  })

  it('signs a token with the full admin payload', () => {
    const token = signAdminToken(ADMIN)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    expect(decoded.id).toBe(ADMIN.id)
    expect(decoded.email).toBe(ADMIN.email)
    expect(decoded.name).toBe(ADMIN.name)
    expect(decoded.role).toBe(ADMIN.role)
  })

  it('sets a 7-day expiry (sliding window)', () => {
    const token = signAdminToken(ADMIN)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const nowSec = Math.floor(Date.now() / 1000)
    const ttlSec = 7 * 24 * 3600
    // TTL constant is the single source of truth for the lifetime.
    expect(TOKEN_TTL).toBe('7d')
    expect(decoded.exp - decoded.iat).toBeGreaterThanOrEqual(ttlSec - 5)
    expect(decoded.exp).toBeGreaterThan(nowSec + ttlSec - 60)
  })

  it('re-issues a NEW token on each call — the sliding renewal mechanic', async () => {
    const first = signAdminToken(ADMIN)
    const d1 = jwt.verify(first, process.env.JWT_SECRET)
    // Each signature anchors the 7-day window to ITS OWN issue time, so a
    // later renewal rolls the window forward instead of freezing it at the
    // original login time. (Wait >1s so the iat/exp seconds actually move.)
    await new Promise((r) => setTimeout(r, 1100))
    const second = signAdminToken(ADMIN)
    const d2 = jwt.verify(second, process.env.JWT_SECRET)
    expect(d2.iat).toBeGreaterThan(d1.iat)
    expect(d2.exp).toBeGreaterThan(d1.exp)
  })

  it('tokens verify against the same secret (auth middleware contract)', () => {
    const token = signAdminToken(ADMIN)
    expect(() => jwt.verify(token, process.env.JWT_SECRET)).not.toThrow()
  })
})
