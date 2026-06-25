'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Alert } from '@/components/ui/alert';
import type { BusinessHoursConfig } from '@/lib/calendar/types';

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

const TIME_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

function defaultHours(timezone: string): BusinessHoursConfig[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    isOpen: i >= 1 && i <= 5,   // Mon–Fri open by default
    startTime: '09:00',
    endTime: '18:00',
    timezone,
  }))
}

export function BusinessHoursPanel() {
  const [hours, setHours] = useState<BusinessHoursConfig[]>(defaultHours(DEFAULT_TIMEZONE))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/business-hours')
      if (res.ok) {
        const data = await res.json() as { business_hours?: BusinessHoursConfig[] }
        if (data.business_hours && data.business_hours.length > 0) {
          setHours(data.business_hours)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const update = (dayOfWeek: number, patch: Partial<BusinessHoursConfig>) => {
    setHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h)),
    )
    setSaved(false)
  }

  const timezone = hours[0]?.timezone ?? DEFAULT_TIMEZONE

  const setTimezone = (tz: string | null) => {
    if (!tz) return
    setHours((prev) => prev.map((h) => ({ ...h, timezone: tz })))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/business-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_hours: hours }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Falha ao salvar.')
      } else {
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}
      {saved && (
        <Alert>
          <p className="text-sm">Horário comercial salvo.</p>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Fuso horário</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/Sao_Paulo">Brasília (BRT)</SelectItem>
              <SelectItem value="America/Manaus">Manaus (AMT)</SelectItem>
              <SelectItem value="America/Belem">Belém (BRT)</SelectItem>
              <SelectItem value="America/Fortaleza">Fortaleza (BRT)</SelectItem>
              <SelectItem value="America/Recife">Recife (BRT)</SelectItem>
              <SelectItem value="America/Cuiaba">Cuiabá (AMT)</SelectItem>
              <SelectItem value="America/Porto_Velho">Porto Velho (AMT)</SelectItem>
              <SelectItem value="America/Rio_Branco">Rio Branco (ACT)</SelectItem>
              <SelectItem value="America/Noronha">Fernando de Noronha (FNT)</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Horário por dia da semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {hours.map((h) => (
              <div key={h.dayOfWeek} className="grid grid-cols-[120px_1fr] items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={h.isOpen}
                    onChange={(e) => update(h.dayOfWeek, { isOpen: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  {DAY_LABELS[h.dayOfWeek]}
                </label>

                {h.isOpen ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="space-y-0.5">
                      <Label className="text-xs text-muted-foreground">Abertura</Label>
                      <Select
                        value={h.startTime ?? '09:00'}
                        onValueChange={(v) => update(h.dayOfWeek, { startTime: v })}
                      >
                        <SelectTrigger className="h-8 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-muted-foreground mt-4">até</span>
                    <div className="space-y-0.5">
                      <Label className="text-xs text-muted-foreground">Fechamento</Label>
                      <Select
                        value={h.endTime ?? '18:00'}
                        onValueChange={(v) => update(h.dayOfWeek, { endTime: v })}
                      >
                        <SelectTrigger className="h-8 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Fechado</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar horário'}
      </Button>
    </div>
  )
}
