import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Compose } from './pages/Compose'
import { Settings } from './pages/Settings'
import { Templates } from './pages/Templates'
import { useAuthStore } from './store/authStore'
import { refresh } from './api/auth'

export default function App() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setAuthReady = useAuthStore((s) => s.setAuthReady)

  useEffect(() => {
    refresh()
      .then((token) => setAccessToken(token))
      .catch(() => {})
      .finally(() => setAuthReady(true))
  }, [setAccessToken, setAuthReady])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/compose" element={<Compose />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
