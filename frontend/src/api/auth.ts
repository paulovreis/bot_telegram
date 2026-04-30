import axios from 'axios'
import client from './client'

export async function login(username: string, password: string): Promise<string> {
  const { data } = await axios.post('/api/auth/login', { username, password }, { withCredentials: true })
  return data.access_token
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout')
}

export async function refresh(): Promise<string> {
  const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
  return data.access_token
}
