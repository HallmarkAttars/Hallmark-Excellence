// ============================================================================
// DNS host check for email domains (MX verification).
//
// IMPORTANT semantics:
//   - "Domain has an MX record" ≠ "the mailbox exists". This check is only a
//     cheap gate against fake/nonexistent domains; real mailbox ownership
//     requires a verification email/OTP flow.
//   - Fail-OPEN: transient DNS errors and timeouts PASS the domain, so a DNS
//     blip can never block a real checkout. Only an authoritative answer that
//     the domain does not exist (NXDOMAIN) rejects it.
//   - A/AAAA fallback: domains without MX records still receive mail on an
//     A record (common with small businesses), so they are accepted too.
//   - Results are cached in memory so repeated lookups are instant.
// ============================================================================

const dns = require('dns').promises

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
// Transient DNS failures cache for a short time so a brief resolver outage
// doesn't pin a wrong "pass" (or force repeated slow lookups).
const FAIL_OPEN_CACHE_TTL_MS = 10 * 60 * 1000
const RESOLVE_TIMEOUT_MS = 3000

const cache = new Map() // domain -> { result, expiresAt }

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        const err = new Error('DNS lookup timed out')
        err.code = 'ETIMEOUT'
        reject(err)
      }, ms)
      if (typeof timer.unref === 'function') timer.unref()
    }),
  ])
}

// `dnsImpl` and `now` are injectable for tests.
// Returns:
//   true  — domain has MX or A/AAAA records (or lookup failed transiently)
//   false — domain authoritatively does not exist (NXDOMAIN / no host records)
async function domainHasMailHosts(domain, { dnsImpl = dns, now = Date.now } = {}) {
  const key = String(domain || '').trim().toLowerCase()
  if (!key) return null

  const cached = cache.get(key)
  if (cached && cached.expiresAt > now()) return cached.result

  let result
  let failOpen = false

  try {
    const mx = await withTimeout(dnsImpl.resolveMx(key), RESOLVE_TIMEOUT_MS)
    result = mx.length > 0

    // No MX records — fall back to A/AAAA (some hosts run mail on an A record).
    if (!result) {
      const [a, aaaa] = await Promise.allSettled([
        withTimeout(dnsImpl.resolve4(key), RESOLVE_TIMEOUT_MS),
        withTimeout(dnsImpl.resolve6(key), RESOLVE_TIMEOUT_MS),
      ])
      result =
        (a.status === 'fulfilled' && a.value.length > 0) ||
        (aaaa.status === 'fulfilled' && aaaa.value.length > 0)
    }
  } catch (err) {
    // Authoritative "domain does not exist" (NXDOMAIN / no records at all).
    if (err && (err.code === 'ENOTFOUND' || err.code === 'EAI_NONAME' || err.code === 'ENODATA')) {
      result = false
    } else {
      // Transient failure or timeout — fail open (never block a real customer).
      result = true
      failOpen = true
    }
  }

  cache.set(key, {
    result,
    expiresAt: now() + (failOpen ? FAIL_OPEN_CACHE_TTL_MS : CACHE_TTL_MS),
  })
  return result
}

// Exposed for tests and operational scripts.
function clearMxCache() {
  cache.clear()
}

module.exports = { domainHasMailHosts, clearMxCache }
