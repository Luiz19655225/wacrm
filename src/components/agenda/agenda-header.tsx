"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react"

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

interface AgendaHeaderProps {
  year: number
  month: number  // 0-based
  syncing: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSync: () => void
  onNew?: () => void
}

export function AgendaHeader({
  year,
  month,
  syncing,
  onPrev,
  onNext,
  onToday,
  onSync,
  onNew,
}: AgendaHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={onPrev} aria-label="Mês anterior">
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="min-w-36 text-center text-sm font-semibold text-foreground">
          {MONTHS_PT[month]} {year}
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={onNext} aria-label="Próximo mês">
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onToday} className="ml-1 text-xs">
          Hoje
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {onNew && (
          <Button
            size="sm"
            onClick={onNew}
            className="gap-1.5"
            data-testid="novo-compromisso-btn"
          >
            <Plus className="size-3.5" />
            Novo compromisso
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          disabled={syncing}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando…" : "Sincronizar"}
        </Button>
      </div>
    </div>
  )
}
