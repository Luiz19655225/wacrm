export type CalendarProviderType = 'OUTLOOK'
export type AppointmentStatus = 'scheduled' | 'cancelled' | 'completed'

// ─── Slots ────────────────────────────────────────────────────────────────────

export interface TimeSlot {
  startISO: string
  endISO: string
  /** Human-readable label in pt-BR, e.g. "Segunda, 7 de julho às 14:00" */
  label: string
}

// ─── Provider abstraction ─────────────────────────────────────────────────────

export interface CalendarAppointmentInput {
  title: string
  startISO: string
  endISO: string
  description?: string
  attendeeEmail?: string | null
  attendeeName?: string | null
  requestOnlineMeeting: boolean
}

export interface CreatedAppointment {
  externalEventId: string
  title: string
  startISO: string
  endISO: string
  onlineMeetingUrl: string | null
}

export interface BusyInterval {
  start: Date
  end: Date
}

/**
 * Every calendar provider (Outlook, Google, Calendly …) must implement
 * this interface. The rest of the system only speaks CalendarProvider —
 * never a concrete provider class.
 */
export interface CalendarProvider {
  getProviderEmail(): Promise<string>
  getFreeBusyIntervals(startISO: string, endISO: string): Promise<BusyInterval[]>
  createAppointment(input: CalendarAppointmentInput): Promise<CreatedAppointment>
}

// ─── DB row shapes (raw from Supabase) ───────────────────────────────────────

export interface CalendarSettingsRow {
  id: string
  account_id: string
  provider_type: string
  access_token_encrypted: string
  refresh_token_encrypted: string | null
  token_expires_at: string | null
  calendar_email: string | null
  calendar_id: string | null
  timezone: string
  meeting_duration_minutes: number
  is_enabled: boolean
  connected_at: string
  updated_at: string
}

export interface BusinessHoursRow {
  id: string
  account_id: string
  day_of_week: number
  is_open: boolean
  start_time: string | null   // "HH:MM:SS" from Postgres TIME
  end_time: string | null
  timezone: string
  updated_at: string
}

// ─── Resolved / domain types ──────────────────────────────────────────────────

export interface ResolvedCalendarSettings {
  id: string
  providerType: CalendarProviderType
  accessToken: string
  refreshToken: string | null
  tokenExpiresAt: Date | null
  calendarEmail: string | null
  calendarId: string | null
  timezone: string
  meetingDurationMinutes: number
  isEnabled: boolean
}

export interface BusinessHoursConfig {
  dayOfWeek: number      // 0=Sun … 6=Sat
  isOpen: boolean
  startTime: string | null  // "HH:MM"
  endTime: string | null
  timezone: string
}

export interface BusinessHoursStatus {
  isOpen: boolean
  /** Localised description for the AI prompt, e.g. "segunda-feira às 09:00" */
  nextOpenDescription: string | null
}
