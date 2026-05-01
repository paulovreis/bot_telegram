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

function buildMessageForm(payload: CreateMessagePayload): FormData {
  const form = new FormData()
  form.append('message_type', payload.message_type)
  if (payload.text) form.append('text', payload.text)
  form.append('parse_mode', payload.parse_mode)
  if (payload.inline_keyboard) form.append('inline_keyboard', JSON.stringify(payload.inline_keyboard))
  if (payload.poll_data) form.append('poll_data', JSON.stringify(payload.poll_data))
  form.append('disable_web_page_preview', String(payload.disable_web_page_preview ?? false))
  form.append('scheduled_at', payload.scheduled_at)
  if (payload.media) form.append('media', payload.media)
  return form
}

export async function createMessage(payload: CreateMessagePayload): Promise<{ id: string; scheduled_at: string }> {
  const { data } = await client.post('/messages/', buildMessageForm(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export interface UpdateMessagePayload extends CreateMessagePayload {
  clearMedia?: boolean
}

export async function updateMessage(id: string, payload: UpdateMessagePayload): Promise<{ id: string; scheduled_at: string }> {
  const form = buildMessageForm(payload)
  form.append('clear_media', String(payload.clearMedia ?? false))
  const { data } = await client.put(`/messages/${id}`, form, {
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
