import type {
  BusyInterval,
  CalendarAppointmentInput,
  CalendarProvider,
  CreatedAppointment,
  ExternalCalendarEvent,
} from '../../types'
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleCalendarEvents,
  getGoogleFreeBusy,
  googleGetMe,
  listGoogleCalendars,
  updateGoogleCalendarEvent,
} from './client'

export class GoogleCalendarAdapter implements CalendarProvider {
  constructor(private readonly accessToken: string) {}

  async getProviderEmail(): Promise<string> {
    const me = await googleGetMe(this.accessToken)
    return me.email ?? 'desconhecido'
  }

  async getFreeBusyIntervals(
    startISO: string,
    endISO: string,
  ): Promise<BusyInterval[]> {
    return getGoogleFreeBusy(this.accessToken, startISO, endISO)
  }

  async createAppointment(
    input: CalendarAppointmentInput,
  ): Promise<CreatedAppointment> {
    const { id, onlineMeetingUrl } = await createGoogleCalendarEvent(
      this.accessToken,
      {
        summary: input.title,
        startISO: input.startISO,
        endISO: input.endISO,
        description: input.description,
        attendeeEmail: input.attendeeEmail,
        attendeeName: input.attendeeName,
        requestOnlineMeeting: input.requestOnlineMeeting,
      },
    )

    return {
      externalEventId: id,
      title: input.title,
      startISO: input.startISO,
      endISO: input.endISO,
      onlineMeetingUrl,
    }
  }

  /** Update an existing Google Calendar event. */
  async updateEvent(
    eventId: string,
    input: Omit<CalendarAppointmentInput, 'requestOnlineMeeting'>,
  ): Promise<void> {
    await updateGoogleCalendarEvent(this.accessToken, eventId, {
      summary: input.title,
      startISO: input.startISO,
      endISO: input.endISO,
      description: input.description,
      attendeeEmail: input.attendeeEmail,
      attendeeName: input.attendeeName,
    })
  }

  /** Delete a Google Calendar event. */
  async deleteEvent(eventId: string): Promise<void> {
    await deleteGoogleCalendarEvent(this.accessToken, eventId)
  }

  async listEvents(startISO: string, endISO: string): Promise<ExternalCalendarEvent[]> {
    // Patterns that identify Google's automatic/system calendars.
    // These are never user-created and should not be imported into the CRM agenda.
    const AUTO_CALENDAR_PATTERNS = ['#holiday', '#contacts', '#weather']

    const calendars = await listGoogleCalendars(this.accessToken)
    const relevant  = calendars.filter(
      cal => !AUTO_CALENDAR_PATTERNS.some(pat => cal.id.includes(pat)),
    )

    // Google event IDs are unique within a user's account; the Set guards
    // against the rare case where the same ID appears in more than one list.
    const seen      = new Set<string>()
    const allEvents: ExternalCalendarEvent[] = []

    for (const cal of relevant) {
      const items = await getGoogleCalendarEvents(this.accessToken, cal.id, startISO, endISO)
      for (const item of items) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        allEvents.push({
          externalEventId:  item.id,
          title:            item.title,
          startISO:         item.startISO,
          endISO:           item.endISO,
          onlineMeetingUrl: item.onlineMeetingUrl,
          isCancelled:      item.isCancelled,
        })
      }
    }

    return allEvents
  }
}
