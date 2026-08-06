const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://hallmark-excellence.onrender.com'

async function apiFetch(path, { method = 'GET', headers = {}, body } = {}) {
  const url = `${API_BASE_URL}${path}`

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let detail
    try {
      detail = await res.json()
    } catch {
      detail = null
    }
    const msg = detail?.error || detail?.message || `Request failed (${res.status})`
    const err = new Error(msg)
    // Attach backend error metadata (code/detail/hint) so dev console logs
    // can show the real Supabase error without changing the user-facing message.
    if (detail?.code) err.code = detail.code
    if (detail?.detail) err.detail = detail.detail
    if (detail?.hint) err.hint = detail.hint
    throw err
  }

  // Some endpoints return no body in future; keep safe.
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, body) => apiFetch(path, { method: 'POST', body }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body }),
  del: (path) => apiFetch(path, { method: 'DELETE' }),
}

