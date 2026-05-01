export type MessageType = 'text' | 'photo' | 'video' | 'document' | 'audio' | 'animation' | 'voice' | 'poll'
export type ParseMode = 'HTML' | 'MarkdownV2'
export type MessageStatus = 'pending' | 'sending' | 'sent' | 'failed'

export interface InlineButton {
  text: string
  url?: string
  callback_data?: string
}

export type InlineKeyboard = InlineButton[][]

export interface PollData {
  question: string
  options: string[]
  is_anonymous: boolean
  type: 'regular' | 'quiz'
  allows_multiple_answers: boolean
  correct_option_id?: number
}

export interface ScheduledMessage {
  id: string
  message_type: MessageType
  text: string | null
  parse_mode: ParseMode
  media_filename: string | null
  media_mime_type: string | null
  inline_keyboard: InlineKeyboard | null
  poll_data: PollData | null
  disable_web_page_preview: boolean
  scheduled_at: string
  status: MessageStatus
  error_message: string | null
  created_at: string
  deleted_at: string | null
  template_id: string | null
}

export interface MessageTemplate {
  id: string
  name: string
  message_type: MessageType
  text: string | null
  parse_mode: ParseMode
  media_filename: string | null
  media_mime_type: string | null
  inline_keyboard: InlineKeyboard | null
  poll_data: PollData | null
  disable_web_page_preview: boolean
  recurrence_minutes: number | null
  next_send_at: string | null
  recurrence_end_at: string | null
  created_at: string
}

export interface BotSettings {
  bot_token_set: boolean
  chat_id: string
}
