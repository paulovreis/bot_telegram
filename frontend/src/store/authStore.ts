import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  setAccessToken: (token: string | null) => void
  authReady: boolean
  setAuthReady: (ready: boolean) => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
  authReady: false,
  setAuthReady: (ready) => set({ authReady: ready }),
  isAuthenticated: () => !!get().accessToken,
}))
