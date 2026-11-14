// Tiny in-process cache for public catalog GETs.
//
// Cloudflare only honors the origin's s-maxage once a Cache Rule matches these
// JSON endpoints; this cache keeps repeated requests fast at the Render origin
// even before that rule exists. Entries are keyed by the full URL, live for a
// short TTL (30s by default), and are never created for errors or non-GET
// requests. Admin edits surface within the TTL.

const DEFAULT_TTL_MS = 30_000
const MAX_ENTRIES = 50
const store = new Map()

function ttlMs() {
  const configured = Number(process.env.PUBLIC_CACHE_TTL_MS)
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_TTL_MS
}

function cachePublic() {
  return function publicCache(req, res, next) {
    if (req.method !== 'GET') return next()

    const key = req.originalUrl || req.url
    const hit = store.get(key)
    if (hit && hit.expiresAt > Date.now()) {
      for (const [name, value] of Object.entries(hit.headers)) {
        res.setHeader(name, value)
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('X-Arees-Cache', 'HIT')
      res.statusCode = hit.status
      res.end(hit.body)
      return
    }
    if (hit) store.delete(key)

    const json = res.json.bind(res)
    res.json = (body) => {
      if (res.statusCode === 200) {
        const headers = { ...res.getHeaders() }
        delete headers['content-length']
        delete headers.etag
        // CORS reflects the requesting Origin. Keep those headers request-local
        // so a cached response for one allowed origin is never replayed to another.
        delete headers['access-control-allow-origin']
        delete headers['access-control-allow-credentials']
        delete headers.vary
        if (store.size >= MAX_ENTRIES) {
          const oldest = store.keys().next().value
          if (oldest !== undefined) store.delete(oldest)
        }
        store.set(key, {
          status: res.statusCode,
          body: JSON.stringify(body),
          headers,
          expiresAt: Date.now() + ttlMs(),
        })
      }
      return json(body)
    }
    next()
  }
}

function clearPublicCache() {
  store.clear()
}

module.exports = { cachePublic, clearPublicCache }
