// ============================================================
// Agenda WAVON — domain types.
//
// AppointmentWithContact is the single hydrated type consumed
// by every Agenda UI component. UI-only helpers (labels, colors)
// live here alongside the domain types so callers never
// reimplement the same mapping.
// ============================================================

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'rescheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type AppointmentOrigin =
  | 'Widget' | 'WhatsApp' | 'Inbox' | 'Manual'
  | 'Google' | 'Outlook' | 'API'

export type AgendaProviderType = 'GOOGLE' | 'OUTLOOK' | 'LOCAL'

// Preferred communication channel for a single appointment.
export type CommChannel = 'whatsapp' | 'email' | 'both'

// Event types recorded in appointment_comm_log.
export type CommEventType =
  | 'status_changed'
  | 'reminder_sent'
  | 'confirmation_sent'
  | 'confirmation_received'
  | 'send_error'
  | 'note_added'

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
  confirmed_at: string | null
  reason: string | null
  origin: AppointmentOrigin | null
  assigned_user_id: string | null
  notes: string | null
  // Communication preferences (Fase 8.1.4)
  comm_confirmation_enabled: boolean
  comm_reminder_enabled: boolean
  comm_channel: CommChannel
  // Reminder dedup timestamps (Fase 8.3) — NULL = not yet sent; set by cron after successful send
  reminder_24h_sent_at:   string | null
  reminder_2h_sent_at:    string | null
  reminder_30min_sent_at: string | null
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

// Communication log entry (mirrors appointment_comm_log row).
export interface CommLogEntry {
  id: string
  appointment_id: string
  event_type: CommEventType
  channel: string | null
  old_status: string | null
  new_status: string | null
  message: string
  created_at: string
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled:   'Pendente',
  confirmed:   'Confirmado',
  rescheduled: 'Reagendado',
  cancelled:   'Cancelado',
  completed:   'Concluído',
  no_show:     'Não compareceu',
}

export const STATUS_COLOR: Record<AppointmentStatus, string> = {
  scheduled:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  confirmed:   'bg-green-500/15 text-green-400 border-green-500/30',
  rescheduled: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  cancelled:   'bg-red-500/15 text-red-400 border-red-500/30',
  completed:   'bg-muted text-muted-foreground border-border',
  no_show:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

export const STATUS_DOT: Record<AppointmentStatus, string> = {
  scheduled:   'bg-yellow-400',
  confirmed:   'bg-green-400',
  rescheduled: 'bg-blue-400',
  cancelled:   'bg-red-400',
  completed:   'bg-muted-foreground',
  no_show:     'bg-orange-400',
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

export const COMM_CHANNEL_LABEL: Record<CommChannel, string> = {
  whatsapp: 'WhatsApp',
  email:    'E-mail',
  both:     'WhatsApp + E-mail',
}

// Terminal statuses — no further actions are available.
export const TERMINAL_STATUSES: AppointmentStatus[] = ['completed', 'cancelled', 'no_show']

// ─── Date helpers (timezone-aware) ────────────────────────────────────────────

/** Returns "YYYY-MM-DD" in the given IANA timezone. */
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

// ─── Relative time helper (used by comm log) ─────────────────────────────────

/** Returns a short human-readable relative time label in pt-BR. */
export function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'agora mesmo'
  if (mins < 60) return `há ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24)   return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1)  return 'ontem'
  return `há ${d} dias`
}
