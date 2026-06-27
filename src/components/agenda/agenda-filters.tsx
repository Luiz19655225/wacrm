"use client"

import type { AppointmentWithContact, AppointmentOrigin, AppointmentStatus } from "@/lib/agenda/types"
import { ORIGIN_LABEL, STATUS_LABEL } from "@/lib/agenda/types"

export interface AgendaFilters {
  userId: string                // "" = todos os responsáveis
  origin: AppointmentOrigin | ""
  status: AppointmentStatus | ""
}

interface AgendaFiltersBarProps {
  appointments: AppointmentWithContact[]
  filters: AgendaFilters
  onChange: (filters: AgendaFilters) => void
}

const SELECT_CLASS =
  "h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground " +
  "focus:outline-none focus:ring-1 focus:ring-ring"

const ALL_STATUSES: AppointmentStatus[] = ['scheduled', 'rescheduled', 'completed', 'cancelled']

export function AgendaFiltersBar({ appointments, filters, onChange }: AgendaFiltersBarProps) {
  // Derive options from the currently loaded month — no extra API call needed
  const users = Array.from(
    new Map(
      appointments
        .filter(a => a.assigned_user_id)
        .map(a => [a.assigned_user_id!, a.assigned_user?.full_name ?? a.assigned_user_id!]),
    ).entries(),
  )

  const origins = Array.from(
    new Set(
      appointments
        .map(a => a.origin)
        .filter((o): o is AppointmentOrigin => o !== null),
    ),
  )

  const hasActiveFilter = !!(filters.userId || filters.origin || filters.status)

  return (
    <div
      data-testid="agenda-filters"
      className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/5 px-4 py-2"
    >
      <span className="shrink-0 text-xs font-medium text-muted-foreground">Filtrar:</span>

      {/* Responsável */}
      <select
        data-testid="filter-user"
        value={filters.userId}
        onChange={e => onChange({ ...filters, userId: e.target.value })}
        className={SELECT_CLASS}
      >
        <option value="">Responsável: Todos</option>
        {users.map(([id, name]) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </select>

      {/* Origem */}
      <select
        data-testid="filter-origin"
        value={filters.origin}
        onChange={e => onChange({ ...filters, origin: e.target.value as AppointmentOrigin | "" })}
        className={SELECT_CLASS}
      >
        <option value="">Origem: Todas</option>
        {origins.map(o => (
          <option key={o} value={o}>{ORIGIN_LABEL[o]}</option>
        ))}
      </select>

      {/* Status */}
      <select
        data-testid="filter-status"
        value={filters.status}
        onChange={e => onChange({ ...filters, status: e.target.value as AppointmentStatus | "" })}
        className={SELECT_CLASS}
      >
        <option value="">Status: Todos</option>
        {ALL_STATUSES.map(s => (
          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
        ))}
      </select>

      {hasActiveFilter && (
        <button
          data-testid="filter-reset"
          type="button"
          onClick={() => onChange({ userId: "", origin: "", status: "" })}
          className="h-7 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
        >
          Limpar
        </button>
      )}
    </div>
  )
}
