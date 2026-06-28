"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Briefcase, DollarSign, TrendingUp, Download } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { TICK_FILL, TOOLTIP_STYLE, CHART_COLORS, fmtDate, fmtNumber, fmtCurrency } from "../chart-config"
import { exportCsv } from "../export-csv"
import type { DateRange } from "../analytics-filters"

interface ComercialData {
  kpis: {
    newContacts: number
    openDeals: number
    openValue: number
    wonDeals: number | null
    wonValue: number | null
    conversionRate: number | null
  }
  charts: {
    contactsByDay: { date: string; count: number }[]
    dealsByStage: { stage: string; count: number; value: number }[]
  }
}

interface Props {
  range: DateRange
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1 pt-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`size-3.5 shrink-0 ${color ?? "text-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </CardContent>
    </Card>
  )
}

export function ComercialTab({ range }: Props) {
  const [data, setData] = useState<ComercialData | null>(null)
  const [loading, setLoading] = useState(true)
  const ctrlRef = useRef<AbortController | null>(null)

  const load = useCallback(async (from: string, to: string) => {
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true)
    try {
      const r = await fetch(`/api/analytics/comercial?from=${from}&to=${to}`, { signal: ctrl.signal })
      if (!ctrl.signal.aborted) setData(r.ok ? await r.json() as ComercialData : null)
    } catch { /* aborted or network error */ } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => { void load(range.from, range.to) }, [range.from, range.to, load])

  if (loading) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Carregando…</div>
  if (!data) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Erro ao carregar dados.</div>

  const { kpis, charts } = data

  return (
    <div className="space-y-6" data-testid="tab-comercial">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        <KpiCard icon={Users}      label="Novos contatos"     value={fmtNumber(kpis.newContacts)} color="text-blue-400" />
        <KpiCard icon={Briefcase}  label="Negociações abertas" value={fmtNumber(kpis.openDeals)} color="text-violet-400" />
        <KpiCard icon={DollarSign} label="Valor em aberto"    value={fmtCurrency(kpis.openValue)} color="text-green-400" />
      </div>

      {/* Mocked KPIs with label */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        <KpiCard icon={TrendingUp} label="Conversões"         value="—" sub="Em breve (requer status 'ganho')" color="text-muted-foreground" />
        <KpiCard icon={TrendingUp} label="Taxa de conversão"  value="—" sub="Em breve" color="text-muted-foreground" />
        <KpiCard icon={DollarSign} label="Receita realizada"  value="—" sub="Em breve (requer status 'ganho')" color="text-muted-foreground" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Contacts by day */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Novos contatos por dia</CardTitle>
              <button
                onClick={() => exportCsv(charts.contactsByDay, `contatos-por-dia-${range.from}.csv`)}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Exportar CSV"
              >
                <Download className="size-3" /> CSV
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {charts.contactsByDay.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={charts.contactsByDay} margin={{ top: 0, right: 4, left: -16, bottom: 0 }}>
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: TICK_FILL }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: TICK_FILL }} />
                  <Tooltip formatter={(v) => [v, 'Contatos']} labelFormatter={(v) => fmtDate(String(v))} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill={CHART_COLORS.blue} radius={[3, 3, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Deals by stage */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Negociações por estágio</CardTitle>
              <button
                onClick={() => exportCsv(charts.dealsByStage, `negociacoes-por-estagio-${range.from}.csv`)}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Exportar CSV"
              >
                <Download className="size-3" /> CSV
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {charts.dealsByStage.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma negociação no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={charts.dealsByStage} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: TICK_FILL }} />
                  <YAxis type="category" dataKey="stage" width={90} tick={{ fontSize: 10, fill: TICK_FILL }} />
                  <Tooltip formatter={(v) => [v, 'Negociações']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill={CHART_COLORS.violet} radius={[0, 3, 3, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
