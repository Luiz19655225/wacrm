import { decrypt, encrypt } from '@/lib/whatsapp/encryption'
import { supabaseAdmin } from './admin-client'
import type { CalendarProviderType, CalendarSettingsRow, ResolvedCalendarSettings } from './types'

export async function getAccountCalendarSettings(
  accountId: string,
): Promise<ResolvedCalendarSettings | null> {
  const { data, error } = await supabaseAdmin()
    .from('calendar_settings')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle()

  if (error || !data) return null

  const row = data as CalendarSettingsRow

  try {
    const accessToken = decrypt(row.access_token_encrypted)
    const refreshToken = row.refresh_token_encrypted
      ? decrypt(row.refresh_token_encrypted)
      : null

    return {
      id: row.id,
      providerType: row.provider_type as CalendarProviderType,
      accessToken,
      refreshToken,
      tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at) : null,
      calendarEmail: row.calendar_email,
      calendarId: row.calendar_id,
      timezone: row.timezone,
      meetingDurationMinutes: row.meeting_duration_minutes,
      isEnabled: row.is_enabled,
    }
  } catch (err) {
    console.error('[calendar] decrypt failed for account', accountId, err)
    return null
  }
}

export async function upsertCalendarTokens(args: {
  accountId: string
  providerType: CalendarProviderType
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  email: string | null
}): Promise<void> {
  const accessTokenEncrypted = encrypt(args.accessToken)
  const refreshTokenEncrypted = args.refreshToken ? encrypt(args.refreshToken) : null

  const { data: existing } = await supabaseAdmin()
    .from('calendar_settings')
    .select('id')
    .eq('account_id', args.accountId)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin()
      .from('calendar_settings')
      .update({
        provider_type: args.providerType,
        access_token_encrypted: accessTokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        token_expires_at: args.expiresAt?.toISOString() ?? null,
        calendar_email: args.email,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', args.accountId)
  } else {
    await supabaseAdmin()
      .from('calendar_settings')
      .insert({
        account_id: args.accountId,
        provider_type: args.providerType,
        access_token_encrypted: accessTokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        token_expires_at: args.expiresAt?.toISOString() ?? null,
        calendar_email: args.email,
      })
  }
}

export async function updateCalendarSettings(
  accountId: string,
  updates: { timezone?: string; meetingDurationMinutes?: number; isEnabled?: boolean },
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.timezone !== undefined) patch.timezone = updates.timezone
  if (updates.meetingDurationMinutes !== undefined) patch.meeting_duration_minutes = updates.meetingDurationMinutes
  if (updates.isEnabled !== undefined) patch.is_enabled = updates.isEnabled

  await supabaseAdmin()
    .from('calendar_settings')
    .update(patch)
    .eq('account_id', accountId)
}
