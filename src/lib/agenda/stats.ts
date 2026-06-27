import type { AppointmentWithContact, AppointmentStatus, AppointmentOrigin } from './types'

export interface AgendaStats {
  total: number
  byStatus: Record<AppointmentStatus, number>
  byOrigin: Partial<Record<AppointmentOrigin, number>>
  byUser: Record<string, { name: string | null; count: number }>
}

export function getAgendaStats(appointments: AppointmentWithContact[]): AgendaStats {
  const byStatus: Record<AppointmentStatus, number> = {
    scheduled: 0, completed: 0, cancelled: 0, rescheduled: 0,
  }
  const byOrigin: Partial<Record<AppointmentOrigin, number>> = {}
  const byUser: Record<string, { name: string | null; count: number }> = {}

  for (const appt of appointments) {
    byStatus[appt.status]++

    if (appt.origin) {
      byOrigin[appt.origin] = (byOrigin[appt.origin] ?? 0) + 1
    }

    if (appt.assigned_user_id) {
      if (!byUser[appt.assigned_user_id]) {
        byUser[appt.assigned_user_id] = {
          name: appt.assigned_user?.full_name ?? null,
          count: 0,
        }
      }
      byUser[appt.assigned_user_id].count++
    }
  }

  return { total: appointments.length, byStatus, byOrigin, byUser }
}
