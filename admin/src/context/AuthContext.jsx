import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { login as apiLogin, verifyToken } from '../services/mockApi'

const AuthContext = createContext(null)
const STORAGE_KEY = 'ad_admin_auth'
const TOKEN_KEY = 'ad_admin_token'

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
      const verifiedAdmin = await verifyToken()
      if (cancelled) return
      if (verifiedAdmin) {
        setAdmin(verifiedAdmin)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(verifiedAdmin))
      } else {
        setAdmin(null)
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(TOKEN_KEY)
      }
      setCheckingSession(false)
    }
    checkSession()
    return () => {
      cancelled = true
    }
  }, [])

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

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated: Boolean(admin), checkingSession, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
