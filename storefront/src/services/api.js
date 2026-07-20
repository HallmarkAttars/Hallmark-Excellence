const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

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
    throw new Error(msg)
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

