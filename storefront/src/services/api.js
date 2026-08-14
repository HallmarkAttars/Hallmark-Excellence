const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.areesperfumes.in/api'

// Abort requests that take longer than this (e.g. a Render free-tier cold
// start spinning the server back up) so pages surface a friendly error +
// retry instead of hanging on "Loading products…" forever.
const REQUEST_TIMEOUT_MS = 30000

async function apiFetch(path, { method = 'GET', headers = {}, body } = {}) {
  const url = `${API_BASE_URL}${path}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    // AbortError → the server didn't answer in time (cold start / hang).
    if (err.name === 'AbortError') {
      throw new Error('The server is taking too long to respond. Please try again.')
    }
    // fetch rejects with TypeError when the network is down or CORS blocks it.
    throw new Error('Could not reach the server. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }

  const text = await res.text()

  // Parse the body once. A non-JSON body (an SPA rewrite, a proxy HTML page,
  // a gateway error page) means the API contract is broken — surface a
  // diagnosable error instead of a raw SyntaxError deep in the caller.
  let detail = null
  if (text) {
    try {
      detail = JSON.parse(text)
    } catch {
      if (!res.ok) {
        const err = new Error(`Request failed (${res.status})`)
        err.status = res.status
        throw err
      }
      throw new Error('INVALID_SERVER_RESPONSE')
    }
  }

  if (!res.ok) {
    const msg = detail?.error || detail?.message || `Request failed (${res.status})`
    const err = new Error(msg)
    // Attach the HTTP status so callers can tell a validation failure (400)
    // from a routing (404) or server (500) problem.
    err.status = res.status
    // Attach backend error metadata (code/detail/hint) so dev console logs
    // can show the real Supabase error without changing the user-facing message.
    if (detail?.code) err.code = detail.code
    if (detail?.detail) err.detail = detail.detail
    if (detail?.hint) err.hint = detail.hint
    throw err
  }

  return detail ?? null
}

export const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, body) => apiFetch(path, { method: 'POST', body }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body }),
  del: (path) => apiFetch(path, { method: 'DELETE' }),
}

