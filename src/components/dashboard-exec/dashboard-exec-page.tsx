"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Users,
  CalendarDays,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserX,
} from "lucide-react"

type ResumoData = {
  billing: {
    planCode: string | null
    planName: string | null
    priceCents: number | null
    accessStatus: string
    trialEndsAt: string | null
    nextDueDate: string | null
  }
  contacts: { total: number; newLast30: number }
  agenda: {
    today: number
    thisWeek: number
    thisMonth: number
    confirmationRate: number
    cancellationRate: number
    reschedulingRate: number
    noShowRate: number
  }
  pipeline: {
    openCount: number
    openValue: number
    byStage: Array<{ id: string; name: string; count: number; value: number }>
  }
  whatsapp: { last7days: number; last30days: number }
  integrations: {
    googleCalendar: boolean
    evolutionApi: boolean
    cronConfigured: boolean
  }
}

type SeriesPoint = { date: string; count: number }
type SeriesData = { days: number; messages: SeriesPoint[]; appointments: SeriesPoint[] }

const ACCESS_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "text-green-500" },
  trial: { label: "Trial", className: "text-blue-400" },
  trialing: { label: "Trial", className: "text-blue-400" },
  past_due: { label: "Vencido", className: "text-yellow-500" },
  blocked: { label: "Bloqueado", className: "text-red-500" },
  canceled: { label: "Cancelado", className: "text-red-500" },
  read_only: { label: "Somente leitura", className: "text-yellow-500" },
}

function fmtDate(iso: string): string {
  const parts = iso.split("-")
  return `${parts[2]}/${parts[1]}`
}

function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function IntegrationBadge({ connected, label }: { connected: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`size-2 shrink-0 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
      />
      <span className="text-foreground">{label}</span>
      <span className={`text-xs ${connected ? "text-green-500" : "text-muted-foreground"}`}>
        {connected ? "Conectado" : "Desconectado"}
      </span>
    </div>
  )
}

const TICK_FILL = "#64748b"
const TOOLTIP_STYLE = {
  fontSize: 12,
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: 6,
  color: "#f8fafc",
}

export function DashboardExecPage() {
  const { account } = useAuth()
  const [resumo, setResumo] = useState<ResumoData | null>(null)
  const [series, setSeries] = useState<SeriesData | null>(null)
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard-exec/resumo").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/dashboard-exec/series?days=7").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([r, s]) => {
        setResumo(r as ResumoData | null)
        setSeries(s as SeriesData | null)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch(`/api/dashboard-exec/series?days=${chartDays}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setSeries(s as SeriesData))
      .catch(() => undefined)
  }, [chartDays])

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4 p-4 md:p-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const billing = resumo?.billing
  const contacts = resumo?.contacts
  const agenda = resumo?.agenda
  const pipeline = resumo?.pipeline
  const whatsapp = resumo?.whatsapp
  const integrations = resumo?.integrations

  const accessStatus = billing?.accessStatus ?? "active"
  const statusMeta = ACCESS_STATUS[accessStatus] ?? { label: accessStatus, className: "text-muted-foreground" }

  const chartMsgs = series?.messages ?? []
  const chartApts = series?.appointments ?? []

  return (
    <div
      className="flex h-full flex-col gap-5 overflow-auto p-4 md:p-6"
      data-testid="exec-dashboard"
    >
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Dashboard Executivo</h1>
        <p className="text-sm text-muted-foreground">
          Visão estratégica do negócio
          {account?.name ? ` — ${account.name}` : ""}
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="exec-kpi-strip">
        {/* Plano */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="size-3.5" />
              Plano atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold leading-tight">{billing?.planName ?? "—"}</p>
            <p className={`mt-0.5 text-xs font-medium ${statusMeta.className}`}>
              {statusMeta.label}
            </p>
            {billing?.priceCents && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                R$ {fmtBRL(billing.priceCents / 100)}/mês
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contatos */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              Contatos CRM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{contacts?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              +{contacts?.newLast30 ?? 0} nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        {/* Agenda */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              Compromissos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{agenda?.today ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              hoje · {agenda?.thisWeek ?? 0} semana · {agenda?.thisMonth ?? 0} mês
            </p>
          </CardContent>
        </Card>

        {/* WhatsApp */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="size-3.5" />
              Mensagens WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{whatsapp?.last7days ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              últimos 7d · {whatsapp?.last30days ?? 0} em 30d
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agenda Rates */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Agenda — taxas dos últimos 30 dias
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="exec-rates">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-green-500" />
                Confirmação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">
                {agenda?.confirmationRate ?? 0}%
              </p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
                <XCircle className="size-3.5 text-red-500" />
                Cancelamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">
                {agenda?.cancellationRate ?? 0}%
              </p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="size-3.5 text-blue-400" />
                Reagendamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-400">
                {agenda?.reschedulingRate ?? 0}%
              </p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserX className="size-3.5 text-orange-400" />
                Não compareceu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-400">
                {agenda?.noShowRate ?? 0}%
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <div data-testid="exec-charts">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Evolução diária
          </h2>
          <div className="flex gap-0.5 rounded-md border border-border p-0.5">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                onClick={() => setChartDays(d)}
                className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  chartDays === d
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Messages chart */}
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground">
                Mensagens WhatsApp / dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={chartMsgs}
                  margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDate}
                    tick={{ fontSize: 10, fill: TICK_FILL }}
                    tickLine={false}
                    axisLine={false}
                    interval={chartDays === 7 ? 0 : chartDays === 14 ? 1 : 4}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: TICK_FILL }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(v: unknown) => [`${v}`, "Mensagens"]}
                    labelFormatter={(l) => fmtDate(String(l ?? ""))}
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Appointments chart */}
          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground">
                Compromissos / dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={chartApts}
                  margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDate}
                    tick={{ fontSize: 10, fill: TICK_FILL }}
                    tickLine={false}
                    axisLine={false}
                    interval={chartDays === 7 ? 0 : chartDays === 14 ? 1 : 4}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: TICK_FILL }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(v: unknown) => [`${v}`, "Compromissos"]}
                    labelFormatter={(l) => fmtDate(String(l ?? ""))}
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="count" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pipeline */}
      {pipeline && pipeline.byStage.length > 0 && (
        <div data-testid="exec-pipeline">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pipeline — {pipeline.openCount} abertas · R$ {fmtBRL(pipeline.openValue)}
          </h2>
          <Card size="sm">
            <CardContent className="pt-3">
              <ResponsiveContainer
                width="100%"
                height={Math.max(pipeline.byStage.length * 40, 80)}
              >
                <BarChart
                  data={pipeline.byStage}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: TICK_FILL }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: TICK_FILL }}
                    tickLine={false}
                    axisLine={false}
                    width={130}
                  />
                  <Tooltip
                    formatter={(v: unknown) => [`${v}`, "Negociações"]}
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="count" fill="#34d399" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Integrations Health */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Saúde das integrações
        </h2>
        <Card size="sm">
          <CardContent className="pt-3">
            <div className="flex flex-wrap gap-6" data-testid="exec-integrations">
              <IntegrationBadge
                connected={integrations?.googleCalendar ?? false}
                label="Google Calendar"
              />
              <IntegrationBadge
                connected={integrations?.evolutionApi ?? false}
                label="Evolution API"
              />
              <IntegrationBadge
                connected={integrations?.cronConfigured ?? false}
                label="Cron / Lembretes"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
