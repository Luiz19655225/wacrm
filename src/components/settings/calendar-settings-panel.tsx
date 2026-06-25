'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CalendarState {
  connected: boolean
  microsoft_configured: boolean
  google_configured: boolean
  provider_type: 'OUTLOOK' | 'GOOGLE' | null
  calendar_email: string | null
  timezone: string | null
  meeting_duration_minutes: number
  is_enabled: boolean
  connected_at: string | null
}

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (BRT)' },
  { value: 'America/Manaus', label: 'Manaus (AMT)' },
  { value: 'America/Belem', label: 'Belém (BRT)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (BRT)' },
  { value: 'America/Recife', label: 'Recife (BRT)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (AMT)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (AMT)' },
  { value: 'America/Boa_Vista', label: 'Boa Vista (AMT)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (ACT)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (FNT)' },
  { value: 'UTC', label: 'UTC' },
]

const DURATIONS = [15, 30, 45, 60, 90, 120]

export function CalendarSettingsPanel() {
  const [state, setState] = useState<CalendarState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/calendar/settings')
      if (res.ok) setState(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === '1') setSuccess(true)
    if (params.get('error')) setError(decodeURIComponent(params.get('error')!))
  }, [load])

  const handleConnect = (provider: 'google' | 'outlook') => {
    window.location.href = `/api/calendar/connect?provider=${provider}`
  }

  const handleDisconnect = async () => {
    if (!confirm('Desconectar a agenda? Os tokens de acesso serão removidos permanentemente.')) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/calendar/settings', { method: 'DELETE' })
      if (res.ok) {
        setState((s) => s ? { ...s, connected: false, provider_type: null, calendar_email: null, connected_at: null } : s)
        setSuccess(false)
      } else {
        setError('Falha ao desconectar. Tente novamente.')
      }
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSave = async () => {
    if (!state) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/calendar/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone: state.timezone,
          meeting_duration_minutes: state.meeting_duration_minutes,
          is_enabled: state.is_enabled,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Falha ao salvar.')
      } else {
        setSuccess(true)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>
  }

  if (!state) {
    return <p className="text-sm text-destructive">Erro ao carregar configurações.</p>
  }

  const connectedToGoogle  = state.connected && state.provider_type === 'GOOGLE'
  const connectedToOutlook = state.connected && state.provider_type === 'OUTLOOK'

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}
      {success && state.connected && (
        <Alert>
          <p className="text-sm">Agenda conectada com sucesso!</p>
        </Alert>
      )}

      {/* Google Calendar card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!state.google_configured && (
            <Alert variant="destructive">
              <p className="text-sm">
                GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não estão configurados.
                Configure-os na Vercel antes de conectar.
              </p>
            </Alert>
          )}

          {connectedToGoogle ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  ✓ Conectado
                </p>
                {state.calendar_email && (
                  <p className="text-xs text-muted-foreground">{state.calendar_email}</p>
                )}
                {state.connected_at && (
                  <p className="text-xs text-muted-foreground">
                    Conectado em {new Date(state.connected_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? 'Desconectando…' : 'Desconectar'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Conecte sua conta Google para que a IA consulte e crie compromissos
                no Google Calendar automaticamente.
                {connectedToOutlook && (
                  <span className="block mt-1 text-amber-600 dark:text-amber-400">
                    ⚠ Conectar o Google substituirá a agenda Outlook atual.
                  </span>
                )}
              </p>
              <Button
                onClick={() => handleConnect('google')}
                disabled={!state.google_configured}
              >
                Conectar Google Agenda
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Microsoft Outlook card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#0078D4" aria-hidden="true">
              <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.33.77.1.42.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6V2.55q0-.44.3-.75.3-.3.75-.3h12.5q.44 0 .75.3.3.31.3.75V10h.65q.47 0 .8.33.32.33.32.8zm-12-8.57v6.7l2 2 2-2V3.43zM7.5 19h9V12.5l-4.5 4.5L7.5 12.5V19zm13.5-9.5V4.5h-8v5h8v-.5z"/>
            </svg>
            Microsoft Outlook Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!state.microsoft_configured && (
            <Alert variant="destructive">
              <p className="text-sm">
                MICROSOFT_CLIENT_ID e MICROSOFT_CLIENT_SECRET não estão configurados.
                Configure-os na Vercel antes de conectar.
              </p>
            </Alert>
          )}

          {connectedToOutlook ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  ✓ Conectado
                </p>
                {state.calendar_email && (
                  <p className="text-xs text-muted-foreground">{state.calendar_email}</p>
                )}
                {state.connected_at && (
                  <p className="text-xs text-muted-foreground">
                    Conectado em {new Date(state.connected_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? 'Desconectando…' : 'Desconectar'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Conecte sua conta Microsoft para usar o Outlook Calendar.
                {connectedToGoogle && (
                  <span className="block mt-1 text-amber-600 dark:text-amber-400">
                    ⚠ Conectar o Outlook substituirá a agenda Google atual.
                  </span>
                )}
              </p>
              <Button
                variant="outline"
                onClick={() => handleConnect('outlook')}
                disabled={!state.microsoft_configured}
              >
                Conectar com Microsoft
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences — only show when any provider is connected */}
      {state.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Preferências de agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="tz">Fuso horário</Label>
              <Select
                value={state.timezone ?? 'America/Sao_Paulo'}
                onValueChange={(v) => { if (v) setState((s) => s ? { ...s, timezone: v } : s) }}
              >
                <SelectTrigger id="tz">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="duration">Duração padrão dos atendimentos</Label>
              <Select
                value={String(state.meeting_duration_minutes)}
                onValueChange={(v) => {
                  if (v) setState((s) => s ? { ...s, meeting_duration_minutes: parseInt(v, 10) } : s)
                }}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} minutos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar preferências'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
