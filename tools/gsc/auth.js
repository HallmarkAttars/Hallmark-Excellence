// Google Search Console service-account auth (zero dependencies).
//
// Signs one RS256 JWT with the service-account private key and exchanges it
// for an access token at oauth2.googleapis.com. The key is NEVER printed and
// NEVER committed (see the .gitignore entries for tools/gsc/key.json).

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { SCOPE } = require('./config')

// Key discovery order — the first file that exists AND parses as a service
// account wins. The chosen path is printed once (path only, never contents).
const KEY_CANDIDATES = () => [
  process.env.GSC_KEY_PATH,
  path.join(__dirname, 'key.json'),
  'C:/Users/acer/Desktop/gsc-key.json',
  'C:/Users/acer/gsc-key.json',
  'C:/Users/acer/Downloads/gsc-key.json',
].filter(Boolean)

function loadKey() {
  const errors = []
  for (const candidate of KEY_CANDIDATES()) {
    try {
      if (!fs.existsSync(candidate)) continue
      const key = JSON.parse(fs.readFileSync(candidate, 'utf8'))
      if (!key.client_email || !key.private_key) {
        errors.push(`${candidate}: not a service-account JSON (missing client_email/private_key)`)
        continue
      }
      return { key, path: candidate }
    } catch (err) {
      errors.push(`${candidate}: ${err.message}`)
    }
  }
  const searched = KEY_CANDIDATES().join(', ')
  throw new Error(
    `No GSC service-account key found.\nSearched: ${searched}\n` +
      (errors.length ? `Problems:\n  ${errors.join('\n  ')}\n` : '') +
      `Fix: copy the JSON key from Google Cloud Console to one of those paths\n` +
      `or set the GSC_KEY_PATH environment variable. NEVER commit the key.`
  )
}

function base64url(value) {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')
}

async function getAccessToken() {
  const { key, path: keyPath } = loadKey()
  const now = Math.floor(Date.now() / 1000)
  const header = base64url({ alg: 'RS256', typ: 'JWT', kid: key.private_key_id })
  const claims = base64url({
    iss: key.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(`${header}.${claims}`)
    .sign(key.private_key)
    .toString('base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  })
  const body = await res.json()
  if (!res.ok || !body.access_token) {
    throw new Error(`Token exchange failed (${res.status}): ${JSON.stringify(body)}`)
  }
  console.log(`[auth] using key: ${keyPath}`)
  return body.access_token
}

function authedFetch(accessToken) {
  return async (url, options = {}) => {
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` }
    return fetch(url, { ...options, headers })
  }
}

module.exports = { getAccessToken, authedFetch, loadKey }
