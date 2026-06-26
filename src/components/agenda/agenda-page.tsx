"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { AgendaHeader } from "./agenda-header"
import { CalendarMonthView } from "./calendar-month-view"
import { AppointmentPanel } from "./appointment-panel"
import type { AppointmentWithContact } from "@/lib/agenda/types"

const DEFAULT_TIMEZONE = "America/Sao_Paulo"

export function AgendaPage() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const [appointments, setAppointments] = useState<AppointmentWithContact[]>([])
  const [loading, setLoading]   = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const [selected, setSelected] = useState<AppointmentWithContact | null>(null)

  // Compute UTC window for the visible month (full calendar grid = up to ±6 days padding)
  function monthWindow(y: number, m: number) {
    const from = new Date(y, m, 1).toISOString()
    const to   = new Date(y, m + 1, 0, 23, 59, 59).toISOString()
    return { from, to }
  }

  const loadAppointments = useCallback(async (y: number, m: number) => {
    setLoading(true)
    try {
      const { from, to } = monthWindow(y, m)
      const res = await fetch(`/api/agenda/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      if (!res.ok) throw new Error()
      const data = await res.json() as { appointments: AppointmentWithContact[] }
      setAppointments(data.appointments)
    } catch {
      toast.error("Erro ao carregar agendamentos.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAppointments(year, month)
  }, [year, month, loadAppointments])

  function goToPrev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function goToNext() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function goToToday() {
    const now = new Date()
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" })
      if (!res.ok) throw new Error()
      toast.success("Calendário sincronizado.")
      await loadAppointments(year, month)
    } catch {
      toast.error("Erro ao sincronizar calendário.")
    } finally {
      setSyncing(false)
    }
  }

  function handleStatusChange(id: string, status: string) {
    setAppointments(prev =>
      prev.map(a => a.id === id ? { ...a, status: status as AppointmentWithContact["status"] } : a)
    )
    if (selected?.id === id) {
      setSelected(prev => prev ? { ...prev, status: status as AppointmentWithContact["status"] } : prev)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <AgendaHeader
        year={year}
        month={month}
        syncing={syncing}
        onPrev={goToPrev}
        onNext={goToNext}
        onToday={goToToday}
        onSync={handleSync}
      />

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      ) : (
        <CalendarMonthView
          year={year}
          month={month}
          appointments={appointments}
          timezone={DEFAULT_TIMEZONE}
          onAppointmentClick={setSelected}
        />
      )}

      <AppointmentPanel
        appointment={selected}
        timezone={DEFAULT_TIMEZONE}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
