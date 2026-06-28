"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarCheck2, CalendarX2, Clock, XCircle, UserCheck, Download } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TICK_FILL, TOOLTIP_STYLE, CHART_COLORS, fmtDate, fmtNumber } from "../chart-config"
import { exportCsv } from "../export-csv"
import type { DateRange } from "../analytics-filters"

interface AgendaData {
  kpis: {
    total: number
    confirmed: number
    cancelled: number
    noShow: number
    pending: number
    attendanceRate: number
    cancellationRate: number
    avgMinutesToConfirm: number | null
  }
  charts: {
    appointmentsByDay: { date: string; total: number; confirmed: number; cancelled: number }[]
    byOrigin: { origin: string; count: number }[]
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

function fmtMinutes(min: number | null): string {
  if (min === null) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function AgendaTab({ range }: Props) {
  const [data, setData] = useState<AgendaData | null>(null)
  const [loading, setLoading] = useState(true)
  const ctrlRef = useRef<AbortController | null>(null)

  const load = useCallback(async (from: string, to: string) => {
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true)
    try {
      const r = await fetch(`/api/analytics/agenda?from=${from}&to=${to}`, { signal: ctrl.signal })
      if (!ctrl.signal.aborted) setData(r.ok ? await r.json() as AgendaData : null)
    } catch { /* aborted or network error */ } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => { void load(range.from, range.to) }, [range.from, range.to, load])

  if (loading) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Carregando…</div>
  if (!data) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Erro ao carregar dados.</div>

  const { kpis, charts } = data

  return (
    <div className="space-y-6" data-testid="tab-agenda">
      {/* KPI row 1 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard icon={Clock}          label="Total"          value={fmtNumber(kpis.total)}     color="text-muted-foreground" />
        <KpiCard icon={CalendarCheck2} label="Confirmados"    value={fmtNumber(kpis.confirmed)} color="text-green-400" />
        <KpiCard icon={CalendarX2}     label="Cancelados"     value={fmtNumber(kpis.cancelled)} color="text-red-400" />
        <KpiCard icon={XCircle}        label="Não compareceu" value={fmtNumber(kpis.noShow)}    color="text-orange-400" />
        <KpiCard icon={UserCheck}      label="Pendentes"      value={fmtNumber(kpis.pending)}   color="text-yellow-400" />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        <KpiCard icon={CalendarCheck2} label="Taxa de comparecimento" value={`${kpis.attendanceRate}%`}    color="text-green-400" />
        <KpiCard icon={CalendarX2}     label="Taxa de cancelamento"   value={`${kpis.cancellationRate}%`}  color="text-red-400" />
        <KpiCard icon={Clock}          label="Tempo médio p/ confirmar" value={fmtMinutes(kpis.avgMinutesToConfirm)} color="text-blue-400" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Compromissos por dia</CardTitle>
              <button
                onClick={() => exportCsv(charts.appointmentsByDay, `agenda-por-dia-${range.from}.csv`)}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Download className="size-3" /> CSV
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {charts.appointmentsByDay.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={charts.appointmentsByDay} margin={{ top: 0, right: 4, left: -16, bottom: 0 }}>
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: TICK_FILL }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: TICK_FILL }} />
                  <Tooltip labelFormatter={(v) => fmtDate(String(v))} contentStyle={TOOLTIP_STYLE} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="confirmed" name="Confirmados" fill={CHART_COLORS.green}  radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="cancelled" name="Cancelados"  fill={CHART_COLORS.red}    radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="total"     name="Total"       fill={CHART_COLORS.slate}  radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Por origem</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.byOrigin.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={charts.byOrigin} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: TICK_FILL }} />
                  <YAxis type="category" dataKey="origin" width={70} tick={{ fontSize: 10, fill: TICK_FILL }} />
                  <Tooltip formatter={(v) => [v, 'Compromissos']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill={CHART_COLORS.cyan} radius={[0, 3, 3, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
