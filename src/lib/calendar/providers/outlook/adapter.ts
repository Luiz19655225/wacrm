import type {
  BusyInterval,
  CalendarAppointmentInput,
  CalendarProvider,
  CreatedAppointment,
} from '../../types'
import {
  createCalendarEvent,
  getFreeBusyTimes,
  graphGetMe,
} from './client'

export class OutlookCalendarAdapter implements CalendarProvider {
  constructor(private readonly accessToken: string) {}

  async getProviderEmail(): Promise<string> {
    const me = await graphGetMe(this.accessToken)
    return me.mail ?? me.userPrincipalName ?? 'desconhecido'
  }

  async getFreeBusyIntervals(
    startISO: string,
    endISO: string,
  ): Promise<BusyInterval[]> {
    return getFreeBusyTimes(this.accessToken, startISO, endISO)
  }

  async createAppointment(
    input: CalendarAppointmentInput,
  ): Promise<CreatedAppointment> {
    const { id, onlineMeetingUrl } = await createCalendarEvent(this.accessToken, {
      subject: input.title,
      startISO: input.startISO,
      endISO: input.endISO,
      bodyText: input.description,
      attendeeEmail: input.attendeeEmail,
      attendeeName: input.attendeeName,
      requestOnlineMeeting: input.requestOnlineMeeting,
    })

    return {
      externalEventId: id,
      title: input.title,
      startISO: input.startISO,
      endISO: input.endISO,
      onlineMeetingUrl,
    }
  }
}
