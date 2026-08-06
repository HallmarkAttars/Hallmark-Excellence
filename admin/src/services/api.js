const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://hallmark-excellence.onrender.com'

// If an authenticated request comes back 401, the stored token is dead
// (missing/expired/invalid). Clear it and bounce to login instead of
// leaving the app stuck on a silent failure.
function handleExpiredSession() {
  try {
    localStorage.removeItem('ad_admin_token')
    localStorage.removeItem('ad_admin_auth')
  } catch {
    // ignore storage errors
  }
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
    window.location.href = '/admin/login'
  }
}

async function apiFetch(path, { method = 'GET', headers = {}, body } = {}) {
  const url = `${API_BASE_URL}${path}`
  const hadAuthHeader = Boolean(headers.Authorization)

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
    // Attach the HTTP status + backend error metadata (code/detail/hint) so
    // callers can tell a definitive 401 (invalid token) from a transient
    // failure (network blip, backend cold start, 5xx) without re-parsing.
    err.status = res.status
    if (detail?.code) err.code = detail.code
    if (detail?.detail) err.detail = detail.detail
    if (detail?.hint) err.hint = detail.hint

    // Only auto-logout when a token was actually sent and rejected —
    // a 401 from /api/auth/login itself is just "wrong password".
    if (res.status === 401 && hadAuthHeader) {
      handleExpiredSession()
    }

    throw err
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// Multipart upload — separate from apiFetch because it must NOT send a
// JSON Content-Type header; the browser sets its own multipart boundary.
async function uploadFile(path, file, token) {
  const url = `${API_BASE_URL}${path}`
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!res.ok) {
    let detail
    try {
      detail = await res.json()
    } catch {
      detail = null
    }
    const msg = detail?.error || detail?.message || `Upload failed (${res.status})`

    if (res.status === 401) {
      handleExpiredSession()
    }

    const err = new Error(msg)
    err.status = res.status
    throw err
  }

  return res.json()
}

export const adminApi = {
  get: (path, token) => apiFetch(path, { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  post: (path, body, token) =>
    apiFetch(path, { method: 'POST', body, headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  patch: (path, body, token) =>
    apiFetch(path, { method: 'PATCH', body, headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  del: (path, token) => apiFetch(path, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  upload: (path, file, token) => uploadFile(path, file, token),
}
