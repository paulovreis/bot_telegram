import { useRef, useState } from 'react'
import { MessageSquare, Image, Video, FileText, Music, Zap, Mic, BarChart3, Keyboard, Eye } from 'lucide-react'
import type { InlineKeyboard, MessageType, ParseMode, PollData } from '../../types'
import { Toolbar } from './Toolbar'
import { InlineKeyboardEditor } from './InlineKeyboard'
import { MediaUpload } from './MediaUpload'
import { PollEditor } from './PollEditor'
import { Preview } from './Preview'

export type { MessageType, ParseMode, InlineKeyboard, PollData }

export interface EditorState {
  messageType: MessageType
  text: string
  parseMode: ParseMode
  mediaFile: File | null
  inlineKeyboard: InlineKeyboard
  pollData: PollData
  disableWebPagePreview: boolean
}

interface Props {
  value: EditorState
  onChange: (state: EditorState) => void
}

const MESSAGE_TYPES: { type: MessageType; label: string; icon: typeof MessageSquare; hasMedia: boolean }[] = [
  { type: 'text',      label: 'Texto',       icon: MessageSquare, hasMedia: false },
  { type: 'photo',     label: 'Foto',        icon: Image,         hasMedia: true },
  { type: 'video',     label: 'Vídeo',       icon: Video,         hasMedia: true },
  { type: 'document',  label: 'Documento',   icon: FileText,      hasMedia: true },
  { type: 'audio',     label: 'Áudio',       icon: Music,         hasMedia: true },
  { type: 'animation', label: 'GIF',         icon: Zap,           hasMedia: true },
  { type: 'voice',     label: 'Voz',         icon: Mic,           hasMedia: true },
  { type: 'poll',      label: 'Enquete',     icon: BarChart3,     hasMedia: false },
]

const TAB_ICONS = [
  { id: 'content', label: 'Conteúdo',  icon: MessageSquare },
  { id: 'buttons', label: 'Botões',    icon: Keyboard },
  { id: 'preview', label: 'Preview',   icon: Eye },
] as const

type Tab = 'content' | 'buttons' | 'preview'

const DEFAULT_POLL: PollData = {
  question: '',
  options: ['', ''],
  is_anonymous: true,
  type: 'regular',
  allows_multiple_answers: false,
}

export function MessageEditor({ value, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [tab, setTab] = useState<Tab>('content')

  function set<K extends keyof EditorState>(key: K, val: EditorState[K]) {
    onChange({ ...value, [key]: val })
  }

  const currentType = MESSAGE_TYPES.find((t) => t.type === value.messageType)!
  const hasMedia = currentType.hasMedia

  return (
    <div className="flex flex-col h-full">
      {/* Type selector */}
      <div className="flex flex-wrap gap-1 p-3 border-b border-surface-700 bg-surface-800">
        {MESSAGE_TYPES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              set('messageType', type)
              set('mediaFile', null)
              if (type === 'poll') set('pollData', DEFAULT_POLL)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              value.messageType === type
                ? 'bg-brand-600 text-white'
                : 'bg-surface-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-700">
        {TAB_ICONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'content' && (
          <div className="p-4 space-y-4">
            {/* Media upload */}
            {hasMedia && (
              <div>
                <label className="label">Arquivo de mídia</label>
                <MediaUpload
                  messageType={value.messageType}
                  value={value.mediaFile}
                  onChange={(f) => set('mediaFile', f)}
                />
              </div>
            )}

            {/* Poll editor */}
            {value.messageType === 'poll' && (
              <PollEditor value={value.pollData} onChange={(p) => set('pollData', p)} />
            )}

            {/* Text / Caption */}
            {value.messageType !== 'poll' && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">
                    {hasMedia ? 'Legenda (opcional)' : 'Mensagem'}
                  </label>
                  <div className="flex items-center gap-2">
                    {!hasMedia && (
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value.disableWebPagePreview}
                          onChange={(e) => set('disableWebPagePreview', e.target.checked)}
                          className="rounded"
                        />
                        Sem preview de link
                      </label>
                    )}
                    <select
                      className="bg-surface-900 border border-surface-700 text-xs text-slate-400 rounded px-1.5 py-1"
                      value={value.parseMode}
                      onChange={(e) => set('parseMode', e.target.value as ParseMode)}
                    >
                      <option value="HTML">HTML</option>
                      <option value="MarkdownV2">MarkdownV2</option>
                    </select>
                  </div>
                </div>
                <div className="border border-surface-700 rounded-lg overflow-hidden">
                  {value.parseMode === 'HTML' && (
                    <Toolbar textareaRef={textareaRef} value={value.text} onChange={(v) => set('text', v)} />
                  )}
                  <textarea
                    ref={textareaRef}
                    className="w-full bg-surface-900 text-slate-100 px-3 py-2.5 text-sm resize-none focus:outline-none placeholder-slate-600 min-h-[160px]"
                    placeholder={hasMedia ? 'Adicione uma legenda...' : 'Digite sua mensagem...'}
                    value={value.text}
                    onChange={(e) => set('text', e.target.value)}
                    maxLength={hasMedia ? 1024 : 4096}
                  />
                  <div className="flex justify-end px-2 py-1 bg-surface-900 border-t border-surface-700">
                    <span className="text-xs text-slate-600">
                      {value.text.length}/{hasMedia ? 1024 : 4096}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'buttons' && (
          <div className="p-4">
            <p className="text-xs text-slate-500 mb-3">
              Adicione botões com links. Os botões aparecem abaixo da mensagem.
            </p>
            <InlineKeyboardEditor
              value={value.inlineKeyboard}
              onChange={(kb) => set('inlineKeyboard', kb)}
            />
          </div>
        )}

        {tab === 'preview' && (
          <div className="min-h-[300px] bg-[#17212b]">
            <Preview
              text={value.text}
              messageType={value.messageType}
              mediaFile={value.mediaFile}
              inlineKeyboard={value.inlineKeyboard}
              pollData={value.messageType === 'poll' ? value.pollData : null}
              disablePreview={value.disableWebPagePreview}
            />
          </div>
        )}
      </div>
    </div>
  )
}
