import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Send, ArrowLeft } from 'lucide-react'
import DatePicker from 'react-datepicker'
import { registerLocale } from 'react-datepicker'
import { ptBR } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import toast from 'react-hot-toast'
import { format, addMinutes } from 'date-fns'
import { MessageEditor, type EditorState } from '../components/MessageEditor'
import { createMessage, sendNow } from '../api/messages'

registerLocale('pt-BR', ptBR)

const DEFAULT_STATE: EditorState = {
  messageType: 'text',
  text: '',
  parseMode: 'HTML',
  mediaFile: null,
  inlineKeyboard: [],
  pollData: {
    question: '',
    options: ['', ''],
    is_anonymous: true,
    type: 'regular',
    allows_multiple_answers: false,
  },
  disableWebPagePreview: false,
}

function toSpISO(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss")
}

export function Compose() {
  const navigate = useNavigate()
  const [editor, setEditor] = useState<EditorState>(DEFAULT_STATE)
  const [scheduledAt, setScheduledAt] = useState<Date>(addMinutes(new Date(), 30))
  const [mode, setMode] = useState<'schedule' | 'now'>('schedule')
  const [submitting, setSubmitting] = useState(false)

  function validate(): string | null {
    const { messageType, text, mediaFile, pollData } = editor
    if (messageType === 'poll') {
      if (!pollData.question.trim()) return 'A pergunta da enquete é obrigatória.'
      if (pollData.options.filter((o) => o.trim()).length < 2) return 'Mínimo 2 opções preenchidas.'
      return null
    }
    const hasMedia = !['text', 'poll'].includes(messageType)
    if (hasMedia && !mediaFile) return 'Selecione um arquivo de mídia.'
    if (!hasMedia && !text.trim()) return 'O texto da mensagem é obrigatório.'
    return null
  }

  async function handleSchedule() {
    const err = validate()
    if (err) { toast.error(err); return }
    if (scheduledAt <= new Date()) { toast.error('A data de agendamento deve ser no futuro.'); return }

    setSubmitting(true)
    try {
      await createMessage({
        message_type: editor.messageType,
        text: editor.text || undefined,
        parse_mode: editor.parseMode,
        inline_keyboard: editor.inlineKeyboard.length ? editor.inlineKeyboard : undefined,
        poll_data: editor.messageType === 'poll' ? editor.pollData : undefined,
        disable_web_page_preview: editor.disableWebPagePreview,
        scheduled_at: toSpISO(scheduledAt),
        media: editor.mediaFile ?? undefined,
      })
      toast.success('Mensagem agendada com sucesso!')
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      toast.error(msg ?? 'Erro ao agendar mensagem')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendNow() {
    const err = validate()
    if (err) { toast.error(err); return }

    setSubmitting(true)
    try {
      const { id } = await createMessage({
        message_type: editor.messageType,
        text: editor.text || undefined,
        parse_mode: editor.parseMode,
        inline_keyboard: editor.inlineKeyboard.length ? editor.inlineKeyboard : undefined,
        poll_data: editor.messageType === 'poll' ? editor.pollData : undefined,
        disable_web_page_preview: editor.disableWebPagePreview,
        scheduled_at: toSpISO(addMinutes(new Date(), 1)),
        media: editor.mediaFile ?? undefined,
      })
      await sendNow(id)
      toast.success('Mensagem enviada!')
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      toast.error(msg ?? 'Erro ao enviar mensagem')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-surface-700 bg-surface-800">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">Compor mensagem</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-surface-700">
          <MessageEditor value={editor} onChange={setEditor} />
        </div>

        {/* Sidebar: Agendamento */}
        <div className="w-80 flex flex-col bg-surface-800 overflow-y-auto">
          <div className="p-5 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-brand-400" />
                Quando enviar?
              </h2>

              <div className="flex rounded-lg overflow-hidden border border-surface-700 mb-4">
                {(['schedule', 'now'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      mode === m
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m === 'schedule' ? 'Agendar' : 'Agora'}
                  </button>
                ))}
              </div>

              {mode === 'schedule' && (
                <div>
                  <label className="label">Data e horário (São Paulo)</label>
                  <DatePicker
                    selected={scheduledAt}
                    onChange={(date) => date && setScheduledAt(date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={5}
                    dateFormat="dd/MM/yyyy HH:mm"
                    locale="pt-BR"
                    minDate={new Date()}
                    className="input w-full"
                    calendarClassName="!bg-surface-800 !border-surface-700 !text-slate-100"
                    wrapperClassName="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Fuso: America/Sao_Paulo (BRT/BRST)
                  </p>
                </div>
              )}
            </div>

            {/* Resumo */}
            <div className="bg-surface-900 rounded-lg p-3 space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Tipo</span>
                <span className="text-slate-200 capitalize">{editor.messageType}</span>
              </div>
              <div className="flex justify-between">
                <span>Formatação</span>
                <span className="text-slate-200">{editor.parseMode}</span>
              </div>
              {editor.mediaFile && (
                <div className="flex justify-between">
                  <span>Arquivo</span>
                  <span className="text-slate-200 truncate max-w-[120px]">{editor.mediaFile.name}</span>
                </div>
              )}
              {editor.inlineKeyboard.length > 0 && (
                <div className="flex justify-between">
                  <span>Botões</span>
                  <span className="text-slate-200">{editor.inlineKeyboard.flat().length}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {mode === 'schedule' ? (
                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <CalendarClock className="w-4 h-4" />
                  {submitting ? 'Agendando...' : 'Agendar envio'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSendNow}
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Enviando...' : 'Enviar agora'}
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-secondary w-full text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
