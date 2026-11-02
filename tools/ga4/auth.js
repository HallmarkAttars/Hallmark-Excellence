// GA4 service-account auth (zero dependencies, mirrors tools/gsc/auth.js).
//
// Signs one RS256 JWT with the service-account private key and exchanges it
// for an access token scoped to READ-ONLY Analytics access. The key file is
// NEVER printed and NEVER committed (see .gitignore: tools/ga4/key.json).
//
// Key discovery: the first file that exists AND parses as a service account
// wins. The path is printed once (path only, never contents).

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const KEY_CANDIDATES = () => [
  process.env.GA4_KEY_PATH,
  path.join(__dirname, 'key.json'),
  'C:/Users/acer/Desktop/ga4-key.json',
  'C:/Users/acer/Desktop/gsc-key.json',
  'C:/Users/acer/ga4-key.json',
  'C:/Users/acer/Downloads/ga4-key.json',
].filter(Boolean)

function loadKey() {
  const errors = []
  for (const candidate of KEY_CANDIDATES()) {
    try {
      if (!fs.existsSync(candidate)) continue
      const key = JSON.parse(fs.readFileSync(candidate, 'utf8'))
      if (!key.client_email || !key.private_key) {
        errors.push(`${candidate}: not a service-account JSON`)
        continue
      }
      return { key, path: candidate }
    } catch (err) {
      errors.push(`${candidate}: ${err.message}`)
    }
  }
  throw new Error(
    `No GA4 service-account key found.\nSearched: ${KEY_CANDIDATES().join(', ')}\n` +
    (errors.length ? `Problems:\n  ${errors.join('\n')}\n` : '') +
    `Fix: put the service-account JSON at one of those paths or set GA4_KEY_PATH.\n` +
    `\nNOTE: the account behind that key must be a Viewer/Editor on the GA4\n` +
    `property (GA4 Admin > Property access management). Status tests both\n` +
    `candidates and falls back automatically on 403.`
  )
}

const TOKEN_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

function base64url(value) {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')
}

async function tokenForKeyFile(keyPath) {
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const header = base64url({ alg: 'RS256', typ: 'JWT', kid: key.private_key_id })
  const claims = base64url({
    iss: key.client_email,
    scope: TOKEN_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(header + '.' + claims)
  const jwt = `${header}.${claims}.${signer.sign(key.private_key, 'base64url')}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  return res.json()
}

// Tries each key candidate until one yields a token that can actually read
// the configured property. Prints only paths and emails, never secrets.
async function getStatus() {
  const config = require('./config')
  const errors = []
  for (const candidate of KEY_CANDIDATES()) {
    if (!fs.existsSync(candidate)) continue
    try {
      const json = await tokenForKeyFile(candidate)
      if (!json.access_token) {
        errors.push(`${candidate}: token exchange failed -> ${json.error_description || json.error || 'unknown'}`)
        continue
      }
      // Read the property to prove access (cheap minimal report).
      const probe = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${config.PROPERTY_ID}:runReport`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${json.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
          metrics: [{ name: 'totalUsers' }],
          limit: 1,
        }),
      })
      if (probe.ok) {
        const email = JSON.parse(fs.readFileSync(candidate, 'utf8')).client_email
        console.log(`[auth] key: ${candidate} (${email})`)
        console.log(`[ok] property ${config.PROPERTY_ID} is readable`)
        return { token: json.access_token, path: candidate, property: config.PROPERTY_ID }
      }
      const body = await probe.json().catch(() => ({}))
      errors.push(`${candidate}: property ${config.PROPERTY_ID} not readable -> ${probe.status} ${(body.error && body.error.message) || ''}`)
    } catch (err) {
      errors.push(`${candidate}: ${err.message}`)
    }
  }
  throw new Error(
    `No working GA4 key.\n` + errors.map((e) => `  - ${e}`).join('\n') +
    `\nFix: open GA4 Admin > Property access management and add the\n` +
    `service-account email as a Viewer (or use a key whose account already has access).`
  )
}

module.exports = { getStatus }
