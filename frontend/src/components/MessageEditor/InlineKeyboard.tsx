import { Plus, Trash2, GripVertical } from 'lucide-react'
import type { InlineButton, InlineKeyboard as KB } from '../../types'

interface Props {
  value: KB
  onChange: (kb: KB) => void
}

export function InlineKeyboardEditor({ value, onChange }: Props) {
  function addRow() {
    onChange([...value, []])
  }

  function addButton(rowIdx: number) {
    const updated = value.map((row, i) =>
      i === rowIdx ? [...row, { text: 'Botão', url: 'https://' }] : row
    )
    onChange(updated)
  }

  function removeButton(rowIdx: number, btnIdx: number) {
    const updated = value
      .map((row, i) => (i === rowIdx ? row.filter((_, j) => j !== btnIdx) : row))
      .filter((row) => row.length > 0)
    onChange(updated)
  }

  function removeRow(rowIdx: number) {
    onChange(value.filter((_, i) => i !== rowIdx))
  }

  function updateButton(rowIdx: number, btnIdx: number, patch: Partial<InlineButton>) {
    const updated = value.map((row, i) =>
      i === rowIdx
        ? row.map((btn, j) => (j === btnIdx ? { ...btn, ...patch } : btn))
        : row
    )
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      {value.map((row, rIdx) => (
        <div key={rIdx} className="bg-surface-900 rounded-lg border border-surface-700 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <GripVertical className="w-3 h-3" /> Linha {rIdx + 1}
            </span>
            <button type="button" onClick={() => removeRow(rIdx)} className="text-red-400 hover:text-red-300">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {row.map((btn, bIdx) => (
            <div key={bIdx} className="flex gap-2 items-start">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  className="input text-sm"
                  placeholder="Texto do botão"
                  value={btn.text}
                  onChange={(e) => updateButton(rIdx, bIdx, { text: e.target.value })}
                />
                <input
                  className="input text-sm"
                  placeholder="URL (https://...)"
                  value={btn.url ?? ''}
                  onChange={(e) => updateButton(rIdx, bIdx, { url: e.target.value })}
                />
              </div>
              <button type="button" onClick={() => removeButton(rIdx, bIdx)} className="text-red-400 hover:text-red-300 mt-2">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => addButton(rIdx)}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Adicionar botão na linha
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        className="btn-secondary text-sm flex items-center gap-2"
      >
        <Plus className="w-4 h-4" /> Nova linha de botões
      </button>
    </div>
  )
}
