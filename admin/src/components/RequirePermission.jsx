import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Frontend route guard. Hides a page from users without the permission —
// the backend enforces the same rule on every request, so this is UX only.
export default function RequirePermission({ permission, children }) {
  const { isAuthenticated, can } = useAuth()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  if (!can(permission)) return <Navigate to="/admin/dashboard" replace />
  return children
}
