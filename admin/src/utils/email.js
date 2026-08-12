// ============================================================================
// Email validation (admin frontend UX mirror)
//
// The server holds the AUTHORITATIVE rules (server/src/utils/emailValidation.js
// with the full maintained disposable-domain blocklist) — this file only
// mirrors the format rules and a CURATED subset of well-known disposable
// domains so the admin UI can fail fast with friendly messages. The server
// always re-validates (employee create/update + login), so nothing here is a
// security boundary.
// ============================================================================

export const EMAIL_ERRORS = {
  invalid: 'Please enter a valid email address.',
  disposable:
    'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
}

const DISPOSABLE_SUBSET = [
  '10minutemail.com',
  '10minuteinbox.com',
  '20minutemail.com',
  '33mail.com',
  'anonbox.net',
  'burnermail.io',
  'discard.email',
  'dispostable.com',
  'dropmail.me',
  'emailfake.com',
  'emailondeck.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'inboxbear.com',
  'inboxkitten.com',
  'jetable.com',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailinator.net',
  'mailnesia.com',
  'mailtemp.net',
  'moakt.com',
  'mailsac.com',
  'sharklasers.com',
  'spamgourmet.com',
  'temp-mail.io',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'tempinbox.com',
  'throwaway.email',
  'throwawaymail.com',
  'trash-mail.com',
  'trashmail.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'yopmail.org',
]

const DISPOSABLE_SET = new Set(DISPOSABLE_SUBSET)

export function normalizeEmail(email) {
  const raw = String(email ?? '').trim()
  if (!raw) return null
  const at = raw.lastIndexOf('@')
  if (at <= 0 || at === raw.length - 1) return null
  const local = raw.slice(0, at)
  const domain = raw.slice(at + 1).toLowerCase()
  if (!local || !domain) return null
  return { local, domain, normalized: `${local}@${domain}` }
}

const LOCAL_PART_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/
const DOMAIN_LABEL_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

export function validateEmailSyntax(email) {
  const parsed = normalizeEmail(email)
  if (!parsed) return false
  const { local, domain } = parsed

  if (local.length > 64) return false
  if (!LOCAL_PART_RE.test(local)) return false
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false

  if (domain.length > 255) return false
  const labels = domain.split('.')
  if (labels.length < 2) return false
  for (const label of labels) {
    if (!label || label.length > 63 || !DOMAIN_LABEL_RE.test(label)) return false
  }
  const tld = labels[labels.length - 1]
  if (tld.length < 2 || !/[a-zA-Z]/.test(tld)) return false

  return true
}

export function isDisposableEmail(email) {
  const parsed = normalizeEmail(email)
  if (!parsed) return false
  const { domain } = parsed
  if (DISPOSABLE_SET.has(domain)) return true
  const labels = domain.split('.')
  if (labels.length > 2) {
    const registrable = labels.slice(-2).join('.')
    if (DISPOSABLE_SET.has(registrable)) return true
  }
  return false
}

// Returns the friendly error message, or null when the email is acceptable.
// `requiredMessage` lets callers keep their existing "Email is required." copy.
export function getEmailError(email, requiredMessage = '') {
  const parsed = normalizeEmail(email)
  if (!parsed) return requiredMessage || EMAIL_ERRORS.invalid
  if (!validateEmailSyntax(parsed.normalized)) return EMAIL_ERRORS.invalid
  if (isDisposableEmail(parsed.normalized)) return EMAIL_ERRORS.disposable
  return null
}
