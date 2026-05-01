import axios from 'axios'
import client from './client'

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://tlapi.painelderevenda.com.br'

const authClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export async function login(username: string, password: string): Promise<string> {
  const { data } = await authClient.post('/auth/login', { username, password })
  return data.access_token
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout')
}

export async function refresh(): Promise<string> {
  const { data } = await authClient.post('/auth/refresh', {})
  return data.access_token
}
