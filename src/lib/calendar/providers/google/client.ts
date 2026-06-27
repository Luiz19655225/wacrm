// Google Calendar API client.
// All fetch calls are bare (no SDK) — same pattern as meta-api.ts,
// openai-client.ts and providers/outlook/client.ts in this codebase.

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
const USERINFO_URL  = 'https://www.googleapis.com/oauth2/v2/userinfo'

interface GoogleError {
  error?: { code?: number; message?: string; errors?: unknown[] }
}

async function googleFetch<T>(
  accessToken: string,
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    let detail = ''
    try {
      const body = (await res.json()) as GoogleError
      detail = body?.error?.message ?? ''
    } catch {
      detail = await res.text()
    }
    throw new Error(`Google API error ${res.status} on ${url}: ${detail}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function googleGetMe(
  accessToken: string,
): Promise<{ email?: string; name?: string }> {
  return googleFetch(accessToken, USERINFO_URL)
}

// ─── Free/busy ────────────────────────────────────────────────────────────────

interface FreeBusyResponse {
  calendars?: Record<string, { busy?: { start: string; end: string }[] }>
}

/**
 * Returns busy intervals from the user's primary Google Calendar within
 * the given UTC window.
 */
export async function getGoogleFreeBusy(
  accessToken: string,
  startISO: string,
  endISO: string,
): Promise<{ start: Date; end: Date }[]> {
  const body = {
    timeMin: startISO,
    timeMax: endISO,
    items: [{ id: 'primary' }],
  }

  const data = await googleFetch<FreeBusyResponse>(
    accessToken,
    `${CALENDAR_BASE}/freeBusy`,
    { method: 'POST', body: JSON.stringify(body) },
  )

  const busy = data.calendars?.['primary']?.busy ?? []
  return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface GoogleEventInput {
  summary: string
  startISO: string
  endISO: string
  description?: string
  attendeeEmail?: string | null
  attendeeName?: string | null
  requestOnlineMeeting: boolean
}

interface GoogleEvent {
  id: string
  summary: string
  start: { dateTime: string }
  end: { dateTime: string }
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: { entryPointType: string; uri: string }[]
  }
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  input: GoogleEventInput,
): Promise<{ id: string; onlineMeetingUrl: string | null }> {
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description ?? 'Agendamento criado automaticamente pelo WAVON.',
    start: { dateTime: input.startISO, timeZone: 'UTC' },
    end: { dateTime: input.endISO, timeZone: 'UTC' },
  }

  if (input.attendeeEmail) {
    body.attendees = [
      { email: input.attendeeEmail, displayName: input.attendeeName ?? input.attendeeEmail },
    ]
  }

  if (input.requestOnlineMeeting) {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    }
  }

  const url = `${CALENDAR_BASE}/calendars/primary/events${input.requestOnlineMeeting ? '?conferenceDataVersion=1' : ''}`

  const event = await googleFetch<GoogleEvent>(accessToken, url, {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const meetUrl =
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ??
    null

  return { id: event.id, onlineMeetingUrl: meetUrl }
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  input: Omit<GoogleEventInput, 'requestOnlineMeeting'>,
): Promise<void> {
  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startISO, timeZone: 'UTC' },
    end: { dateTime: input.endISO, timeZone: 'UTC' },
  }

  if (input.attendeeEmail) {
    body.attendees = [
      { email: input.attendeeEmail, displayName: input.attendeeName ?? input.attendeeEmail },
    ]
  }

  await googleFetch<GoogleEvent>(
    accessToken,
    `${CALENDAR_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  await googleFetch<void>(
    accessToken,
    `${CALENDAR_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' },
  )
}

// ─── Calendar list (for sync — all-calendars support) ────────────────────────

export interface GoogleCalendarListEntry {
  id: string
  summary: string
  primary?: boolean
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarListEntry[]
}

/**
 * Returns all calendars visible to this user (via calendarList).
 * Used by listEvents() to sync across all user-owned calendars instead of
 * just 'primary'.
 */
export async function listGoogleCalendars(
  accessToken: string,
): Promise<GoogleCalendarListEntry[]> {
  const data = await googleFetch<GoogleCalendarListResponse>(
    accessToken,
    `https://www.googleapis.com/calendar/v3/users/me/calendarList`,
  )
  return data.items ?? []
}

// ─── Event list (for sync) ────────────────────────────────────────────────────

interface GoogleEventsListResponse {
  items?: GoogleEventListItem[]
  nextPageToken?: string
}

interface GoogleEventListItem {
  id: string
  summary?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: { entryPointType: string; uri: string }[]
  }
}

export interface GoogleCalendarEventResult {
  id: string
  title: string
  startISO: string
  endISO: string
  onlineMeetingUrl: string | null
  isCancelled: boolean
}

/**
 * Fetches all events from the given Google Calendar within the UTC window.
 * Pass calendarId = 'primary' for the user's main calendar, or the calendar's
 * full ID for secondary calendars.
 *
 * Includes cancelled events (showDeleted=true) so the sync can mark
 * locally-cached appointments as cancelled when the user removes them.
 * maxResults=2500 covers typical business calendars without pagination.
 */
export async function getGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  startISO: string,
  endISO: string,
): Promise<GoogleCalendarEventResult[]> {
  const params = new URLSearchParams({
    timeMin: startISO,
    timeMax: endISO,
    showDeleted: 'true',
    singleEvents: 'true',
    maxResults: '2500',
    orderBy: 'startTime',
  })

  const data = await googleFetch<GoogleEventsListResponse>(
    accessToken,
    `${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
  )

  return (data.items ?? []).map((item) => {
    const startRaw = item.start?.dateTime ?? item.start?.date ?? ''
    const endRaw   = item.end?.dateTime   ?? item.end?.date   ?? ''
    const meetUrl  =
      item.hangoutLink ??
      item.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ??
      null

    return {
      id:             item.id,
      title:          item.summary ?? '(sem título)',
      startISO:       startRaw ? new Date(startRaw).toISOString() : startISO,
      endISO:         endRaw   ? new Date(endRaw).toISOString()   : endISO,
      onlineMeetingUrl: meetUrl,
      isCancelled:    item.status === 'cancelled',
    }
  })
}
