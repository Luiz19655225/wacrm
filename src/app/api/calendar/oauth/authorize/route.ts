import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/whatsapp/encryption'
import { getAuthorizationUrl, isMicrosoftConfigured } from '@/lib/calendar/providers/outlook/oauth'
import { logCalendarEvent, CalendarLogEvent } from '@/lib/calendar/logger'
import { resolveAccountId } from '@/lib/ai/route-helpers'

/**
 * GET /api/calendar/oauth/authorize
 *
 * Initiates the Microsoft OAuth flow. Encodes the authenticated
 * account's ID into the `state` parameter (encrypted) so the callback
 * can associate the tokens without a server-side session store.
 *
 * The browser navigates here directly; the response is a redirect to
 * Microsoft's authorization endpoint.
 */
export async function GET() {
  if (!isMicrosoftConfigured()) {
    return NextResponse.json(
      { error: 'Integração com Microsoft não configurada. Verifique MICROSOFT_CLIENT_ID e MICROSOFT_CLIENT_SECRET.' },
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

    const state = encrypt(accountId)
    const url = getAuthorizationUrl(state)

    logCalendarEvent(CalendarLogEvent.OAuthStarted, { accountId })

    return NextResponse.redirect(url)
  } catch (err) {
    console.error('[calendar/oauth/authorize]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
