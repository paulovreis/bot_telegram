import client from './client'
import type { InlineKeyboard, MessageType, ParseMode, PollData, ScheduledMessage } from '../types'

export async function listMessages(): Promise<ScheduledMessage[]> {
  const { data } = await client.get('/messages/')
  return data.messages
}

export interface CreateMessagePayload {
  message_type: MessageType
  text?: string
  parse_mode: ParseMode
  inline_keyboard?: InlineKeyboard
  poll_data?: PollData
  disable_web_page_preview?: boolean
  scheduled_at: string
  media?: File
}

export async function createMessage(payload: CreateMessagePayload): Promise<{ id: string; scheduled_at: string }> {
  const form = new FormData()
  form.append('message_type', payload.message_type)
  if (payload.text) form.append('text', payload.text)
  form.append('parse_mode', payload.parse_mode)
  if (payload.inline_keyboard) form.append('inline_keyboard', JSON.stringify(payload.inline_keyboard))
  if (payload.poll_data) form.append('poll_data', JSON.stringify(payload.poll_data))
  form.append('disable_web_page_preview', String(payload.disable_web_page_preview ?? false))
  form.append('scheduled_at', payload.scheduled_at)
  if (payload.media) form.append('media', payload.media)

  const { data } = await client.post('/messages/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteMessage(id: string): Promise<void> {
  await client.delete(`/messages/${id}`)
}

export async function sendNow(id: string): Promise<void> {
  await client.post(`/messages/${id}/send-now`)
}
