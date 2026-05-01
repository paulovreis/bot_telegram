import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function ProtectedRoute() {
  const authReady = useAuthStore((s) => s.authReady)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  if (!authReady) return null
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
