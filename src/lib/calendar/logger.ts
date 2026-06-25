export enum CalendarLogEvent {
  OAuthStarted          = 'oauth.started',
  OAuthCompleted        = 'oauth.completed',
  OAuthError            = 'oauth.error',
  TokenRefreshed        = 'token.refreshed',
  TokenRefreshFailed    = 'token.refresh_failed',
  Disconnected          = 'calendar.disconnected',
  BusinessHoursChecked  = 'business_hours.checked',
  IntentInjected        = 'scheduling.intent_injected',
  AvailabilityQueried   = 'availability.queried',
  AvailabilityError     = 'availability.error',
  AppointmentCreated    = 'appointment.created',
  AppointmentError      = 'appointment.error',
  CrmNoteAdded          = 'crm.note_added',
}

export function logCalendarEvent(
  event: CalendarLogEvent,
  data?: Record<string, unknown>,
): void {
  console.log(
    JSON.stringify({
      scope: 'calendar',
      event,
      timestamp: new Date().toISOString(),
      ...data,
    }),
  )
}
