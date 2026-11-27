// Cloudflare Pages Functions adapter.
//
// The storefront's SEO/API handlers in `../api/` were written for the Vercel
// (and Netlify) Node-style `(req, res)` contract. This module translates a
// Workers Fetch `Request` into that contract and converts the collected
// response back into a Fetch `Response`, so the exact same handler code runs on
// Cloudflare without forking it.

import { Buffer } from 'node:buffer'

const SECURITY_HEADERS = {
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'cross-origin-opener-policy': 'same-origin',
  'content-security-policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
}

function toBuffer(chunk) {
  if (chunk === undefined || chunk === null) return null
  if (typeof chunk === 'string') return Buffer.from(chunk)
  if (chunk instanceof ArrayBuffer) return Buffer.from(chunk)
  if (ArrayBuffer.isView(chunk)) return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)
  return Buffer.from(String(chunk))
}

// Cloudflare populates `process.env` from text/JSON bindings when
// `nodejs_compat` is on (default for compatibility dates >= 2025-04-01). Assign
// per request as a fallback so request-time reads also work when the flag is
// disabled or a value is only present on `context.env`.
function installEnv(env) {
  if (typeof process === 'undefined') return
  try {
    if (!process.env) process.env = {}
    for (const [key, value] of Object.entries(env || {})) {
      if (typeof value === 'string') process.env[key] = value
    }
  } catch {
    // `process.env` can be frozen on some runtimes; the populate flag covers it.
  }
}

export async function toNodeRequest(request, extraQuery = {}) {
  const url = new URL(request.url)

  const headers = {}
  for (const [key, value] of request.headers.entries()) {
    headers[key.toLowerCase()] = value
  }
  // Workers do not always expose the pseudo host header; the SEO handlers rely
  // on it to resolve the canonical origin and the HTML shell.
  if (!headers.host) headers.host = url.host
  if (!headers['x-forwarded-host']) headers['x-forwarded-host'] = url.host
  if (!headers['x-forwarded-proto']) headers['x-forwarded-proto'] = url.protocol.replace(':', '')

  const query = Object.fromEntries(url.searchParams.entries())
  Object.assign(query, extraQuery)

  let body = null
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const buffer = Buffer.from(await request.arrayBuffer())
    if (buffer.length) body = buffer
  }

  return {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    path: url.pathname,
    headers,
    query,
    body: body ? body.toString('utf8') : undefined,
    // `wa-webhook.js` reads the raw payload with `for await (const c of req)`.
    [Symbol.asyncIterator]: async function* () {
      if (body) yield body
    },
  }
}

export function createNodeResponse() {
  const headers = new Headers()
  const chunks = []

  const res = {
    statusCode: 200,
    finished: false,
    setHeader(key, value) {
      headers.set(String(key), String(value))
    },
    getHeader(key) {
      return headers.get(String(key))
    },
    removeHeader(key) {
      headers.delete(String(key))
    },
    status(code) {
      res.statusCode = code
      return res
    },
    end(chunk) {
      const buffer = toBuffer(chunk)
      if (buffer) chunks.push(buffer)
      res.finished = true
      return res
    },
    send(chunk) {
      return res.end(chunk)
    },
    json(value) {
      if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8')
      chunks.push(Buffer.from(JSON.stringify(value)))
      res.finished = true
      return res
    },
    toResponse() {
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        if (!headers.has(key)) headers.set(key, value)
      }
      const body = chunks.length ? Buffer.concat(chunks) : null
      return new Response(body, { status: res.statusCode, headers })
    },
  }

  return res
}

export async function adapt(handler, request, env, extraQuery = {}) {
  installEnv(env)
  const req = await toNodeRequest(request, extraQuery)
  const res = createNodeResponse()

  try {
    await handler(req, res)
  } catch (error) {
    console.error('[pages] handler threw:', error)
    if (!res.finished) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end('Internal Server Error')
    }
  }

  return res.toResponse()
}

export { SECURITY_HEADERS }
