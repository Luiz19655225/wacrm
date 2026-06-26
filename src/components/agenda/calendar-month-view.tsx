"use client"

import { cn } from "@/lib/utils"
import { groupByDay, toLocalDateKey } from "@/lib/agenda/types"
import type { AppointmentWithContact } from "@/lib/agenda/types"
import { AppointmentCard } from "./appointment-card"

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MAX_VISIBLE = 3

interface CalendarMonthViewProps {
  year: number
  month: number  // 0-based
  appointments: AppointmentWithContact[]
  timezone: string
  onAppointmentClick: (appt: AppointmentWithContact) => void
}

export function CalendarMonthView({
  year,
  month,
  appointments,
  timezone,
  onAppointmentClick,
}: CalendarMonthViewProps) {
  const grouped = groupByDay(appointments, timezone)

  // Build the grid: first day of the month → fill leading empty cells
  const firstDay = new Date(year, month, 1).getDay()  // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const todayKey = toLocalDateKey(new Date().toISOString(), timezone)

  // Cells: null = padding before first day
  const cells: (number | null)[] = [
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="flex-1 overflow-auto">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 divide-x divide-border">
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`pad-${idx}`}
                className="min-h-[100px] border-b border-border bg-muted/20"
              />
            )
          }

          // Build the YYYY-MM-DD key for this cell in the workspace timezone
          const mm = String(month + 1).padStart(2, "0")
          const dd = String(day).padStart(2, "0")
          const key = `${year}-${mm}-${dd}`
          const dayAppts = grouped.get(key) ?? []
          const isToday = key === todayKey
          const overflow = dayAppts.length - MAX_VISIBLE

          return (
            <div
              key={key}
              className={cn(
                "min-h-[100px] border-b border-border p-1",
                isToday && "bg-primary/5",
              )}
            >
              <div
                className={cn(
                  "mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {day}
              </div>

              <div className="flex flex-col gap-0.5">
                {dayAppts.slice(0, MAX_VISIBLE).map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    timezone={timezone}
                    onClick={() => onAppointmentClick(appt)}
                  />
                ))}
                {overflow > 0 && (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{overflow} mais
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
