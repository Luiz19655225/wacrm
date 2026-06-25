import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import { updateCalendarSettings } from '@/lib/calendar/calendar-settings'
import { logCalendarEvent, CalendarLogEvent } from '@/lib/calendar/logger'
import { isMicrosoftConfigured } from '@/lib/calendar/providers/outlook/oauth'
import { isGoogleConfigured } from '@/lib/calendar/providers/google/oauth'

/**
 * GET /api/calendar/settings
 * Returns the current calendar connection state (never exposes tokens).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const { data } = await supabase
      .from('calendar_settings')
      .select('provider_type, calendar_email, timezone, meeting_duration_minutes, is_enabled, connected_at')
      .eq('account_id', accountId)
      .maybeSingle()

    return NextResponse.json({
      connected: !!data,
      microsoft_configured: isMicrosoftConfigured(),
      google_configured: isGoogleConfigured(),
      provider_type: data?.provider_type ?? null,
      calendar_email: data?.calendar_email ?? null,
      timezone: data?.timezone ?? 'America/Sao_Paulo',
      meeting_duration_minutes: data?.meeting_duration_minutes ?? 30,
      is_enabled: data?.is_enabled ?? true,
      connected_at: data?.connected_at ?? null,
    })
  } catch (err) {
    console.error('[calendar/settings GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/calendar/settings
 * Updates timezone, meeting_duration_minutes, or is_enabled.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const body = await request.json() as Record<string, unknown>
    await updateCalendarSettings(accountId, {
      timezone: typeof body.timezone === 'string' ? body.timezone : undefined,
      meetingDurationMinutes:
        typeof body.meeting_duration_minutes === 'number'
          ? body.meeting_duration_minutes
          : undefined,
      isEnabled:
        typeof body.is_enabled === 'boolean' ? body.is_enabled : undefined,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[calendar/settings PATCH]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/calendar/settings
 * Disconnects the calendar (removes row — tokens are gone immediately).
 */
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const { error } = await supabaseAdmin()
      .from('calendar_settings')
      .delete()
      .eq('account_id', accountId)

    if (error) {
      console.error('[calendar/settings DELETE]', error)
      return NextResponse.json({ error: 'Falha ao desconectar.' }, { status: 500 })
    }

    logCalendarEvent(CalendarLogEvent.Disconnected, { accountId })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[calendar/settings DELETE]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
