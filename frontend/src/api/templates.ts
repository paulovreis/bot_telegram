import client from './client'
import type { InlineKeyboard, MessageTemplate, MessageType, ParseMode, PollData } from '../types'

export async function listTemplates(): Promise<MessageTemplate[]> {
  const { data } = await client.get('/templates/')
  return data.templates
}

export interface TemplatePayload {
  name: string
  message_type: MessageType
  text?: string
  parse_mode: ParseMode
  inline_keyboard?: InlineKeyboard
  poll_data?: PollData
  disable_web_page_preview?: boolean
  recurrence_minutes?: number | null
  next_send_at?: string | null
  recurrence_end_at?: string | null
  media?: File
  clearMedia?: boolean
}

function buildTemplateForm(payload: TemplatePayload): FormData {
  const form = new FormData()
  form.append('name', payload.name)
  form.append('message_type', payload.message_type)
  if (payload.text) form.append('text', payload.text)
  form.append('parse_mode', payload.parse_mode)
  if (payload.inline_keyboard) form.append('inline_keyboard', JSON.stringify(payload.inline_keyboard))
  if (payload.poll_data) form.append('poll_data', JSON.stringify(payload.poll_data))
  form.append('disable_web_page_preview', String(payload.disable_web_page_preview ?? false))
  if (payload.recurrence_minutes) form.append('recurrence_minutes', String(payload.recurrence_minutes))
  if (payload.next_send_at) form.append('next_send_at', payload.next_send_at)
  if (payload.recurrence_end_at) form.append('recurrence_end_at', payload.recurrence_end_at)
  if (payload.media) form.append('media', payload.media)
  if (payload.clearMedia) form.append('clear_media', 'true')
  return form
}

export async function createTemplate(payload: TemplatePayload): Promise<{ id: string }> {
  const { data } = await client.post('/templates/', buildTemplateForm(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updateTemplate(id: string, payload: TemplatePayload): Promise<{ id: string }> {
  const { data } = await client.put(`/templates/${id}`, buildTemplateForm(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteTemplate(id: string): Promise<void> {
  await client.delete(`/templates/${id}`)
}

export async function scheduleFromTemplate(id: string, scheduled_at: string): Promise<{ id: string; scheduled_at: string }> {
  const form = new FormData()
  form.append('scheduled_at', scheduled_at)
  const { data } = await client.post(`/templates/${id}/schedule`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
