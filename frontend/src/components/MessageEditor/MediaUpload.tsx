import { useRef, useState } from 'react'
import { Upload, X, FileImage, FileVideo, FileAudio, File } from 'lucide-react'
import type { MessageType } from '../../types'

const ACCEPT: Partial<Record<MessageType, string>> = {
  photo:     'image/*',
  video:     'video/*',
  audio:     'audio/*',
  document:  '*/*',
  animation: 'image/gif,video/mp4',
  voice:     'audio/*',
}

const ICONS: Partial<Record<MessageType, typeof File>> = {
  photo: FileImage,
  video: FileVideo,
  audio: FileAudio,
  voice: FileAudio,
}

interface Props {
  messageType: MessageType
  value: File | null
  onChange: (file: File | null) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaUpload({ messageType, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const accept = ACCEPT[messageType] ?? '*/*'
  const Icon = ICONS[messageType] ?? File

  function handleFile(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande. Limite: 50 MB.')
      return
    }
    onChange(file)
  }

  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3 p-3 bg-surface-900 rounded-lg border border-surface-700">
          <Icon className="w-5 h-5 text-brand-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 truncate">{value.name}</p>
            <p className="text-xs text-slate-500">{formatSize(value.size)}</p>
          </div>
          {messageType === 'photo' && (
            <img
              src={URL.createObjectURL(value)}
              alt="preview"
              className="w-12 h-12 object-cover rounded"
            />
          )}
          {messageType === 'video' && (
            <video src={URL.createObjectURL(value)} className="w-16 h-12 object-cover rounded" />
          )}
          <button type="button" onClick={() => onChange(null)} className="text-slate-400 hover:text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          className={`w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 transition-colors ${
            dragOver
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-surface-700 hover:border-surface-500'
          }`}
        >
          <Upload className="w-8 h-8 text-slate-500" />
          <div className="text-center">
            <p className="text-sm text-slate-400">Clique ou arraste o arquivo</p>
            <p className="text-xs text-slate-600 mt-1">Máximo 50 MB</p>
          </div>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
