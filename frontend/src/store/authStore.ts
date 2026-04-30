import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  setAccessToken: (token: string | null) => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
  isAuthenticated: () => !!get().accessToken,
}))
