// Tracks whether catalogue reads are currently being served from the persisted
// last-good snapshot because the API is unreachable. The store is deliberately
// tiny (no React dependency) so the data layer can report status without
// importing UI code, and the outage notice can subscribe from the app shell.
//
// `savedAt` is the timestamp of the snapshot being shown (ms since epoch), or
// 0 when nothing was cached and the page is showing a plain error state.

let snapshot = Object.freeze({ offline: false, savedAt: 0 })
const listeners = new Set()

export function getCatalogStatus() {
  return snapshot
}

export function subscribeCatalogStatus(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function publish(next) {
  if (snapshot.offline === next.offline && snapshot.savedAt === next.savedAt) return
  snapshot = Object.freeze(next)
  listeners.forEach((listener) => listener())
}

export function reportCatalogOnline() {
  publish({ offline: false, savedAt: 0 })
}

export function reportCatalogOffline(savedAt = 0) {
  publish({ offline: true, savedAt: Number(savedAt) || 0 })
}
