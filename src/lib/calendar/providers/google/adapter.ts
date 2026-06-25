import type {
  BusyInterval,
  CalendarAppointmentInput,
  CalendarProvider,
  CreatedAppointment,
} from '../../types'
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleFreeBusy,
  googleGetMe,
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
}
