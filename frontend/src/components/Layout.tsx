import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, PenSquare, Settings, LogOut, Send, Menu, X, BookMarked } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { logout } from '../api/auth'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', label: 'Painel',    icon: LayoutDashboard },
  { to: '/compose',   label: 'Compor',    icon: PenSquare },
  { to: '/templates', label: 'Modelos',   icon: BookMarked },
  { to: '/settings',  label: 'Config',    icon: Settings },
]

export function Layout() {
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    try {
      await logout()
    } finally {
      setAccessToken(null)
      navigate('/login')
      toast.success('Sessão encerrada')
    }
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface-800 border-b border-surface-700 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Send className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">TG Scheduler</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-slate-400 hover:text-slate-200 active:bg-surface-700 rounded-lg"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: desktop = fixed, mobile = drawer */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 w-64 flex flex-col bg-surface-800 border-r border-surface-700
          transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0 md:w-60 md:z-auto md:shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-surface-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">TG Scheduler</span>
          </div>
          <button
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-200 rounded-lg"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-slate-400 hover:bg-surface-700 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-surface-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-surface-700 hover:text-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content — pb-16 reserves space for mobile bottom nav */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 min-h-0">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-800 border-t border-surface-700 flex z-30 safe-area-bottom">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-400' : 'text-slate-500'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-slate-500"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </nav>
    </div>
  )
}
