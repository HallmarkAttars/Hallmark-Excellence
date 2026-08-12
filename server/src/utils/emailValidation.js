// ============================================================================
// Centralized email validation — the ONE source of truth on the server.
//
// Every endpoint that accepts an email (checkout, employee accounts, admin
// login, order emails) MUST go through validateEmail() here — never inline
// regexes — so the rules stay consistent project-wide.
//
// Layers (in order):
//   1. Normalize  — trim, lowercase the DOMAIN only (the local part is kept
//                   exactly as typed — Gmail-style local-part case is valid).
//   2. Syntax     — RFC-aware format check: local-part rules + domain label
//                   rules + TLD rules. No provider whitelist: ANY legitimate
//                   domain (gmail, company.co.in, university.edu, startup.io
//                   …) passes.
//   3. Disposable — maintained blocklist (disposable-email-domains npm
//                   package, refreshed on deploy) plus a small supplemental
//                   set for well-known providers the package misses.
//
// DNS/MX verification lives in ./mx.js (validateEmailWithHost) and is applied
// only to important workflows (checkout), never to every call.
// ============================================================================

const disposableDomains = require('disposable-email-domains')

// Friendly, non-internal error messages (never leak validation details).
const EMAIL_ERRORS = {
  invalid: 'Please enter a valid email address.',
  disposable:
    'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
  noHost:
    'This email domain does not appear to exist. Please double-check your email address.',
}

// Supplemental blocklist — well-known disposable providers that the npm
// package misses. Kept tiny and explicit; the package remains the primary
// (and auto-updated) source.
const EXTRA_DISPOSABLE_DOMAINS = [
  '10minutemail.com',
  'getnada.com',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
]

const DISPOSABLE_SET = new Set(
  (Array.isArray(disposableDomains) ? disposableDomains : [])
    .concat(EXTRA_DISPOSABLE_DOMAINS)
    .map((d) => String(d).toLowerCase())
)

// --------------------------------------------------------------------------
// Normalization
// --------------------------------------------------------------------------
// Returns { local, domain, normalized } or null when the email has no @ or an
// empty local/domain. `normalized` = local as typed + lowercased domain, which
// is the consistently-stored form.
function normalizeEmail(email) {
  const raw = String(email ?? '').trim()
  if (!raw) return null
  const at = raw.lastIndexOf('@')
  if (at <= 0 || at === raw.length - 1) return null
  const local = raw.slice(0, at)
  const domain = raw.slice(at + 1).toLowerCase()
  if (!local || !domain) return null
  return { local, domain, normalized: `${local}@${domain}` }
}

// --------------------------------------------------------------------------
// Syntax
// --------------------------------------------------------------------------
const LOCAL_PART_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/
const DOMAIN_LABEL_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

function validateEmailSyntax(email) {
  const parsed = normalizeEmail(email)
  if (!parsed) return false

  const { local, domain } = parsed

  // Local part — RFC 5321 allows 1–64 characters; no leading/trailing dot,
  // no consecutive dots, no whitespace (the character class excludes it).
  if (local.length > 64) return false
  if (!LOCAL_PART_RE.test(local)) return false
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false

  // Domain — dotted labels, each 1–63 chars, alphanumeric with inner hyphens
  // only, never leading/trailing hyphens, never consecutive dots.
  if (domain.length > 255) return false
  const labels = domain.split('.')
  if (labels.length < 2) return false
  for (const label of labels) {
    if (!label || label.length > 63 || !DOMAIN_LABEL_RE.test(label)) return false
  }

  // TLD — must look like a real TLD: at least 2 chars and contain a letter
  // (rules out IP-style and numeric-only suffixes).
  const tld = labels[labels.length - 1]
  if (tld.length < 2 || !/[a-zA-Z]/.test(tld)) return false

  return true
}

// --------------------------------------------------------------------------
// Disposable / temporary providers
// --------------------------------------------------------------------------
function isDisposableEmail(email) {
  const parsed = normalizeEmail(email)
  if (!parsed) return false
  const { domain } = parsed

  if (DISPOSABLE_SET.has(domain)) return true

  // Subdomain tricks (e.g. `anything.mailinator.com`) — compare the last two
  // labels when the domain has more than two. Only matches if that registrable
  // domain is itself on the blocklist, so legitimate subdomains are unaffected.
  const labels = domain.split('.')
  if (labels.length > 2) {
    const registrable = labels.slice(-2).join('.')
    if (DISPOSABLE_SET.has(registrable)) return true
  }

  return false
}

// --------------------------------------------------------------------------
// Combined validation
// --------------------------------------------------------------------------
// Synchronous syntax + disposable check. Returns the friendly error string or
// null when the email is acceptable (callers turn null into success).
function validateEmail(email) {
  if (!validateEmailSyntax(email)) return EMAIL_ERRORS.invalid
  if (isDisposableEmail(email)) return EMAIL_ERRORS.disposable
  return null
}

// Async variant — adds the DNS host check (domain must have MX or A/AAAA
// records). Fail-open on DNS errors/timeouts: only an authoritative
// "domain does not exist" rejects the email.
async function validateEmailWithHost(email, domainHasMailHosts) {
  const syntaxError = validateEmail(email)
  if (syntaxError) return syntaxError

  const parsed = normalizeEmail(email)
  if (!parsed) return EMAIL_ERRORS.invalid

  const hasHost = await domainHasMailHosts(parsed.domain)
  if (hasHost === false) return EMAIL_ERRORS.noHost

  return null
}

module.exports = {
  EMAIL_ERRORS,
  normalizeEmail,
  validateEmailSyntax,
  isDisposableEmail,
  validateEmail,
  validateEmailWithHost,
}
