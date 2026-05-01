import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PenSquare, Send, Trash2, RefreshCw, Clock, AlertCircle, RotateCcw, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { listMessages, deleteMessage, sendNow } from '../api/messages'
import type { ScheduledMessage } from '../types'

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto', photo: 'Foto', video: 'Vídeo', document: 'Documento',
  audio: 'Áudio', animation: 'GIF', voice: 'Voz', poll: 'Enquete',
}

function StatusBadge({ status, isDeleted }: { status: string; isDeleted: boolean }) {
  if (isDeleted) {
    return <span className="badge bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded-full">excluída</span>
  }
  return <span className={`badge badge-${status}`}>{status}</span>
}

function formatDate(iso: string) {
  return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

function timeLeftLabel(deletedAt: string): string {
  const deleted = parseISO(deletedAt)
  const expiry = new Date(deleted.getTime() + 24 * 60 * 60 * 1000)
  return formatDistanceToNow(expiry, { locale: ptBR, addSuffix: true })
}

export function Dashboard() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listMessages()
      setMessages(data)
    } catch {
      toast.error('Erro ao carregar mensagens')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Remover esta mensagem? Ela ficará disponível para repetir envio por 24h.')) return
    try {
      await deleteMessage(id)
      toast.success('Mensagem removida')
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m))
    } catch {
      toast.error('Erro ao remover mensagem')
    }
  }

  async function handleHardDelete(id: string) {
    if (!confirm('Excluir permanentemente esta mensagem?')) return
    try {
      await deleteMessage(id)
      toast.success('Mensagem excluída permanentemente')
      setMessages((prev) => prev.filter((m) => m.id !== id))
    } catch {
      toast.error('Erro ao excluir mensagem')
    }
  }

  async function handleSendNow(id: string) {
    if (!confirm('Enviar esta mensagem agora?')) return
    try {
      await sendNow(id)
      toast.success('Mensagem enviada!')
      setMessages((prev) => prev.filter((m) => m.id !== id))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      toast.error(msg ?? 'Erro ao enviar mensagem')
    }
  }

  // Separa mensagens ativas de soft-deleted
  const activeMessages = messages.filter((m) => !m.deleted_at)
  const deletedMessages = messages.filter((m) => m.deleted_at)

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Mensagens Agendadas</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">Atualiza automaticamente a cada 30 segundos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <button onClick={() => navigate('/compose')} className="btn-primary flex items-center gap-2 text-sm py-2 flex-1 sm:flex-none justify-center">
            <PenSquare className="w-4 h-4" />
            Nova mensagem
          </button>
        </div>
      </div>

      {loading && messages.length === 0 ? (
        <div className="card flex items-center justify-center py-16 text-slate-500">
          Carregando...
        </div>
      ) : activeMessages.length === 0 && deletedMessages.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Clock className="w-12 h-12 text-slate-600" />
          <div>
            <p className="text-slate-300 font-medium">Nenhuma mensagem agendada</p>
            <p className="text-slate-500 text-sm mt-1">Crie sua primeira mensagem</p>
          </div>
          <button onClick={() => navigate('/compose')} className="btn-primary text-sm">
            Compor mensagem
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mensagens ativas */}
          {activeMessages.length > 0 && (
            <div className="space-y-3">
              {activeMessages.map((msg) => (
                <MessageCard
                  key={msg.id}
                  msg={msg}
                  isDeleted={false}
                  onEdit={() => navigate(`/compose?edit=${msg.id}`)}
                  onSendNow={() => handleSendNow(msg.id)}
                  onDelete={() => handleDelete(msg.id)}
                  onHardDelete={() => handleHardDelete(msg.id)}
                  onRepeat={undefined}
                />
              ))}
            </div>
          )}

          {/* Mensagens soft-deleted (repetir envio) */}
          {deletedMessages.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-500 mb-2 flex items-start gap-2">
                <RotateCcw className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Excluídas recentemente — disponíveis para repetir envio</span>
              </h2>
              <div className="space-y-3">
                {deletedMessages.map((msg) => (
                  <MessageCard
                    key={msg.id}
                    msg={msg}
                    isDeleted={true}
                    onEdit={undefined}
                    onSendNow={undefined}
                    onDelete={undefined}
                    onHardDelete={() => handleHardDelete(msg.id)}
                    onRepeat={() => navigate(`/compose?repeat=${msg.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface CardProps {
  msg: ScheduledMessage
  isDeleted: boolean
  onEdit?: () => void
  onSendNow?: () => void
  onDelete?: () => void
  onHardDelete?: () => void
  onRepeat?: () => void
}

function MessageCard({ msg, isDeleted, onEdit, onSendNow, onDelete, onHardDelete, onRepeat }: CardProps) {
  return (
    <div className={`card p-3 sm:p-4 ${isDeleted ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-300 bg-surface-700 px-2 py-0.5 rounded">
              {TYPE_LABELS[msg.message_type] ?? msg.message_type}
            </span>
            <StatusBadge status={msg.status} isDeleted={isDeleted} />
            {msg.media_filename && (
              <span className="text-xs text-slate-500 truncate max-w-[120px] sm:max-w-[200px]">
                {msg.media_filename}
              </span>
            )}
          </div>

          {msg.text && (
            <p className="text-sm text-slate-300 mt-2 line-clamp-2 break-words">
              {msg.text.replace(/<[^>]+>/g, '')}
            </p>
          )}

          {msg.error_message && (
            <div className="flex items-start gap-1.5 mt-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{msg.error_message}</span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(msg.scheduled_at)}
            </span>
            {msg.inline_keyboard && msg.inline_keyboard.length > 0 && (
              <span className="text-xs text-slate-500">
                {msg.inline_keyboard.flat().length} botão(ões)
              </span>
            )}
            {isDeleted && msg.deleted_at && (
              <span className="text-xs text-amber-500">
                Expira {timeLeftLabel(msg.deleted_at)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onRepeat && (
            <button
              onClick={onRepeat}
              title="Repetir envio"
              className="p-2.5 rounded-lg text-brand-400 hover:bg-brand-500/10 active:bg-brand-500/20 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {onEdit && msg.status === 'pending' && (
            <button
              onClick={onEdit}
              title="Editar"
              className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-500/10 active:bg-slate-500/20 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onSendNow && msg.status === 'pending' && (
            <button
              onClick={onSendNow}
              title="Enviar agora"
              className="p-2.5 rounded-lg text-green-400 hover:bg-green-500/10 active:bg-green-500/20 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          {onDelete && !isDeleted && (
            <button
              onClick={onDelete}
              title="Excluir"
              className="p-2.5 rounded-lg text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {onHardDelete && isDeleted && (
            <button
              onClick={onHardDelete}
              title="Excluir permanentemente"
              className="p-2.5 rounded-lg text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
