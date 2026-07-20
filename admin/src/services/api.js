const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

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

    // Only auto-logout when a token was actually sent and rejected —
    // a 401 from /api/auth/login itself is just "wrong password".
    if (res.status === 401 && hadAuthHeader) {
      handleExpiredSession()
    }

    throw new Error(msg)
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

    throw new Error(msg)
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
