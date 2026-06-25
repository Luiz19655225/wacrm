// Microsoft Graph API client for calendar operations.
// All fetch calls are bare (no SDK) — same pattern as meta-api.ts and
// openai-client.ts in this codebase.

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

interface GraphError {
  error?: { code?: string; message?: string }
}

async function graphFetch<T>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
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
      const body = (await res.json()) as GraphError
      detail = body?.error?.message ?? ''
    } catch {
      detail = await res.text()
    }
    throw new Error(`Graph API error ${res.status} on ${path}: ${detail}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function graphGetMe(
  accessToken: string,
): Promise<{ mail?: string; userPrincipalName?: string }> {
  return graphFetch(accessToken, '/me?$select=mail,userPrincipalName')
}

// ─── Free/busy ────────────────────────────────────────────────────────────────

interface CalendarViewEvent {
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  showAs?: string
}

interface CalendarViewResponse {
  value: CalendarViewEvent[]
}

/**
 * Returns busy intervals from the user's default calendar within the
 * given UTC window. Only events with showAs ≠ 'free' are returned.
 */
export async function getFreeBusyTimes(
  accessToken: string,
  startISO: string,
  endISO: string,
): Promise<{ start: Date; end: Date }[]> {
  const params = new URLSearchParams({
    startDateTime: startISO,
    endDateTime: endISO,
    '$select': 'start,end,showAs',
    '$top': '100',
  })

  const data = await graphFetch<CalendarViewResponse>(
    accessToken,
    `/me/calendarView?${params.toString()}`,
  )

  return (data.value ?? [])
    .filter((e) => e.showAs !== 'free')
    .map((e) => ({
      start: new Date(e.start.dateTime + (e.start.timeZone === 'UTC' ? 'Z' : '')),
      end: new Date(e.end.dateTime + (e.end.timeZone === 'UTC' ? 'Z' : '')),
    }))
}

// ─── Create event ─────────────────────────────────────────────────────────────

interface GraphEvent {
  id: string
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  onlineMeeting?: { joinUrl?: string }
  onlineMeetingUrl?: string
}

export interface CreateEventInput {
  subject: string
  startISO: string
  endISO: string
  bodyText?: string
  attendeeEmail?: string | null
  attendeeName?: string | null
  requestOnlineMeeting: boolean
}

export async function createCalendarEvent(
  accessToken: string,
  input: CreateEventInput,
): Promise<{ id: string; onlineMeetingUrl: string | null }> {
  const body: Record<string, unknown> = {
    subject: input.subject,
    start: { dateTime: input.startISO, timeZone: 'UTC' },
    end: { dateTime: input.endISO, timeZone: 'UTC' },
    body: {
      contentType: 'text',
      content: input.bodyText ?? 'Agendamento criado automaticamente pelo WAVON.',
    },
  }

  if (input.attendeeEmail) {
    body.attendees = [
      {
        emailAddress: {
          address: input.attendeeEmail,
          name: input.attendeeName ?? input.attendeeEmail,
        },
        type: 'required',
      },
    ]
  }

  // Request Teams meeting if possible — silently falls back for personal
  // accounts that don't have Teams; the error won't be thrown here,
  // the meeting URL will just be absent in the response.
  if (input.requestOnlineMeeting) {
    body.isOnlineMeeting = true
    body.onlineMeetingProvider = 'teamsForBusiness'
  }

  const event = await graphFetch<GraphEvent>(accessToken, '/me/events', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const url =
    event.onlineMeeting?.joinUrl ??
    event.onlineMeetingUrl ??
    null

  return { id: event.id, onlineMeetingUrl: url }
}
