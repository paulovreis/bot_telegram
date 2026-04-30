import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Eye, EyeOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { login } from '../api/auth'
import { useAuthStore } from '../store/authStore'

interface FormData {
  username: string
  password: string
}

export function Login() {
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>()

  async function onSubmit(data: FormData) {
    try {
      const token = await login(data.username, data.password)
      setAccessToken(token)
      navigate('/dashboard')
    } catch {
      toast.error('Usuário ou senha inválidos')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Send className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">TG Scheduler</h1>
          <p className="text-slate-400 text-sm mt-1">Painel de controle</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <div>
            <label className="label">Usuário</label>
            <input
              {...register('username', { required: true })}
              className="input"
              placeholder="admin"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="label">Senha</label>
            <div className="relative">
              <input
                {...register('password', { required: true })}
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
