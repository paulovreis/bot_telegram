import type { RefObject } from 'react'
import { Bold, Italic, Underline, Strikethrough, Code, Link, Eye, EyeOff } from 'lucide-react'

interface ToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  value: string
}

function wrap(textarea: HTMLTextAreaElement, open: string, close: string, onChange: (v: string) => void) {
  const { selectionStart: s, selectionEnd: e, value } = textarea
  const selected = value.slice(s, e) || 'texto'
  const before = value.slice(0, s)
  const after = value.slice(e)
  const newVal = `${before}${open}${selected}${close}${after}`
  onChange(newVal)
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(s + open.length, s + open.length + selected.length)
  })
}

function insertLink(textarea: HTMLTextAreaElement, onChange: (v: string) => void) {
  const url = prompt('URL do link:')
  if (!url) return
  const { selectionStart: s, selectionEnd: e, value } = textarea
  const selected = value.slice(s, e) || 'texto do link'
  const before = value.slice(0, s)
  const after = value.slice(e)
  const tag = `<a href="${url}">${selected}</a>`
  onChange(`${before}${tag}${after}`)
}

const tools = [
  { icon: Bold,          title: 'Negrito',        open: '<b>',              close: '</b>' },
  { icon: Italic,        title: 'Itálico',         open: '<i>',              close: '</i>' },
  { icon: Underline,     title: 'Sublinhado',      open: '<u>',              close: '</u>' },
  { icon: Strikethrough, title: 'Tachado',         open: '<s>',              close: '</s>' },
  { icon: Code,          title: 'Código',          open: '<code>',           close: '</code>' },
  { icon: Eye,           title: 'Pré-formatado',   open: '<pre>',            close: '</pre>' },
  { icon: EyeOff,        title: 'Spoiler',         open: '<tg-spoiler>',     close: '</tg-spoiler>' },
] as const

export function Toolbar({ textareaRef, onChange, value }: ToolbarProps) {
  void value

  function handleWrap(open: string, close: string) {
    if (!textareaRef.current) return
    wrap(textareaRef.current, open, close, onChange)
  }

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-surface-900 border-b border-surface-700 flex-wrap">
      {tools.map(({ icon: Icon, title, open, close }) => (
        <button
          key={title}
          type="button"
          title={title}
          onClick={() => handleWrap(open, close)}
          className="p-1.5 rounded hover:bg-surface-700 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
      <button
        type="button"
        title="Link"
        onClick={() => textareaRef.current && insertLink(textareaRef.current, onChange)}
        className="p-1.5 rounded hover:bg-surface-700 text-slate-400 hover:text-slate-200 transition-colors"
      >
        <Link className="w-4 h-4" />
      </button>

      <div className="ml-auto flex items-center gap-1 text-xs text-slate-500 pr-1">
        <span>HTML</span>
      </div>
    </div>
  )
}
