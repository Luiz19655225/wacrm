// ============================================================
// Agenda WAVON — domain types (Fase 8.0).
//
// AppointmentWithContact is the single hydrated type consumed
// by every Agenda UI component. UI-only helpers (labels, colors)
// live here alongside the domain types so callers never
// reimplement the same mapping.
// ============================================================

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
export type AppointmentOrigin =
  | 'Widget' | 'WhatsApp' | 'Inbox' | 'Manual'
  | 'Google' | 'Outlook' | 'API'
export type AgendaProviderType = 'GOOGLE' | 'OUTLOOK' | 'LOCAL'

// ─── Core type ────────────────────────────────────────────────────────────────

export interface AppointmentWithContact {
  id: string
  account_id: string
  conversation_id: string | null
  contact_id: string | null
  provider_type: AgendaProviderType
  external_event_id: string | null
  title: string
  start_at: string        // UTC ISO
  end_at: string          // UTC ISO
  online_meeting_url: string | null
  status: AppointmentStatus
  reason: string | null
  origin: AppointmentOrigin | null
  assigned_user_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Resolved by GET /api/agenda/appointments
  contact: {
    name: string | null
    phone: string
    email: string | null
    company: string | null
  } | null
  assigned_user: {
    full_name: string | null
  } | null
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled:   'Pendente',
  rescheduled: 'Reagendado',
  cancelled:   'Cancelado',
  completed:   'Concluído',
}

export const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  rescheduled: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  cancelled:   'bg-red-500/15 text-red-400 border-red-500/30',
  completed:   'bg-muted text-muted-foreground border-border',
}

export const STATUS_DOT: Record<AppointmentStatus, string> = {
  scheduled:   'bg-yellow-400',
  rescheduled: 'bg-blue-400',
  cancelled:   'bg-red-400',
  completed:   'bg-muted-foreground',
}

export const ORIGIN_LABEL: Record<AppointmentOrigin, string> = {
  Widget:   'Widget',
  WhatsApp: 'WhatsApp',
  Inbox:    'Inbox',
  Manual:   'Manual',
  Google:   'Google Calendar',
  Outlook:  'Outlook',
  API:      'API',
}

// ─── Date helpers (timezone-aware) ────────────────────────────────────────────

/** Returns "YYYY-MM-DD" in the given IANA timezone — used to group
 *  appointments into calendar day cells. */
export function toLocalDateKey(dateISO: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateISO))
}

/** Returns "HH:MM" in the given IANA timezone. */
export function toLocalTime(dateISO: string, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dateISO))
}

/** Returns a human-readable date+time label in pt-BR. */
export function toLocalLabel(dateISO: string, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dateISO))
}

// ─── Origin badge (compact indicators shown inside appointment cards) ─────────

/** Shown only for external-calendar origins to distinguish them at a glance. */
export const ORIGIN_BADGE: Partial<Record<AppointmentOrigin, { short: string; className: string }>> = {
  Google:  { short: 'G', className: 'bg-blue-500/20 text-blue-400' },
  Outlook: { short: 'O', className: 'bg-indigo-500/20 text-indigo-400' },
}

// ─── Duration helper ──────────────────────────────────────────────────────────

/** Returns a human-readable duration, e.g. "30 min", "1h", "1h 30min". */
export function getDurationLabel(startISO: string, endISO: string): string {
  const mins = Math.round(
    (new Date(endISO).getTime() - new Date(startISO).getTime()) / 60_000,
  )
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

/** Groups an array of appointments by local date key ("YYYY-MM-DD"). */
export function groupByDay(
  appointments: AppointmentWithContact[],
  timezone: string,
): Map<string, AppointmentWithContact[]> {
  const map = new Map<string, AppointmentWithContact[]>()
  for (const appt of appointments) {
    const key = toLocalDateKey(appt.start_at, timezone)
    const existing = map.get(key)
    if (existing) {
      existing.push(appt)
    } else {
      map.set(key, [appt])
    }
  }
  return map
}
