import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, PenSquare, Settings, LogOut, Send } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { logout } from '../api/auth'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { to: '/compose',   label: 'Compor',  icon: PenSquare },
  { to: '/settings',  label: 'Config',  icon: Settings },
]

export function Layout() {
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)

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
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col bg-surface-800 border-r border-surface-700">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-700">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Send className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white">TG Scheduler</span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-surface-700 hover:text-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
