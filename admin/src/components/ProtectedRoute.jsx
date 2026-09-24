import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, checkingSession } = useAuth()
  if (checkingSession) return null
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return <Outlet />
}
