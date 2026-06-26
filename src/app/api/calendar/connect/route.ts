import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/whatsapp/encryption'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { logCalendarEvent, CalendarLogEvent } from '@/lib/calendar/logger'
import { getGoogleAuthorizationUrl, isGoogleConfigured } from '@/lib/calendar/providers/google/oauth'
import { getAuthorizationUrl, isMicrosoftConfigured } from '@/lib/calendar/providers/outlook/oauth'

/**
 * GET /api/calendar/connect?provider=google|outlook
 *
 * Unified OAuth entry point for all calendar providers.
 * Encodes { accountId, provider } in the state param (AES-256-GCM) so
 * the shared callback route can associate tokens to the right account
 * and know which provider to use for the token exchange.
 */
export async function GET(request: NextRequest) {
  const rawProvider = (request.nextUrl.searchParams.get('provider') ?? 'google').toUpperCase()

  if (rawProvider !== 'GOOGLE' && rawProvider !== 'OUTLOOK') {
    return NextResponse.json(
      { error: 'Parâmetro provider inválido. Use "google" ou "outlook".' },
      { status: 400 },
    )
  }

  const provider = rawProvider as 'GOOGLE' | 'OUTLOOK'

  if (provider === 'GOOGLE' && !isGoogleConfigured()) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não estão configurados.' },
      { status: 503 },
    )
  }

  if (provider === 'OUTLOOK' && !isMicrosoftConfigured()) {
    return NextResponse.json(
      { error: 'MICROSOFT_CLIENT_ID e MICROSOFT_CLIENT_SECRET não estão configurados.' },
      { status: 503 },
    )
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json(
        { error: 'Seu perfil não está vinculado a uma conta.' },
        { status: 403 },
      )
    }

    // Encode both accountId and provider in the state so the callback
    // can route correctly without a server-side session store.
    const state = encrypt(JSON.stringify({ accountId, provider }))

    logCalendarEvent(CalendarLogEvent.OAuthStarted, { accountId, provider })

    const authUrl =
      provider === 'GOOGLE'
        ? getGoogleAuthorizationUrl(state)
        : getAuthorizationUrl(state)

    return NextResponse.redirect(authUrl)
  } catch (err) {
    console.error('[calendar/connect]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
