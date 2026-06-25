import { getAccountCalendarSettings, upsertCalendarTokens } from './calendar-settings'
import { logCalendarEvent, CalendarLogEvent } from './logger'
import { OutlookCalendarAdapter } from './providers/outlook/adapter'
import { refreshAccessToken } from './providers/outlook/oauth'
import { GoogleCalendarAdapter } from './providers/google/adapter'
import { refreshGoogleToken } from './providers/google/oauth'
import type { CalendarProvider, ResolvedCalendarSettings } from './types'

// Refresh the token if it expires within this window.
const REFRESH_THRESHOLD_MS = 5 * 60 * 1_000

/**
 * Returns the CalendarProvider for the given account, or null if no
 * calendar is configured or the tokens couldn't be decrypted.
 * Callers must treat null as "calendar feature unavailable" for this account.
 *
 * Automatically refreshes the access token when it expires within
 * REFRESH_THRESHOLD_MS, persisting the new tokens to the database.
 */
export async function getCalendarAdapter(
  accountId: string,
): Promise<CalendarProvider | null> {
  let settings = await getAccountCalendarSettings(accountId)
  if (!settings || !settings.isEnabled) return null

  // Auto-refresh if token is expired or expiring soon
  if (
    settings.tokenExpiresAt &&
    settings.refreshToken &&
    settings.tokenExpiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_MS
  ) {
    const refreshed = await tryRefreshToken(accountId, settings)
    if (refreshed) settings = refreshed
  }

  switch (settings.providerType) {
    case 'OUTLOOK':
      return new OutlookCalendarAdapter(settings.accessToken)
    case 'GOOGLE':
      return new GoogleCalendarAdapter(settings.accessToken)
    default:
      return null
  }
}

async function tryRefreshToken(
  accountId: string,
  settings: ResolvedCalendarSettings,
): Promise<ResolvedCalendarSettings | null> {
  try {
    let newAccessToken: string
    let newRefreshToken: string | undefined
    let expiresIn: number

    if (settings.providerType === 'GOOGLE') {
      const tokens = await refreshGoogleToken(settings.refreshToken!)
      newAccessToken = tokens.access_token
      newRefreshToken = tokens.refresh_token
      expiresIn = tokens.expires_in
    } else {
      const tokens = await refreshAccessToken(settings.refreshToken!)
      newAccessToken = tokens.access_token
      newRefreshToken = tokens.refresh_token
      expiresIn = tokens.expires_in
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1_000)

    await upsertCalendarTokens({
      accountId,
      providerType: settings.providerType,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken ?? settings.refreshToken,
      expiresAt,
      email: settings.calendarEmail,
    })

    logCalendarEvent(CalendarLogEvent.TokenRefreshed, {
      accountId,
      provider: settings.providerType,
    })

    return {
      ...settings,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken ?? settings.refreshToken,
      tokenExpiresAt: expiresAt,
    }
  } catch (err) {
    logCalendarEvent(CalendarLogEvent.TokenRefreshFailed, {
      accountId,
      provider: settings.providerType,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
