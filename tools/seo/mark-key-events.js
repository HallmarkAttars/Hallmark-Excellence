// Mark generate_lead + purchase as GA4 key events (idempotent).
//
// Usage: node tools/seo/mark-key-events.js
//
// 1. Lists existing key events (works with any analyzer access).
// 2. Creates each missing key event via the Admin API — this REQUIRES the
//    key's service account to hold Editor (or lighter, per GA4 config) on
//    the property. On 403 it prints the exact GA4-UI fallback steps and
//    exits 2 without partial writes (only missing events get created).
//
// Zero dependencies; the key is never printed or committed.

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const PROPERTY_ID = require('../ga4/config').PROPERTY_ID
const WANTED = ['generate_lead', 'purchase']

// Prefer the Editor-capable account (ga4-key), fall back through the same
// candidates the read-only GA4 CLI uses.
const KEY_CANDIDATES = [
  process.env.GA4_KEY_PATH,
  path.join(__dirname, '..', 'ga4', 'key.json'),
  'C:/Users/acer/Desktop/ga4-key.json',
  'C:/Users/acer/Desktop/gsc-key.json',
].filter(Boolean)

const EDIT_SCOPE = 'https://www.googleapis.com/auth/analytics.edit'
const READ_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

function loadKeys() {
  const keys = []
  for (const candidate of KEY_CANDIDATES) {
    try {
      if (!fs.existsSync(candidate)) continue
      const key = JSON.parse(fs.readFileSync(candidate, 'utf8'))
      if (key.client_email && key.private_key) keys.push({ key, path: candidate })
    } catch {
      // next candidate
    }
  }
  if (keys.length === 0) throw new Error('No service-account key found: ' + KEY_CANDIDATES.join(', '))
  return keys
}

async function tokenFor(key, scope) {
  const base64url = (v) => Buffer.from(v).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: key.private_key_id }))
  const claims = base64url(JSON.stringify({
    iss: key.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    scope,
    iat: now,
    exp: now + 3600,
  }))
  const signer = crypto.createSign('RSA-SHA256')
  const jwt = `${header}.${claims}.${signer.update(`${header}.${claims}`).sign(key.private_key, 'base64url')}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const body = await res.json()
  if (!body.access_token) throw new Error('token exchange failed: ' + JSON.stringify(body))
  return body.access_token
}

// Try every key until one has permission for the call; report who succeeded.
async function firstAuthorized(keys, scope, attempt) {
  const errors = []
  for (const { key, path } of keys) {
    try {
      const token = await tokenFor(key, scope)
      const result = await attempt(token, key)
      console.log(`[auth] key: ${path} (${key.client_email})`)
      return result
    } catch (err) {
      errors.push(`${key.client_email}: ${err.message}`)
    }
  }
  throw new Error(errors.join('\n'))
}

async function main() {
  const keys = loadKeys()
  const base = `https://analyticsadmin.googleapis.com/v1beta/properties/${PROPERTY_ID}`

  // 1. Current state — any account that can read the property list works.
  const listJson = await firstAuthorized(keys, READ_SCOPE, async (token) => {
    const res = await fetch(`${base}/keyEvents`, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (!res.ok) throw new Error(`keyEvents list ${res.status}: ${(json.error && json.error.message) || ''}`)
    return json
  })
  const marked = listJson.keyEvents || []
  console.log('[state] currently marked:', marked.map((e) => e.eventName).join(', ') || '(none)')

  const missing = WANTED.filter(
    (name) => !marked.some((e) => e.eventName === name)
  )
  if (missing.length === 0) {
    console.log('[ok] all wanted key events already marked — nothing to do')
    return
  }

  // 2. Create missing events with the first account that can edit.
  for (const eventName of missing) {
    await firstAuthorized(keys, EDIT_SCOPE, async (token, key) => {
      const res = await fetch(`${base}/keyEvents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName, countingMethod: 'THRESHOLD_COUNTING' }),
      })
      if (res.ok) {
        console.log(`[ok] created key event: ${eventName}`)
        return true
      }
      const body = await res.json().catch(() => ({}))
      if (res.status === 403) {
        console.error(
          `[block] 403 marking "${eventName}" — none of the keys can write.\n` +
          `Fix A: GA4 Admin > Property access management > add the service account as Editor, then re-run.\n` +
          `Fix B (UI, 2 minutes): GA4 Admin > Events > ${eventName} > menu > "Mark as key event".`
        )
        process.exitCode = 2
        throw new Error('blocked') // stops the candidate loop; state preserved
      }
      throw new Error(`keyEvents create ${res.status}: ${(body.error && body.error.message) || ''}`)
    })
  }
  console.log('[done] re-run this script to confirm idempotency (should print "nothing to do")')
}

main().catch((err) => {
  console.error(`[error] ${err.message}`)
  process.exitCode = 1
})
