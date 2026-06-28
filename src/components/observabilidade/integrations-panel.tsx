"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, Clock, CalendarDays, Smartphone, BellRing } from "lucide-react"
import { cn } from "@/lib/utils"
import { relativeTime } from "@/lib/agenda/types"

interface GoogleCalData {
  connected: boolean
  provider: string | null
  timezone: string | null
  connectedAt: string | null
}

interface EvolutionData {
  connected: boolean
  instanceName: string | null
  connectionStatus: string
  updatedAt: string | null
}

interface CronData {
  configured: boolean
  remindersLast24h: number
}

interface IntegrationsData {
  googleCalendar: GoogleCalData
  evolutionApi: EvolutionData
  cron: CronData
}

function StatusBadge({ connected, label }: { connected: boolean; label: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
      connected
        ? "bg-green-500/15 text-green-400"
        : "bg-red-500/15 text-red-400",
    )}>
      {connected ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {label}
    </span>
  )
}

export function IntegrationsPanel() {
  const [data, setData]     = useState<IntegrationsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/observabilidade/integrations')
        if (res.ok) setData(await res.json() as IntegrationsData)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground"
        data-testid="obs-integrations">
        Carregando…
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="obs-integrations">
      {/* Google Calendar */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              Google Calendar
            </span>
            <StatusBadge
              connected={data?.googleCalendar.connected ?? false}
              label={data?.googleCalendar.connected ? 'Conectado' : 'Desconectado'}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-1.5 text-sm">
            {data?.googleCalendar.timezone && (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Timezone</dt>
                <dd className="font-medium">{data.googleCalendar.timezone}</dd>
              </div>
            )}
            {data?.googleCalendar.connectedAt && (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Conectado</dt>
                <dd className="font-medium tabular-nums">
                  {relativeTime(data.googleCalendar.connectedAt)}
                </dd>
              </div>
            )}
            {!data?.googleCalendar.connected && (
              <p className="text-xs text-muted-foreground">
                Configure em Configurações → Agenda → Google Calendar.
              </p>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Evolution API (WhatsApp) */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Smartphone className="size-4 text-muted-foreground" />
              Evolution API (WhatsApp)
            </span>
            <StatusBadge
              connected={data?.evolutionApi.connected ?? false}
              label={data?.evolutionApi.connected ? 'Conectado' : 'Desconectado'}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-1.5 text-sm">
            {data?.evolutionApi.instanceName && (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Instância</dt>
                <dd className="font-mono text-xs">{data.evolutionApi.instanceName}</dd>
              </div>
            )}
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">
                {data?.evolutionApi.connectionStatus ?? '—'}
              </dd>
            </div>
            {data?.evolutionApi.updatedAt && (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Última atualização</dt>
                <dd className="font-medium tabular-nums">
                  {relativeTime(data.evolutionApi.updatedAt)}
                </dd>
              </div>
            )}
            {!data?.evolutionApi.connected && (
              <p className="text-xs text-muted-foreground">
                Configure em Configurações → Canais → Connections.
              </p>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Cron */}
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              Cron — Lembretes Automáticos
            </span>
            <StatusBadge
              connected={data?.cron.configured ?? false}
              label={data?.cron.configured ? 'Configurado' : 'Não configurado'}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <BellRing className="size-3.5" />
                Lembretes nas últimas 24h
              </dt>
              <dd className="font-semibold tabular-nums text-primary" data-testid="cron-reminders-24h">
                {data?.cron.remindersLast24h ?? 0}
              </dd>
            </div>
            {data?.cron.configured ? (
              <p className="text-xs text-muted-foreground">
                Cron externo via cron-job.org. Frequência: a cada 15 minutos.
              </p>
            ) : (
              <p className="text-xs text-red-400">
                AUTOMATION_CRON_SECRET não configurado. Lembretes automáticos inativos.
              </p>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
