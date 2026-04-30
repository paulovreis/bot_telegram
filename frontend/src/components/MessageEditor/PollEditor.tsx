import { Plus, Trash2 } from 'lucide-react'
import type { PollData } from '../../types'

interface Props {
  value: PollData
  onChange: (p: PollData) => void
}

export function PollEditor({ value, onChange }: Props) {
  function setField<K extends keyof PollData>(key: K, val: PollData[K]) {
    onChange({ ...value, [key]: val })
  }

  function addOption() {
    if (value.options.length >= 10) return
    setField('options', [...value.options, ''])
  }

  function updateOption(i: number, text: string) {
    setField('options', value.options.map((o, idx) => (idx === i ? text : o)))
  }

  function removeOption(i: number) {
    if (value.options.length <= 2) return
    setField('options', value.options.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Pergunta</label>
        <input
          className="input"
          placeholder="Sua pergunta..."
          value={value.question}
          onChange={(e) => setField('question', e.target.value)}
          maxLength={300}
        />
      </div>

      <div>
        <label className="label">Opções</label>
        <div className="space-y-2">
          {value.options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input flex-1"
                placeholder={`Opção ${i + 1}`}
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                maxLength={100}
              />
              {value.options.length > 2 && (
                <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {value.options.length < 10 && (
          <button type="button" onClick={addOption} className="mt-2 text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Adicionar opção
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Tipo</label>
          <select
            className="input"
            value={value.type}
            onChange={(e) => setField('type', e.target.value as PollData['type'])}
          >
            <option value="regular">Regular</option>
            <option value="quiz">Quiz</option>
          </select>
        </div>

        {value.type === 'quiz' && (
          <div>
            <label className="label">Resposta correta</label>
            <select
              className="input"
              value={value.correct_option_id ?? 0}
              onChange={(e) => setField('correct_option_id', Number(e.target.value))}
            >
              {value.options.map((_, i) => (
                <option key={i} value={i}>Opção {i + 1}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={value.is_anonymous}
            onChange={(e) => setField('is_anonymous', e.target.checked)}
          />
          Anônimo
        </label>
        {value.type === 'regular' && (
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={value.allows_multiple_answers}
              onChange={(e) => setField('allows_multiple_answers', e.target.checked)}
            />
            Múltiplas respostas
          </label>
        )}
      </div>
    </div>
  )
}
