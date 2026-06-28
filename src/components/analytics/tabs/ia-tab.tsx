"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, MessageSquare, FileText, Tag, Search, Calendar, Cpu, Download } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TICK_FILL, TOOLTIP_STYLE, CHART_COLORS, fmtDate, fmtNumber } from "../chart-config"
import { exportCsv } from "../export-csv"
import type { DateRange } from "../analytics-filters"

interface IaKpis {
  suggestReply: number
  summarize: number
  classifyLead: number
  ragSearch: number
  ragIngest: number
  widgetReply: number
  totalTokensInput: number
  totalTokensOutput: number
  totalTokens: number
  widgetAppointments: number
}

interface IaData {
  kpis: IaKpis
  charts: {
    usageByDay: {
      date: string
      suggest_reply: number
      summarize: number
      classify_lead: number
      rag_search: number
      site_widget_reply: number
    }[]
  }
}

interface Props { range: DateRange }

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color?: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1 pt-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`size-3.5 shrink-0 ${color ?? "text-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  )
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function IaTab({ range }: Props) {
  const [data, setData] = useState<IaData | null>(null)
  const [loading, setLoading] = useState(true)
  const ctrlRef = useRef<AbortController | null>(null)

  const load = useCallback(async (from: string, to: string) => {
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true)
    try {
      const r = await fetch(`/api/analytics/ia?from=${from}&to=${to}`, { signal: ctrl.signal })
      if (!ctrl.signal.aborted) setData(r.ok ? await r.json() as IaData : null)
    } catch { /* aborted or network error */ } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => { void load(range.from, range.to) }, [range.from, range.to, load])

  if (loading) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Carregando…</div>
  if (!data) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Erro ao carregar dados.</div>

  const { kpis, charts } = data

  return (
    <div className="space-y-6" data-testid="tab-ia">
      {/* Feature KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        <KpiCard icon={MessageSquare} label="Sugestões de resposta" value={fmtNumber(kpis.suggestReply)}  color="text-blue-400" />
        <KpiCard icon={FileText}      label="Resumos gerados"       value={fmtNumber(kpis.summarize)}     color="text-violet-400" />
        <KpiCard icon={Tag}           label="Leads classificados"   value={fmtNumber(kpis.classifyLead)}  color="text-amber-400" />
        <KpiCard icon={Search}        label="Buscas na base"        value={fmtNumber(kpis.ragSearch)}     color="text-cyan-400" />
        <KpiCard icon={Bot}           label="Respostas Widget"      value={fmtNumber(kpis.widgetReply)}   color="text-green-400" />
        <KpiCard icon={Calendar}      label="Agend. pelo Widget"    value={fmtNumber(kpis.widgetAppointments)} color="text-green-400" />
      </div>

      {/* Tokens */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        <KpiCard icon={Cpu} label="Tokens enviados"   value={fmtTokens(kpis.totalTokensInput)}  color="text-muted-foreground" />
        <KpiCard icon={Cpu} label="Tokens recebidos"  value={fmtTokens(kpis.totalTokensOutput)} color="text-muted-foreground" />
        <KpiCard icon={Cpu} label="Total de tokens"   value={fmtTokens(kpis.totalTokens)}       color="text-muted-foreground" />
      </div>

      {/* Usage chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Uso de IA por dia</CardTitle>
            <button
              onClick={() => exportCsv(charts.usageByDay, `ia-por-dia-${range.from}.csv`)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Download className="size-3" /> CSV
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {charts.usageByDay.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.usageByDay} margin={{ top: 0, right: 4, left: -16, bottom: 0 }}>
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: TICK_FILL }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: TICK_FILL }} />
                <Tooltip labelFormatter={(v) => fmtDate(String(v))} contentStyle={TOOLTIP_STYLE} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="suggest_reply"     name="Sugestão"    fill={CHART_COLORS.blue}   radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="summarize"         name="Resumo"      fill={CHART_COLORS.violet} radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="classify_lead"     name="Classific."  fill={CHART_COLORS.amber}  radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="rag_search"        name="Busca RAG"   fill={CHART_COLORS.cyan}   radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="site_widget_reply" name="Widget"      fill={CHART_COLORS.green}  radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        WAVI (atendente autônomo): em breve — módulo independente nas próximas fases.
      </div>
    </div>
  )
}
