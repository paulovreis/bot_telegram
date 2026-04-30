import { useEffect, useState } from 'react'
import { Shield, Bot, CheckCircle, XCircle, Eye, EyeOff, Save, Wifi } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { getBotSettings, testBot, updateBotSettings } from '../api/settings'

interface FormData {
  bot_token: string
  chat_id: string
}

export function Settings() {
  const [botTokenSet, setBotTokenSet] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; username?: string; error?: string } | null>(null)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormData>()

  useEffect(() => {
    getBotSettings().then((s) => {
      setBotTokenSet(s.bot_token_set)
      reset({ bot_token: '', chat_id: s.chat_id })
    }).catch(() => toast.error('Erro ao carregar configurações'))
  }, [reset])

  async function onSubmit(data: FormData) {
    try {
      await updateBotSettings(
        data.bot_token.trim() || undefined,
        data.chat_id.trim(),
      )
      if (data.bot_token.trim()) setBotTokenSet(true)
      toast.success('Configurações salvas com sucesso!')
      reset({ bot_token: '', chat_id: data.chat_id })
      setTestResult(null)
    } catch {
      toast.error('Erro ao salvar configurações')
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testBot()
      if (res.ok && res.bot) {
        const b = res.bot as { username?: string; first_name?: string }
        setTestResult({ ok: true, username: b.username ?? b.first_name })
        toast.success(`Bot @${b.username} conectado!`)
      } else {
        setTestResult({ ok: false, error: res.error })
        toast.error(`Falha: ${res.error}`)
      }
    } catch {
      setTestResult({ ok: false, error: 'Erro de conexão' })
      toast.error('Erro ao testar bot')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-brand-400" />
          Configurações do Bot
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          As credenciais são armazenadas criptografadas no banco de dados.
        </p>
      </div>

      {/* Status badge */}
      <div className="card mb-6 flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${botTokenSet ? 'bg-green-400' : 'bg-yellow-400'}`} />
        <div className="flex-1">
          <p className="text-sm text-slate-300">
            {botTokenSet ? 'Token do bot configurado' : 'Token não configurado — funcionalidades limitadas'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-xs text-brand-400">Fernet AES-128</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
        {/* Bot token */}
        <div>
          <label className="label">
            Token do Bot
            {botTokenSet && (
              <span className="ml-2 text-xs text-green-400 font-normal">(já configurado — preencha apenas para alterar)</span>
            )}
          </label>
          <div className="relative">
            <input
              {...register('bot_token')}
              type={showToken ? 'text' : 'password'}
              className="input pr-10"
              placeholder={botTokenSet ? '••••••••••••••••••••••••' : '1234567890:ABCdef...'}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Obtenha o token em @BotFather no Telegram.
          </p>
        </div>

        {/* Chat ID */}
        <div>
          <label className="label">ID do Canal / Chat</label>
          <input
            {...register('chat_id')}
            className="input"
            placeholder="-1001234567890 ou @meucanal"
          />
          <p className="text-xs text-slate-500 mt-1">
            Para canais: use o @username ou o ID numérico (ex: -1001234567890).
          </p>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            testResult.ok
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {testResult.ok
              ? <><CheckCircle className="w-4 h-4" /> Bot @{testResult.username} está online!</>
              : <><XCircle className="w-4 h-4" /> {testResult.error}</>
            }
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Salvando...' : 'Salvar configurações'}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !botTokenSet}
            className="btn-secondary flex items-center gap-2"
          >
            <Wifi className="w-4 h-4" />
            {testing ? 'Testando...' : 'Testar conexão'}
          </button>
        </div>
      </form>

      {/* Info boxes */}
      <div className="mt-6 space-y-3">
        <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-200 mb-2">Como obter o Chat ID</h3>
          <ol className="text-xs text-slate-400 space-y-1 list-decimal pl-4">
            <li>Adicione o bot ao canal como administrador</li>
            <li>Envie uma mensagem no canal</li>
            <li>Acesse: <code className="text-brand-400">https://api.telegram.org/bot{'<TOKEN>'}/getUpdates</code></li>
            <li>Procure por <code className="text-brand-400">"chat":&#123;"id":</code> no resultado</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
