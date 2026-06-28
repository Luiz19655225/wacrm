"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, CalendarCheck2, Briefcase, Download } from "lucide-react"
import { fmtNumber, fmtDate } from "../chart-config"
import { exportCsv } from "../export-csv"
import type { DateRange } from "../analytics-filters"

interface ClienteKpis {
  totalContacts: number
  newInPeriod: number
  withAppointments: number
  withDeals: number
}

interface ContactRow {
  id: string
  name: string | null
  phone: string | null
  appointments: number
  lastAt: string
}

interface ClientesData {
  kpis: ClienteKpis
  topByAppointments: ContactRow[]
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

export function ClientesTab({ range }: Props) {
  const [data, setData] = useState<ClientesData | null>(null)
  const [loading, setLoading] = useState(true)
  const ctrlRef = useRef<AbortController | null>(null)

  const load = useCallback(async (from: string, to: string) => {
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true)
    try {
      const r = await fetch(`/api/analytics/clientes?from=${from}&to=${to}`, { signal: ctrl.signal })
      if (!ctrl.signal.aborted) setData(r.ok ? await r.json() as ClientesData : null)
    } catch { /* aborted or network error */ } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => { void load(range.from, range.to) }, [range.from, range.to, load])

  if (loading) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Carregando…</div>
  if (!data) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Erro ao carregar dados.</div>

  const { kpis, topByAppointments } = data

  return (
    <div className="space-y-6" data-testid="tab-clientes">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <KpiCard icon={Users}          label="Total de contatos"     value={fmtNumber(kpis.totalContacts)}   color="text-muted-foreground" />
        <KpiCard icon={UserPlus}       label="Novos no período"      value={fmtNumber(kpis.newInPeriod)}     color="text-blue-400" />
        <KpiCard icon={CalendarCheck2} label="Com compromisso"       value={fmtNumber(kpis.withAppointments)} color="text-green-400" />
        <KpiCard icon={Briefcase}      label="Com negociação"        value={fmtNumber(kpis.withDeals)}       color="text-violet-400" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Clientes mais ativos no período</CardTitle>
            <button
              onClick={() => exportCsv(topByAppointments, `clientes-ativos-${range.from}.csv`)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Download className="size-3" /> CSV
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {topByAppointments.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum atendimento no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">#</th>
                    <th className="px-4 py-2 text-left font-medium">Nome</th>
                    <th className="px-4 py-2 text-left font-medium">Telefone</th>
                    <th className="px-4 py-2 text-right font-medium">Compromissos</th>
                    <th className="px-4 py-2 text-right font-medium">Último</th>
                  </tr>
                </thead>
                <tbody>
                  {topByAppointments.map((c, i) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium">{c.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.phone ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtNumber(c.appointments)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmtDate(c.lastAt.split('T')[0])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        Clientes inativos / em risco: em breve — requer histórico de interações acumulado.
      </div>
    </div>
  )
}
