import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookMarked, Plus, Pencil, Trash2, Send, RefreshCw, Clock, X,
  CalendarClock, RepeatIcon, ChevronDown, ChevronUp,
} from 'lucide-react'
import DatePicker from 'react-datepicker'
import { registerLocale } from 'react-datepicker'
import { ptBR } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import toast from 'react-hot-toast'
import { format, addMinutes, parseISO, addHours } from 'date-fns'
import { MessageEditor, type EditorState } from '../components/MessageEditor'
import { listTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api/templates'
import type { MessageTemplate } from '../types'

registerLocale('pt-BR', ptBR)

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto', photo: 'Foto', video: 'Vídeo', document: 'Documento',
  audio: 'Áudio', animation: 'GIF', voice: 'Voz', poll: 'Enquete',
}

const RECURRENCE_OPTIONS = [
  { label: 'Sem recorrência', minutes: null },
  { label: 'A cada hora', minutes: 60 },
  { label: 'A cada 6 horas', minutes: 360 },
  { label: 'A cada 12 horas', minutes: 720 },
  { label: 'Diariamente', minutes: 1440 },
  { label: 'Semanalmente', minutes: 10080 },
  { label: 'Personalizado', minutes: -1 },
]

const DEFAULT_EDITOR: EditorState = {
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

function recurrenceLabel(minutes: number | null): string {
  if (!minutes) return 'Não recorrente'
  const opt = RECURRENCE_OPTIONS.find((o) => o.minutes === minutes)
  if (opt && opt.minutes !== -1) return opt.label
  if (minutes < 60) return `A cada ${minutes} min`
  if (minutes % 1440 === 0) return `A cada ${minutes / 1440} dia(s)`
  if (minutes % 60 === 0) return `A cada ${minutes / 60} hora(s)`
  return `A cada ${minutes} min`
}

function nextSendLabel(iso: string | null): string {
  if (!iso) return '—'
  return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

interface FormState {
  name: string
  recurrenceOption: number | null
  customMinutes: string
  nextSendAt: Date
  recurrenceEndAt: Date | null
  hasEnd: boolean
  recurrPanelOpen: boolean
}

const DEFAULT_FORM: FormState = {
  name: '',
  recurrenceOption: null,
  customMinutes: '60',
  nextSendAt: addHours(new Date(), 1),
  recurrenceEndAt: null,
  hasEnd: false,
  recurrPanelOpen: false,
}

export function Templates() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState<null | 'new' | string>(null)
  const [editor, setEditor] = useState<EditorState>(DEFAULT_EDITOR)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [existingMediaFilename, setExistingMediaFilename] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listTemplates()
      setTemplates(data)
    } catch {
      toast.error('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function openNew() {
    setEditor(DEFAULT_EDITOR)
    setForm(DEFAULT_FORM)
    setExistingMediaFilename(null)
    setModal('new')
  }

  function openEdit(tmpl: MessageTemplate) {
    setEditor({
      messageType: tmpl.message_type,
      text: tmpl.text ?? '',
      parseMode: tmpl.parse_mode,
      mediaFile: null,
      inlineKeyboard: tmpl.inline_keyboard ?? [],
      pollData: tmpl.poll_data ?? DEFAULT_EDITOR.pollData,
      disableWebPagePreview: tmpl.disable_web_page_preview,
    })
    setExistingMediaFilename(tmpl.media_filename)

    const matchOpt = RECURRENCE_OPTIONS.find((o) => o.minutes === tmpl.recurrence_minutes && o.minutes !== -1)
    setForm({
      name: tmpl.name,
      recurrenceOption: matchOpt ? (matchOpt.minutes ?? null) : (tmpl.recurrence_minutes ? -1 : null),
      customMinutes: tmpl.recurrence_minutes ? String(tmpl.recurrence_minutes) : '60',
      nextSendAt: tmpl.next_send_at ? parseISO(tmpl.next_send_at) : addHours(new Date(), 1),
      recurrenceEndAt: tmpl.recurrence_end_at ? parseISO(tmpl.recurrence_end_at) : null,
      hasEnd: Boolean(tmpl.recurrence_end_at),
      recurrPanelOpen: false,
    })
    setModal(tmpl.id)
  }

  function closeModal() {
    setModal(null)
  }

  function validate(): string | null {
    if (!form.name.trim()) return 'O nome do template é obrigatório.'
    const { messageType, text, mediaFile, pollData } = editor
    if (messageType === 'poll') {
      if (!pollData.question.trim()) return 'A pergunta da enquete é obrigatória.'
      if (pollData.options.filter((o) => o.trim()).length < 2) return 'Mínimo 2 opções preenchidas.'
      return null
    }
    const hasMedia = !['text', 'poll'].includes(messageType)
    if (hasMedia && !mediaFile && !existingMediaFilename) return 'Selecione um arquivo de mídia.'
    if (!hasMedia && !text.trim()) return 'O texto da mensagem é obrigatório.'

    const effectiveMinutes = form.recurrenceOption === -1
      ? parseInt(form.customMinutes)
      : form.recurrenceOption

    if (effectiveMinutes !== null) {
      if (isNaN(Number(form.customMinutes)) || Number(form.customMinutes) < 1) {
        return 'Intervalo de recorrência inválido.'
      }
      if (form.nextSendAt <= new Date()) return 'O próximo envio deve ser no futuro.'
    }
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) { toast.error(err); return }

    const effectiveMinutes = form.recurrenceOption === -1
      ? parseInt(form.customMinutes)
      : form.recurrenceOption

    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        message_type: editor.messageType,
        text: editor.text || undefined,
        parse_mode: editor.parseMode,
        inline_keyboard: editor.inlineKeyboard.length ? editor.inlineKeyboard : undefined,
        poll_data: editor.messageType === 'poll' ? editor.pollData : undefined,
        disable_web_page_preview: editor.disableWebPagePreview,
        recurrence_minutes: effectiveMinutes ?? undefined,
        next_send_at: effectiveMinutes ? toSpISO(form.nextSendAt) : undefined,
        recurrence_end_at: (effectiveMinutes && form.hasEnd && form.recurrenceEndAt)
          ? toSpISO(form.recurrenceEndAt)
          : undefined,
        media: editor.mediaFile ?? undefined,
        clearMedia: !editor.mediaFile && !existingMediaFilename,
      }

      if (modal === 'new') {
        await createTemplate(payload)
        toast.success('Template salvo!')
      } else if (typeof modal === 'string') {
        await updateTemplate(modal, payload)
        toast.success('Template atualizado!')
      }
      await load()
      closeModal()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      toast.error(msg ?? 'Erro ao salvar template')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este template permanentemente?')) return
    try {
      await deleteTemplate(id)
      toast.success('Template excluído')
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {
      toast.error('Erro ao excluir template')
    }
  }

  function setF<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const effectiveMinutesForLabel = form.recurrenceOption === -1
    ? parseInt(form.customMinutes) || 0
    : form.recurrenceOption

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-brand-400" />
            Modelos Favoritos
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Salve mensagens para reutilizar ou enviar de forma recorrente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <button
            onClick={openNew}
            className="btn-primary flex items-center gap-2 text-sm py-2 flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4" />
            Novo template
          </button>
        </div>
      </div>

      {/* List */}
      {loading && templates.length === 0 ? (
        <div className="card flex items-center justify-center py-16 text-slate-500">Carregando...</div>
      ) : templates.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-4 text-center">
          <BookMarked className="w-12 h-12 text-slate-600" />
          <div>
            <p className="text-slate-300 font-medium">Nenhum template salvo</p>
            <p className="text-slate-500 text-sm mt-1">Crie um modelo para reutilizar mensagens</p>
          </div>
          <button onClick={openNew} className="btn-primary text-sm">Criar template</button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="card p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-100 text-sm">{tmpl.name}</span>
                    <span className="text-xs font-medium text-slate-300 bg-surface-700 px-2 py-0.5 rounded">
                      {TYPE_LABELS[tmpl.message_type] ?? tmpl.message_type}
                    </span>
                    {tmpl.recurrence_minutes && (
                      <span className="text-xs text-brand-400 bg-brand-600/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <RepeatIcon className="w-3 h-3" />
                        {recurrenceLabel(tmpl.recurrence_minutes)}
                      </span>
                    )}
                  </div>

                  {tmpl.text && (
                    <p className="text-sm text-slate-400 mt-1.5 line-clamp-1 break-words">
                      {tmpl.text.replace(/<[^>]+>/g, '')}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-slate-500">
                    {tmpl.media_filename && (
                      <span className="truncate max-w-[160px]">{tmpl.media_filename}</span>
                    )}
                    {tmpl.recurrence_minutes && tmpl.next_send_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        Próximo: {nextSendLabel(tmpl.next_send_at)}
                      </span>
                    )}
                    {tmpl.recurrence_minutes && !tmpl.next_send_at && (
                      <span className="text-slate-600">Recorrência pausada</span>
                    )}
                  </div>
                </div>

                {/* Actions — tap targets generosos */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => navigate(`/compose?template=${tmpl.id}`)}
                    title="Usar template"
                    className="p-2.5 rounded-lg text-green-400 hover:bg-green-500/10 active:bg-green-500/20 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(tmpl)}
                    title="Editar template"
                    className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-500/10 active:bg-slate-500/20 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id)}
                    title="Excluir template"
                    className="p-2.5 rounded-lg text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal fullscreen no mobile, centralizado no desktop ── */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex flex-col lg:items-center lg:justify-center lg:bg-black/70 lg:p-4">
          {/* No mobile ocupa tela inteira; no desktop flutua centralizado */}
          <div className="bg-surface-800 flex flex-col w-full h-full lg:rounded-xl lg:max-w-4xl lg:max-h-[90vh] lg:h-auto overflow-hidden">

            {/* Cabeçalho — fixo no topo */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-5 border-b border-surface-700 shrink-0">
              <h2 className="font-semibold text-white text-base">
                {modal === 'new' ? 'Novo template' : 'Editar template'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-200 active:bg-surface-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/*
              Corpo com scroll próprio.
              Mobile: coluna única scrollável.
              Desktop: duas colunas, cada uma com seu próprio overflow.
            */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

              {/* Coluna esquerda: nome + editor */}
              <div className="flex-1 flex flex-col overflow-hidden lg:border-r border-surface-700 min-h-0">
                {/* Nome — fixo acima do editor, não entra no scroll dele */}
                <div className="px-4 pt-4 pb-2 shrink-0 border-b border-surface-700/50">
                  <label className="label">Nome do template</label>
                  <input
                    className="input w-full"
                    placeholder="Ex: Aviso diário de abertura"
                    value={form.name}
                    onChange={(e) => setF('name', e.target.value)}
                    maxLength={100}
                  />
                </div>

                {/* Editor ocupa o restante e rola internamente */}
                <div className="flex-1 overflow-hidden min-h-0">
                  <MessageEditor
                    value={editor}
                    onChange={setEditor}
                    existingMediaFilename={existingMediaFilename}
                  />
                </div>
              </div>

              {/* Coluna direita: configuração de recorrência */}
              <div className="lg:w-72 xl:w-80 shrink-0 flex flex-col">
                {/* Toggle accordion só no mobile */}
                <button
                  type="button"
                  className="lg:hidden w-full flex items-center justify-between px-4 py-3 border-t border-surface-700 text-sm font-medium text-slate-300 active:bg-surface-700 transition-colors"
                  onClick={() => setF('recurrPanelOpen', !form.recurrPanelOpen)}
                >
                  <span className="flex items-center gap-2">
                    <RepeatIcon className="w-4 h-4 text-brand-400" />
                    Recorrência
                    {form.recurrenceOption !== null && (
                      <span className="text-xs text-brand-400 font-normal">
                        · {recurrenceLabel(effectiveMinutesForLabel)}
                      </span>
                    )}
                  </span>
                  {form.recurrPanelOpen
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {/* Conteúdo do painel — accordion no mobile, sempre visível no desktop */}
                <div
                  className={`
                    lg:flex flex-col flex-1 overflow-y-auto
                    ${form.recurrPanelOpen ? 'flex' : 'hidden'}
                    border-t border-surface-700 lg:border-t-0
                  `}
                >
                  <div className="p-4 space-y-4">
                    <div className="hidden lg:flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <RepeatIcon className="w-4 h-4 text-brand-400" />
                      Recorrência
                    </div>

                    <div>
                      <label className="label">Intervalo de envio</label>
                      <select
                        className="input w-full"
                        value={form.recurrenceOption === null ? 'none' : String(form.recurrenceOption)}
                        onChange={(e) => {
                          const v = e.target.value
                          setF('recurrenceOption', v === 'none' ? null : parseInt(v))
                        }}
                      >
                        {RECURRENCE_OPTIONS.map((opt) => (
                          <option
                            key={opt.minutes ?? 'none'}
                            value={opt.minutes === null ? 'none' : String(opt.minutes)}
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {form.recurrenceOption === -1 && (
                      <div>
                        <label className="label">Minutos entre envios</label>
                        <input
                          type="number"
                          min={1}
                          className="input w-full"
                          value={form.customMinutes}
                          onChange={(e) => setF('customMinutes', e.target.value)}
                        />
                      </div>
                    )}

                    {form.recurrenceOption !== null && (
                      <>
                        <div>
                          <label className="label flex items-center gap-1.5">
                            <CalendarClock className="w-3.5 h-3.5" />
                            Primeiro envio (São Paulo)
                          </label>
                          <DatePicker
                            selected={form.nextSendAt}
                            onChange={(date) => date && setF('nextSendAt', date)}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={5}
                            dateFormat="dd/MM/yyyy HH:mm"
                            locale="pt-BR"
                            minDate={addMinutes(new Date(), 1)}
                            className="input w-full"
                            calendarClassName="!bg-surface-800 !border-surface-700 !text-slate-100"
                            wrapperClassName="w-full"
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={form.hasEnd}
                              onChange={(e) => setF('hasEnd', e.target.checked)}
                              className="rounded"
                            />
                            Definir data de encerramento
                          </label>
                          {form.hasEnd && (
                            <div className="mt-2">
                              <DatePicker
                                selected={form.recurrenceEndAt}
                                onChange={(date) => setF('recurrenceEndAt', date)}
                                showTimeSelect
                                timeFormat="HH:mm"
                                timeIntervals={5}
                                dateFormat="dd/MM/yyyy HH:mm"
                                locale="pt-BR"
                                minDate={form.nextSendAt}
                                className="input w-full"
                                calendarClassName="!bg-surface-800 !border-surface-700 !text-slate-100"
                                wrapperClassName="w-full"
                                placeholderText="Sem data de fim"
                                isClearable
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {form.recurrenceOption === null && (
                      <p className="text-xs text-slate-500">
                        Sem recorrência — use o botão Enviar no template para agendamentos pontuais.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé — fixo na parte inferior com safe area para iPhones */}
            <div className="px-4 py-3 sm:px-5 safe-area-bottom border-t border-surface-700 flex gap-2 justify-end shrink-0 bg-surface-800">
              <button onClick={closeModal} className="btn-secondary text-sm">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={submitting} className="btn-primary text-sm">
                {submitting ? 'Salvando...' : modal === 'new' ? 'Criar template' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
