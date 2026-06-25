import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/whatsapp/encryption'
import {
  exchangeCodeForTokens,
  getMicrosoftUserEmail,
} from '@/lib/calendar/providers/outlook/oauth'
import { upsertCalendarTokens } from '@/lib/calendar/calendar-settings'
import { logCalendarEvent, CalendarLogEvent } from '@/lib/calendar/logger'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://www.wavon.com.br'

/**
 * GET /api/calendar/oauth/callback
 *
 * Microsoft redirects here after the user grants permission.
 * Decrypts the `state` param to recover the accountId, exchanges the
 * code for tokens, fetches the user's email, and persists everything.
 * Redirects to /settings?tab=agenda on success or with ?error= on failure.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const failUrl = (reason: string) =>
    NextResponse.redirect(`${APP_URL}/settings?tab=agenda&error=${encodeURIComponent(reason)}`)

  if (oauthError) {
    logCalendarEvent(CalendarLogEvent.OAuthError, { oauthError })
    return failUrl('Autorização recusada pelo Microsoft.')
  }

  if (!code || !state) {
    return failUrl('Parâmetros ausentes na resposta do Microsoft.')
  }

  let accountId: string
  try {
    accountId = decrypt(state)
  } catch {
    return failUrl('Parâmetro de estado inválido.')
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const email = await getMicrosoftUserEmail(tokens.access_token)

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1_000)

    await upsertCalendarTokens({
      accountId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      email,
    })

    logCalendarEvent(CalendarLogEvent.OAuthCompleted, { accountId, email })

    return NextResponse.redirect(`${APP_URL}/settings?tab=agenda&connected=1`)
  } catch (err) {
    console.error('[calendar/oauth/callback]', err)
    logCalendarEvent(CalendarLogEvent.OAuthError, {
      accountId,
      error: err instanceof Error ? err.message : String(err),
    })
    return failUrl('Erro ao salvar as credenciais. Tente novamente.')
  }
}
