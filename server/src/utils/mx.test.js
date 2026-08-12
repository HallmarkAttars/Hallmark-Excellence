// ============================================================================
// DNS host check — unit tests for server/src/utils/mx.js
//
// The resolver is injectable, so no real DNS is ever touched in tests.
// Run with:  npm test  (server)
// ============================================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { domainHasMailHosts, clearMxCache } from './mx'

beforeEach(() => {
  clearMxCache()
})

// Fake dns.promises-compatible resolver.
function fakeDns({ mx = [], a = [], aaaa = [], mxError = null, aError = null } = {}) {
  return {
    async resolveMx() {
      if (mxError) throw Object.assign(new Error(mxError.message), { code: mxError.code })
      return mx
    },
    async resolve4() {
      if (aError) throw Object.assign(new Error(aError.message), { code: aError.code })
      return a
    },
    async resolve6() {
      return aaaa
    },
  }
}

describe('domainHasMailHosts', () => {
  it('returns true when MX records exist', async () => {
    const dnsImpl = fakeDns({ mx: [{ exchange: 'mx1.real.com', priority: 10 }] })
    expect(await domainHasMailHosts('real.com', { dnsImpl })).toBe(true)
  })

  it('returns true when no MX but A records exist (A-hosted mail)', async () => {
    const dnsImpl = fakeDns({ mx: [], a: ['93.184.216.34'] })
    expect(await domainHasMailHosts('aonly.com', { dnsImpl })).toBe(true)
  })

  it('returns false when the domain authoritatively does not exist', async () => {
    const dnsImpl = fakeDns({ mx: [], mxError: { message: 'getaddrinfo ENOTFOUND', code: 'ENOTFOUND' } })
    expect(await domainHasMailHosts('nope.example', { dnsImpl })).toBe(false)
  })

  it('fails open on transient DNS errors', async () => {
    const dnsImpl = fakeDns({ mx: [], mxError: { message: 'queryA EAI_AGAIN', code: 'EAI_AGAIN' } })
    expect(await domainHasMailHosts('flaky.example', { dnsImpl })).toBe(true)
  })

  it('fails open on timeouts', async () => {
    const dnsImpl = fakeDns({ mx: [], mxError: { message: 'DNS lookup timed out', code: 'ETIMEOUT' } })
    expect(await domainHasMailHosts('slow.example', { dnsImpl })).toBe(true)
  })

  it('caches results and does not re-resolve within the TTL', async () => {
    let calls = 0
    const dnsImpl = fakeDns({ mx: [{ exchange: 'mx', priority: 10 }] })
    const counting = {
      async resolveMx() {
        calls += 1
        return dnsImpl.resolveMx()
      },
      async resolve4() {
        return []
      },
      async resolve6() {
        return []
      },
    }
    expect(await domainHasMailHosts('cached.com', { dnsImpl: counting })).toBe(true)
    expect(await domainHasMailHosts('cached.com', { dnsImpl: counting })).toBe(true)
    expect(calls).toBe(1)
  })
})
