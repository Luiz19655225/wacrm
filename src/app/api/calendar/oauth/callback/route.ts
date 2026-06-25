import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/whatsapp/encryption'
import { exchangeCodeForTokens, getMicrosoftUserEmail } from '@/lib/calendar/providers/outlook/oauth'
import { exchangeGoogleCode, getGoogleUserEmail } from '@/lib/calendar/providers/google/oauth'
import { upsertCalendarTokens } from '@/lib/calendar/calendar-settings'
import { logCalendarEvent, CalendarLogEvent } from '@/lib/calendar/logger'
import type { CalendarProviderType } from '@/lib/calendar/types'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://www.wavon.com.br'

/**
 * GET /api/calendar/oauth/callback
 *
 * Shared callback for Google and Microsoft OAuth flows.
 * The `state` param encodes { accountId, provider } (AES-256-GCM via
 * /api/calendar/connect) so we can identify the account and route to
 * the correct token exchange without a server-side session store.
 *
 * Backward-compatible: if state decrypts to a plain UUID string (from
 * the original Outlook-only flow), we treat provider as 'OUTLOOK'.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code       = searchParams.get('code')
  const state      = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const failUrl = (reason: string) =>
    NextResponse.redirect(
      `${APP_URL}/settings?tab=agenda&error=${encodeURIComponent(reason)}`,
    )

  if (oauthError) {
    logCalendarEvent(CalendarLogEvent.OAuthError, { oauthError })
    return failUrl('Autorização recusada.')
  }

  if (!code || !state) {
    return failUrl('Parâmetros ausentes na resposta do provedor.')
  }

  // Decrypt state and resolve { accountId, provider }
  let accountId: string
  let provider: CalendarProviderType

  try {
    const raw = decrypt(state)
    try {
      const parsed = JSON.parse(raw) as { accountId: string; provider: string }
      accountId = parsed.accountId
      provider  = parsed.provider as CalendarProviderType
    } catch {
      // Backward-compat: plain UUID from the old authorize route
      accountId = raw
      provider  = 'OUTLOOK'
    }
  } catch {
    return failUrl('Parâmetro de estado inválido.')
  }

  try {
    let accessToken: string
    let refreshToken: string | null
    let expiresAt: Date
    let email: string | null

    if (provider === 'GOOGLE') {
      const tokens = await exchangeGoogleCode(code)
      accessToken  = tokens.access_token
      refreshToken = tokens.refresh_token ?? null
      expiresAt    = new Date(Date.now() + tokens.expires_in * 1_000)
      email        = await getGoogleUserEmail(tokens.access_token)
    } else {
      const tokens = await exchangeCodeForTokens(code)
      accessToken  = tokens.access_token
      refreshToken = tokens.refresh_token ?? null
      expiresAt    = new Date(Date.now() + tokens.expires_in * 1_000)
      email        = await getMicrosoftUserEmail(tokens.access_token)
    }

    await upsertCalendarTokens({
      accountId,
      providerType: provider,
      accessToken,
      refreshToken,
      expiresAt,
      email,
    })

    logCalendarEvent(CalendarLogEvent.OAuthCompleted, { accountId, provider, email })

    return NextResponse.redirect(`${APP_URL}/settings?tab=agenda&connected=1`)
  } catch (err) {
    console.error('[calendar/oauth/callback]', err)
    logCalendarEvent(CalendarLogEvent.OAuthError, {
      accountId,
      provider,
      error: err instanceof Error ? err.message : String(err),
    })
    return failUrl('Erro ao salvar as credenciais. Tente novamente.')
  }
}
