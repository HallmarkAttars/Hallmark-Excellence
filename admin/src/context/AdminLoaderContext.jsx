import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthContext'

const AdminLoaderContext = createContext({
  isReady: false,
  markReady: () => {},
  reportError: () => {},
  initError: null,
  hasBootstrapped: false,
})

export function AdminLoaderProvider({ children }) {
  const { checkingSession, isAuthenticated } = useAuth()
  const [pageReady, setPageReady] = useState(false)
  const [initError, setInitError] = useState(null)
  const [hasBootstrapped, setHasBootstrapped] = useState(false)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)

  // Natural minimum baseline (750ms) for the cinematic entrance animation
  // Ensures the luxury arch, logo and shimmer present smoothly without a jarring 5ms flash,
  // while strictly avoiding long artificial 5s/10s delays.
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    }, 750)
    return () => clearTimeout(timer)
  }, [])

  // When auth session check finishes:
  // If not authenticated, we don't wait for protected dashboard data; ready for Login once minTimeElapsed is true.
  useEffect(() => {
    if (!checkingSession && !isAuthenticated) {
      setPageReady(true)
    }
  }, [checkingSession, isAuthenticated])

  // Safety timer: Never leave the admin permanently stuck if an API hangs or fails
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageReady(true)
    }, 3800)
    return () => clearTimeout(timer)
  }, [])

  const markReady = useCallback(() => {
    setPageReady(true)
  }, [])

  const reportError = useCallback((err) => {
    setInitError(err)
  }, [])

  const handleFadeComplete = useCallback(() => {
    setHasBootstrapped(true)
  }, [])

  const isReady = hasBootstrapped || (minTimeElapsed && pageReady && !checkingSession)

  return (
    <AdminLoaderContext.Provider
      value={{
        isReady,
        markReady,
        reportError,
        initError,
        hasBootstrapped,
        handleFadeComplete,
      }}
    >
      {children}
    </AdminLoaderContext.Provider>
  )
}

export function useAdminLoader() {
  return useContext(AdminLoaderContext)
}
