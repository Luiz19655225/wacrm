"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Inbox, MessageSquare, Download } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TICK_FILL, TOOLTIP_STYLE, CHART_COLORS, fmtDate, fmtNumber } from "../chart-config"
import { exportCsv } from "../export-csv"
import type { DateRange } from "../analytics-filters"

interface ComunicacaoData {
  kpis: { sent: number; received: number; total: number; conversations: number }
  charts: { messagesByDay: { date: string; sent: number; received: number }[] }
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

export function ComunicacaoTab({ range }: Props) {
  const [data, setData] = useState<ComunicacaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const ctrlRef = useRef<AbortController | null>(null)

  const load = useCallback(async (from: string, to: string) => {
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true)
    try {
      const r = await fetch(`/api/analytics/comunicacao?from=${from}&to=${to}`, { signal: ctrl.signal })
      if (!ctrl.signal.aborted) setData(r.ok ? await r.json() as ComunicacaoData : null)
    } catch { /* aborted or network error */ } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => { void load(range.from, range.to) }, [range.from, range.to, load])

  if (loading) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Carregando…</div>
  if (!data) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Erro ao carregar dados.</div>

  const { kpis, charts } = data

  return (
    <div className="space-y-6" data-testid="tab-comunicacao">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <KpiCard icon={Send}          label="Enviadas"        value={fmtNumber(kpis.sent)}          color="text-blue-400" />
        <KpiCard icon={Inbox}         label="Recebidas"       value={fmtNumber(kpis.received)}      color="text-green-400" />
        <KpiCard icon={MessageSquare} label="Total"           value={fmtNumber(kpis.total)}         color="text-muted-foreground" />
        <KpiCard icon={MessageSquare} label="Conversas"       value={fmtNumber(kpis.conversations)} color="text-violet-400" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Volume de mensagens por dia</CardTitle>
            <button
              onClick={() => exportCsv(charts.messagesByDay, `mensagens-por-dia-${range.from}.csv`)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Download className="size-3" /> CSV
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {charts.messagesByDay.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Sem dados no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.messagesByDay} margin={{ top: 0, right: 4, left: -16, bottom: 0 }}>
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: TICK_FILL }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: TICK_FILL }} />
                <Tooltip labelFormatter={(v) => fmtDate(String(v))} contentStyle={TOOLTIP_STYLE} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="sent"     name="Enviadas"  fill={CHART_COLORS.blue}  radius={[3, 3, 0, 0]} maxBarSize={24} />
                <Bar dataKey="received" name="Recebidas" fill={CHART_COLORS.green} radius={[3, 3, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        E-mail: em breve — canal ainda não implementado.
      </div>
    </div>
  )
}
