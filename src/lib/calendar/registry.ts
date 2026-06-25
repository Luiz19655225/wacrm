import { getAccountCalendarSettings } from './calendar-settings'
import { OutlookCalendarAdapter } from './providers/outlook/adapter'
import type { CalendarProvider } from './types'

/**
 * Returns the CalendarProvider for the given account, or null if no
 * calendar is configured or the tokens couldn't be decrypted.
 * Callers must treat null as "calendar feature unavailable" for this account.
 */
export async function getCalendarAdapter(
  accountId: string,
): Promise<CalendarProvider | null> {
  const settings = await getAccountCalendarSettings(accountId)
  if (!settings || !settings.isEnabled) return null

  switch (settings.providerType) {
    case 'OUTLOOK':
      return new OutlookCalendarAdapter(settings.accessToken)
    default:
      return null
  }
}
