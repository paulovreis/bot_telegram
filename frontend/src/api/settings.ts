import client from './client'
import type { BotSettings } from '../types'

export async function getBotSettings(): Promise<BotSettings> {
  const { data } = await client.get('/settings/bot')
  return data
}

export async function updateBotSettings(bot_token?: string, chat_id?: string): Promise<void> {
  await client.put('/settings/bot', { bot_token, chat_id })
}

export async function testBot(): Promise<{ ok: boolean; bot?: Record<string, unknown>; error?: string }> {
  const { data } = await client.get('/settings/test')
  return data
}
