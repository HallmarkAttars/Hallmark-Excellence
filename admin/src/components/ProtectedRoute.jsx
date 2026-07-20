import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, checkingSession } = useAuth()
  if (checkingSession) return <div className="loading-state">Loading…</div>
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return <Outlet />
}
