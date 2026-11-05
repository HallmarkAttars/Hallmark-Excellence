// WhatsApp bot session store.
//
// Production: Vercel KV (Upstash REST) when KV_REST_API_URL/TOKEN are set —
// free tier, one click in the Vercel dashboard.
// Fallback: an in-process Map, so the bot still works for development/preview
// (and unit tests) with zero external dependencies. State lost on cold start
// with the fallback is acceptable: the bot's menus are stateless-ish and the
// customer simply taps the menu again.

const TTL_MS = 6 * 60 * 60 * 1000 // 6 hours of conversation memory

const mem = new Map() // sessionId → { value, expiresAt }

function memGet(key) {
  const hit = mem.get(key)
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    mem.delete(key)
    return null
  }
  return hit.value
}

function memSet(key, value, ttlMs = TTL_MS) {
  mem.set(key, { value, expiresAt: Date.now() + ttlMs })
  if (mem.size > 5000) {
    // Keep-it-small guard so a long-lived dev instance can't grow unbounded.
    const cutoff = Date.now()
    for (const [k, v] of mem) if (v.expiresAt <= cutoff) mem.delete(k)
  }
}

export function kvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function kvRequest(path, init = {}) {
  const url = `${process.env.KV_REST_API_URL}${path}`
  const res = await fetch(url, {
    method: init.verb || 'GET',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const out = await res.json().catch(() => null)
  if (!res.ok) throw new Error(out?.error || `KV error ${res.status}`)
  if (out && typeof out.result === 'string') {
    try {
      return JSON.parse(out.result)
    } catch {}
    return out.result
  }
  return out?.result
}

export async function getSession(sessionId) {
  const key = `wa:s:${sessionId}`
  if (kvConfigured()) {
    try {
      return (await kvRequest(`/get/${encodeURIComponent(key)}`)) || null
    } catch (err) {
      console.error('[wa:store] KV get failed, falling back to memory:', err.message)
    }
  }
  return memGet(key)
}

export async function saveSession(sessionId, value) {
  if (value == null) return clearSession(sessionId)
  const key = `wa:s:${sessionId}`
  if (kvConfigured()) {
    try {
      await kvRequest(`/set/${encodeURIComponent(key)}`, {
        verb: 'POST',
        body: { value, expiration: Math.floor(TTL_MS / 1000) },
      })
      return
    } catch (err) {
      console.error('[wa:store] KV set failed, falling back to memory:', err.message)
    }
  }
  memSet(key, value)
}

export async function clearSession(sessionId) {
  const key = `wa:s:${sessionId}`
  if (kvConfigured()) {
    try {
      await kvRequest(`/del/${encodeURIComponent(key)}`, { verb: 'POST' })
      return
    } catch (err) {
      console.error('[wa:store] KV del failed:', err.message)
    }
  }
  mem.delete(key)
}

// At-least-once webhook deliveries from Meta are normal — the identical
// message payload can arrive twice. Dedupe by payload id (1h window).
export async function checkAndRememberValue(payloadId) {
  const key = `wa:seen:${payloadId}`
  if (!payloadId) return true // no id → cannot dedupe, process
  if (kvConfigured()) {
    try {
      const isNew = await kvRequest(`/set/${encodeURIComponent(key)}`, {
        verb: 'POST',
        body: { value: '1', expiration: 3600, nx: true },
      })
      return isNew !== null
    } catch (err) {
      console.error('[wa:store] KV dedupe failed:', err.message)
    }
  }
  if (mem.get(key)) return false
  memSet(key, '1', 3600 * 1000)
  return true
}

export function resetMemoryForTests() {
  mem.clear()
}
