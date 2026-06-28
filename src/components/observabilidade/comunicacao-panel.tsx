"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BellRing, CheckCircle2, AlertCircle, RefreshCw, MessageSquare } from "lucide-react"
import { relativeTime } from "@/lib/agenda/types"
import type { CommEventType } from "@/lib/agenda/types"
import { cn } from "@/lib/utils"

interface CommStats {
  total: number
  byEventType: Record<CommEventType, number>
  totalSent: number
  totalErrors: number
  errorRate: number
}

interface CommEntry {
  id: string
  event_type: CommEventType
  channel: string | null
  old_status: string | null
  new_status: string | null
  message: string
  created_at: string
}

interface CommData {
  days: number
  stats: CommStats
  recent: CommEntry[]
}

const EVENT_LABEL: Record<CommEventType, string> = {
  reminder_sent:          'Lembrete enviado',
  confirmation_sent:      'Confirmação enviada',
  confirmation_received:  'Confirmação recebida',
  status_changed:         'Status alterado',
  send_error:             'Erro de envio',
  note_added:             'Nota adicionada',
}

const EVENT_ICON: Record<CommEventType, React.ElementType> = {
  reminder_sent:         BellRing,
  confirmation_sent:     CheckCircle2,
  confirmation_received: CheckCircle2,
  status_changed:        RefreshCw,
  send_error:            AlertCircle,
  note_added:            MessageSquare,
}

const EVENT_COLOR: Record<CommEventType, string> = {
  reminder_sent:         'text-blue-400',
  confirmation_sent:     'text-green-400',
  confirmation_received: 'text-green-400',
  status_changed:        'text-yellow-400',
  send_error:            'text-red-400',
  note_added:            'text-muted-foreground',
}

const DAYS_OPTIONS = [7, 14, 30] as const
type DaysOption = typeof DAYS_OPTIONS[number]

export function ComunicacaoPanel() {
  const [days, setDays] = useState<DaysOption>(7)
  const [data, setData] = useState<CommData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (d: DaysOption) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/observabilidade/comunicacao?days=${d}`)
      if (!res.ok) return
      setData(await res.json() as CommData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(days) }, [days, load])

  const stats = data?.stats

  return (
    <div className="space-y-6" data-testid="obs-comunicacao">
      {/* Days selector */}
      <div className="flex gap-2">
        {DAYS_OPTIONS.map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              days === d
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {d} dias
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card size="sm">
              <CardContent className="flex flex-col gap-1 pt-1">
                <span className="text-xs text-muted-foreground">Total de eventos</span>
                <span className="text-2xl font-semibold tabular-nums">{stats?.total ?? 0}</span>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="flex flex-col gap-1 pt-1">
                <span className="text-xs text-green-400">Mensagens enviadas</span>
                <span className="text-2xl font-semibold tabular-nums text-green-400">
                  {stats?.totalSent ?? 0}
                </span>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="flex flex-col gap-1 pt-1">
                <span className="text-xs text-red-400">Erros de envio</span>
                <span className="text-2xl font-semibold tabular-nums text-red-400">
                  {stats?.totalErrors ?? 0}
                </span>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardContent className="flex flex-col gap-1 pt-1">
                <span className="text-xs text-muted-foreground">Taxa de erro</span>
                <span className={cn(
                  "text-2xl font-semibold tabular-nums",
                  (stats?.errorRate ?? 0) > 10 ? "text-red-400" : "text-green-400",
                )}>
                  {stats?.errorRate ?? 0}%
                </span>
              </CardContent>
            </Card>
          </div>

          {/* By event type */}
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Por tipo de evento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(Object.entries(stats?.byEventType ?? {}) as [CommEventType, number][])
                  .filter(([, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([et, count]) => {
                    const Icon = EVENT_ICON[et]
                    return (
                      <div key={et} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("size-3.5 shrink-0", EVENT_COLOR[et])} />
                          <span className="text-muted-foreground">{EVENT_LABEL[et]}</span>
                        </div>
                        <span className="font-medium tabular-nums">{count}</span>
                      </div>
                    )
                  })}
                {Object.values(stats?.byEventType ?? {}).every(c => c === 0) && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum evento de comunicação nos últimos {days} dias.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent log */}
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Log recente</CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.recent ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
              ) : (
                <div className="divide-y divide-border">
                  {(data?.recent ?? []).map(entry => {
                    const Icon = EVENT_ICON[entry.event_type] ?? MessageSquare
                    return (
                      <div key={entry.id} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                        <Icon className={cn("mt-0.5 size-3.5 shrink-0", EVENT_COLOR[entry.event_type])} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{entry.message}</p>
                          {entry.channel && (
                            <p className="text-xs text-muted-foreground">via {entry.channel}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {relativeTime(entry.created_at)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
