"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download } from "lucide-react"
import { fmtNumber, fmtCurrency } from "../chart-config"
import { exportCsv } from "../export-csv"
import type { DateRange } from "../analytics-filters"

interface UserRow {
  userId: string
  name: string
  appointments: number
  confirmed: number
  deals: number
  dealValue: number
}

interface UsuariosData { users: UserRow[] }

interface Props { range: DateRange }

export function UsuariosTab({ range }: Props) {
  const [data, setData] = useState<UsuariosData | null>(null)
  const [loading, setLoading] = useState(true)
  const ctrlRef = useRef<AbortController | null>(null)

  const load = useCallback(async (from: string, to: string) => {
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true)
    try {
      const r = await fetch(`/api/analytics/usuarios?from=${from}&to=${to}`, { signal: ctrl.signal })
      if (!ctrl.signal.aborted) setData(r.ok ? await r.json() as UsuariosData : null)
    } catch { /* aborted or network error */ } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => { void load(range.from, range.to) }, [range.from, range.to, load])

  if (loading) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Carregando…</div>
  if (!data) return <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Erro ao carregar dados.</div>

  const { users } = data

  return (
    <div className="space-y-4" data-testid="tab-usuarios">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Ranking de usuários — período selecionado</CardTitle>
            <button
              onClick={() => exportCsv(users, `usuarios-${range.from}.csv`)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Download className="size-3" /> CSV
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma atividade no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">#</th>
                    <th className="px-4 py-2 text-left font-medium">Usuário</th>
                    <th className="px-4 py-2 text-right font-medium">Compromissos</th>
                    <th className="px-4 py-2 text-right font-medium">Confirmados</th>
                    <th className="px-4 py-2 text-right font-medium">Taxa</th>
                    <th className="px-4 py-2 text-right font-medium">Negociações</th>
                    <th className="px-4 py-2 text-right font-medium">Valor gerado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.userId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium">{u.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtNumber(u.appointments)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-green-400">{fmtNumber(u.confirmed)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {u.appointments > 0 ? `${Math.round((u.confirmed / u.appointments) * 100)}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtNumber(u.deals)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtCurrency(u.dealValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
