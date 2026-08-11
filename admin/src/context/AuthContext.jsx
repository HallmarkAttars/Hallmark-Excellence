import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { login as apiLogin, verifyToken, refreshSession } from '../services/mockApi'
import { can as canWithRole } from '../config/roles'

const AuthContext = createContext(null)
const STORAGE_KEY = 'ad_admin_auth'
const TOKEN_KEY = 'ad_admin_token'

// Sliding-session renewal cadence — far shorter than the 7-day JWT, so a
// session only ever dies from genuine long-term disuse (7 days without any
// load / periodic renewal / tab focus), never from arbitrary clock time.
const REFRESH_MS = 30 * 60 * 1000

function readStoredAdmin() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(readStoredAdmin)
  const [checkingSession, setCheckingSession] = useState(true)

  // On load/refresh, confirm any stored token is still valid server-side —
  // if it's expired or was revoked, drop the stale session instead of
  // pretending the admin is still logged in.
  useEffect(() => {
    let cancelled = false
    async function checkSession() {
      const stored = readStoredAdmin()
      if (!stored) {
        setCheckingSession(false)
        return
      }
      const verified = await verifyToken()
      if (cancelled) return
      if (verified.status === 'valid') {
        setAdmin(verified.admin)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(verified.admin))
        // Every successful verify re-issues a fresh JWT — persist it so the
        // page refresh itself rolls the sliding session window forward.
        if (verified.token) {
          try { localStorage.setItem(TOKEN_KEY, verified.token) } catch { /* ignore */ }
        }
      } else if (verified.status === 'invalid') {
        // Token definitively rejected (expired/revoked) → genuine logout.
        setAdmin(null)
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(TOKEN_KEY)
      }
      // 'none' (nothing stored) and 'error' (transient failure) keep the
      // current stored state: the admin stays authenticated until a real 401
      // proves the token is dead. This prevents a backend cold start or a
      // network blip from silently logging the admin out.
      setCheckingSession(false)
    }
    checkSession()
    return () => {
      cancelled = true
    }
  }, [])

  // Silent sliding-session renewal. Runs while authenticated: on a 30-minute
  // timer AND whenever the admin returns to the tab (focus / visibility).
  // Renewal only re-signs an ALREADY-valid token (the server re-checks it
  // against the live user row), so security is unchanged — genuinely
  // expired/revoked sessions still clear and demand a real login.
  //
  // Depends on the BOOLEAN (not the admin object) so a successful renewal —
  // which calls setAdmin — never tears down and restarts the timer.
  const isAuthed = Boolean(admin)
  useEffect(() => {
    if (!isAuthed) return
    let inFlight = false
    const renew = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const res = await refreshSession()
        if (res.status === 'valid') {
          if (res.token) {
            try { localStorage.setItem(TOKEN_KEY, res.token) } catch { /* ignore */ }
          }
          if (res.admin) {
            setAdmin(res.admin)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res.admin))
          }
        } else if (res.status === 'invalid') {
          // Token definitively rejected (expired/revoked) → genuine logout.
          setAdmin(null)
          localStorage.removeItem(STORAGE_KEY)
          localStorage.removeItem(TOKEN_KEY)
        }
        // 'none' / 'error' keep the current session — a backend cold start
        // or network blip must never log the admin out; the next renewal
        // (or any request) will pick the session back up.
      } finally {
        inFlight = false
      }
    }

    const timer = window.setInterval(renew, REFRESH_MS)
    const onFocus = () => renew()
    const onVisible = () => {
      if (document.visibilityState === 'visible') renew()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isAuthed])

  const login = useCallback(async (email, password) => {
    const res = await apiLogin(email, password)
    if (res.success) {
      setAdmin(res.admin)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.admin))
    }
    return res
  }, [])

  const logout = useCallback(() => {
    setAdmin(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TOKEN_KEY)
  }, [])

  // UI-gating helper backed by the frontend permission mirror. The server
  // independently enforces the same matrix on every protected route.
  const can = useCallback(
    (permission) => canWithRole(admin?.role, permission),
    [admin]
  )

  return (
    <AuthContext.Provider
      value={{ admin, isAuthenticated: Boolean(admin), checkingSession, login, logout, can }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
