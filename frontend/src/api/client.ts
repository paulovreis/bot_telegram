import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(client(original))
          })
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const newToken: string = data.access_token
        useAuthStore.getState().setAccessToken(newToken)
        refreshQueue.forEach((cb) => cb(newToken))
        refreshQueue = []
        original.headers.Authorization = `Bearer ${newToken}`
        return client(original)
      } catch {
        useAuthStore.getState().setAccessToken(null)
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default client
