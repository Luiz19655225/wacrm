"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarCheck2, CalendarX2, Clock, UserCheck, BellRing, CheckCircle2, XCircle } from "lucide-react"
import { STATUS_LABEL, STATUS_COLOR, toLocalTime } from "@/lib/agenda/types"
import type { AppointmentStatus } from "@/lib/agenda/types"
import { cn } from "@/lib/utils"

type Period = 'today' | 'week' | 'month'

interface UpcomingItem {
  id: string
  title: string
  start_at: string
  end_at: string
  status: AppointmentStatus
  contact: { name: string | null; phone: string } | null
}

interface AgendaData {
  period: Period
  stats: {
    total: number
    byStatus: Record<AppointmentStatus, number>
    byOrigin: Record<string, number>
    byUser: { id: string; name: string | null; count: number }[]
    reminders: { h24: number; h2: number; min30: number }
  }
  upcoming: UpcomingItem[]
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  week:  'Esta semana',
  month: 'Este mês',
}

const DEFAULT_TZ = 'America/Sao_Paulo'

export function AgendaDashboard() {
  const [period, setPeriod] = useState<Period>('today')
  const [data, setData]     = useState<AgendaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timezone, setTimezone] = useState(DEFAULT_TZ)

  useEffect(() => {
    fetch('/api/calendar/settings')
      .then(r => r.ok ? r.json() : null)
      .then((d: { timezone?: string } | null) => { if (d?.timezone) setTimezone(d.timezone) })
      .catch(() => {})
  }, [])

  const load = useCallback(async (p: Period) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/observabilidade/agenda?period=${p}`)
      if (!res.ok) return
      setData(await res.json() as AgendaData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(period) }, [period, load])

  const stats = data?.stats

  return (
    <div className="space-y-6" data-testid="obs-agenda">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['today', 'week', 'month'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ['scheduled', 'Pendentes',    Clock,          'text-yellow-400'],
                ['confirmed', 'Confirmados',  CheckCircle2,   'text-green-400'],
                ['completed', 'Concluídos',   CalendarCheck2, 'text-muted-foreground'],
                ['cancelled', 'Cancelados',   CalendarX2,     'text-red-400'],
                ['no_show',   'Não compareceu', XCircle,      'text-orange-400'],
                ['rescheduled', 'Reagendados', UserCheck,     'text-blue-400'],
              ] as [AppointmentStatus, string, React.ElementType, string][]
            ).map(([status, label, Icon, iconCls]) => (
              <Card key={status} size="sm" data-testid={`kpi-${status}`}>
                <CardContent className="flex flex-col gap-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("size-3.5 shrink-0", iconCls)} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <span className="text-2xl font-semibold tabular-nums">
                    {stats?.byStatus[status] ?? 0}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Reminders + Origin */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Reminders sent */}
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BellRing className="size-4 text-muted-foreground" />
                  Lembretes enviados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {([
                    ['h24',  '24 horas antes'],
                    ['h2',   '2 horas antes'],
                    ['min30','30 min antes'],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium tabular-nums" data-testid={`reminder-${key}`}>
                        {stats?.reminders[key] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By origin */}
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">Por origem</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(stats?.byOrigin ?? {}).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum compromisso no período.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats?.byOrigin ?? {})
                      .sort(([, a], [, b]) => b - a)
                      .map(([origin, count]) => (
                        <div key={origin} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{origin}</span>
                          <span className="font-medium tabular-nums">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Productivity by user */}
          {(stats?.byUser ?? []).length > 0 && (
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">Produtividade por responsável</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(stats?.byUser ?? [])
                    .sort((a, b) => b.count - a.count)
                    .map(u => (
                      <div key={u.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {u.name ?? 'Sem responsável'}
                        </span>
                        <span className="font-medium tabular-nums">{u.count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming appointments */}
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Próximos compromissos (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.upcoming ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum compromisso nas próximas 24 horas.</p>
              ) : (
                <div className="divide-y divide-border">
                  {(data?.upcoming ?? []).map(appt => (
                    <div key={appt.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{appt.title}</p>
                        {appt.contact?.name && (
                          <p className="truncate text-xs text-muted-foreground">{appt.contact.name}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-medium tabular-nums">
                          {toLocalTime(appt.start_at, timezone)}
                        </span>
                        <span className={cn(
                          "rounded-full border px-1.5 py-0.5 text-xs",
                          STATUS_COLOR[appt.status],
                        )}>
                          {STATUS_LABEL[appt.status]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
