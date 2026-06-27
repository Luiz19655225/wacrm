"use client"

import { cn } from "@/lib/utils"
import { ORIGIN_BADGE, STATUS_DOT, toLocalTime } from "@/lib/agenda/types"
import type { AppointmentWithContact } from "@/lib/agenda/types"

interface AppointmentCardProps {
  appointment: AppointmentWithContact
  timezone: string
  onClick: () => void
}

export function AppointmentCard({ appointment, timezone, onClick }: AppointmentCardProps) {
  const time = toLocalTime(appointment.start_at, timezone)
  const name = appointment.contact?.name ?? appointment.title
  const badge = appointment.origin ? ORIGIN_BADGE[appointment.origin] : null

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="appointment-card"
      className={cn(
        "w-full rounded px-1.5 py-0.5 text-left text-[11px] leading-tight",
        "flex items-center gap-1",
        "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[appointment.status])} />
      <span className="shrink-0 font-medium">{time}</span>
      <span className="min-w-0 flex-1 truncate text-primary/80">{name}</span>
      {badge && (
        <span
          data-testid="origin-badge"
          className={cn(
            "shrink-0 rounded px-1 text-[9px] font-semibold leading-[1.6]",
            badge.className,
          )}
        >
          {badge.short}
        </span>
      )}
    </button>
  )
}
