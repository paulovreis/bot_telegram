import type { InlineKeyboard, MessageType, PollData } from '../../types'
import { ExternalLink } from 'lucide-react'

interface Props {
  text: string
  messageType: MessageType
  mediaFile: File | null
  inlineKeyboard: InlineKeyboard
  pollData: PollData | null
  disablePreview: boolean
}

function renderHTML(html: string) {
  return { __html: html }
}

export function Preview({ text, messageType, mediaFile, inlineKeyboard, pollData, disablePreview: _dpl }: Props) {
  const hasContent = text || mediaFile || (messageType === 'poll' && pollData)
  const hasButtons = inlineKeyboard.some((row) => row.length > 0)

  if (!hasContent && !hasButtons) {
    return (
      <div className="h-full flex items-center justify-center text-slate-600 text-sm">
        Pré-visualização aparece aqui
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2">
      <div className="max-w-sm ml-auto">
        {/* Bolha da mensagem */}
        <div className="bg-[#2b5278] rounded-xl rounded-tr-sm p-3 space-y-2 shadow-lg">
          {/* Mídia */}
          {mediaFile && messageType === 'photo' && (
            <img
              src={URL.createObjectURL(mediaFile)}
              alt="preview"
              className="rounded-lg max-h-60 w-full object-cover"
            />
          )}
          {mediaFile && messageType === 'video' && (
            <video
              src={URL.createObjectURL(mediaFile)}
              controls
              className="rounded-lg max-h-60 w-full"
            />
          )}
          {mediaFile && !['photo', 'video'].includes(messageType) && (
            <div className="flex items-center gap-2 bg-[#1e3a56] rounded p-2">
              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
                {mediaFile.name.split('.').pop()?.toUpperCase().slice(0, 3)}
              </div>
              <div>
                <p className="text-xs text-slate-200 truncate max-w-[140px]">{mediaFile.name}</p>
                <p className="text-xs text-slate-400">{(mediaFile.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
          )}

          {/* Poll preview */}
          {messageType === 'poll' && pollData && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-white">{pollData.question || 'Pergunta...'}</p>
              {pollData.options.filter(Boolean).map((opt, i) => (
                <div key={i} className="bg-[#1e3a56] rounded px-3 py-1.5">
                  <p className="text-xs text-slate-200">{opt}</p>
                </div>
              ))}
              <p className="text-xs text-slate-400">{pollData.type === 'quiz' ? 'Quiz' : 'Enquete'} • {pollData.is_anonymous ? 'Anônimo' : 'Público'}</p>
            </div>
          )}

          {/* Texto */}
          {text && (
            <div
              className="text-sm text-slate-100 leading-relaxed break-words [&_b]:font-bold [&_i]:italic [&_u]:underline [&_s]:line-through [&_code]:bg-[#1e3a56] [&_code]:px-1 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_pre]:bg-[#1e3a56] [&_pre]:p-2 [&_pre]:rounded [&_pre]:text-xs [&_pre]:overflow-x-auto [&_a]:text-blue-300 [&_a]:underline [&_tg-spoiler]:bg-[#1e3a56] [&_tg-spoiler]:px-1 [&_tg-spoiler]:rounded [&_tg-spoiler]:cursor-pointer"
              dangerouslySetInnerHTML={renderHTML(text || '')}
            />
          )}

          <p className="text-xs text-slate-500 text-right">
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Botões */}
        {hasButtons && (
          <div className="mt-1 space-y-1">
            {inlineKeyboard.filter((row) => row.length > 0).map((row, rIdx) => (
              <div key={rIdx} className="flex gap-1">
                {row.map((btn, bIdx) => (
                  <div
                    key={bIdx}
                    className="flex-1 flex items-center justify-center gap-1 bg-[#2b5278] hover:bg-[#3a6898] rounded-lg px-3 py-2 text-xs text-[#64aaff] cursor-pointer border border-[#3a6898] transition-colors"
                  >
                    {btn.url && <ExternalLink className="w-3 h-3" />}
                    <span>{btn.text || 'Botão'}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
