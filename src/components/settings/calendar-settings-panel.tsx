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
  provider_type: string | null
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
    // Check for OAuth callback result
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === '1') setSuccess(true)
    if (params.get('error')) setError(decodeURIComponent(params.get('error')!))
  }, [load])

  const handleConnect = () => {
    window.location.href = '/api/calendar/oauth/authorize'
  }

  const handleDisconnect = async () => {
    if (!confirm('Desconectar a agenda? Os tokens de acesso serão removidos permanentemente.')) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/calendar/settings', { method: 'DELETE' })
      if (res.ok) {
        setState((s) => s ? { ...s, connected: false, calendar_email: null, connected_at: null } : s)
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

      {/* Connection card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Conta Microsoft (Outlook)</CardTitle>
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

          {state.connected ? (
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
                Conecte sua conta Microsoft para permitir que a IA consulte e crie compromissos
                no Outlook Calendar automaticamente.
              </p>
              <Button
                onClick={handleConnect}
                disabled={!state.microsoft_configured}
              >
                Conectar com Microsoft
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences — only show when connected */}
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
