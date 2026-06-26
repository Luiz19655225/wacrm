import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import { getCalendarAdapter, getAccountCalendarSettings } from '@/lib/calendar'
import { logCalendarEvent, CalendarLogEvent } from '@/lib/calendar/logger'

/**
 * POST /api/calendar/sync?provider=GOOGLE|OUTLOOK|ALL&days_past=30&days_future=365
 *
 * Syncs the account's configured external calendar into calendar_appointments.
 *
 * Schema constraint: calendar_settings has one row per account_id, so each
 * workspace has exactly one active provider at a time. The ?provider param acts
 * as a filter — if it doesn't match the configured provider, the request is a
 * no-op (returns success with 0 changes). Multi-provider support (multiple rows
 * per account) is an architecture prep for a future migration.
 *
 * SELECT → INSERT or UPDATE — no .upsert() — because the unique index on
 * (account_id, external_event_id) is partial (WHERE external_event_id IS NOT NULL),
 * which Supabase's .upsert({onConflict}) cannot target. Same pattern used for
 * Evolution webhook messages.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const url = new URL(request.url)
    const providerFilter = (url.searchParams.get('provider') ?? 'ALL').toUpperCase()
    const daysPast   = Math.min(Math.abs(parseInt(url.searchParams.get('days_past')   ?? '30',  10)), 365)
    const daysFuture = Math.min(Math.abs(parseInt(url.searchParams.get('days_future') ?? '365', 10)), 730)

    const [adapter, settings] = await Promise.all([
      getCalendarAdapter(accountId),
      getAccountCalendarSettings(accountId),
    ])

    if (!adapter || !settings) {
      return NextResponse.json({ success: true, results: {}, message: 'Nenhum calendário conectado.' })
    }

    const configuredProvider = settings.providerType

    // If caller specified a provider that doesn't match, treat as no-op
    if (providerFilter !== 'ALL' && providerFilter !== configuredProvider) {
      return NextResponse.json({
        success: true,
        results: { [providerFilter]: { inserted: 0, updated: 0, errors: 0 } },
        message: `Provider configurado é ${configuredProvider}, não ${providerFilter}.`,
      })
    }

    const now = new Date()
    const startISO = new Date(now.getTime() - daysPast   * 86_400_000).toISOString()
    const endISO   = new Date(now.getTime() + daysFuture * 86_400_000).toISOString()

    const result = { inserted: 0, updated: 0, errors: 0 }

    try {
      const events = await adapter.listEvents(startISO, endISO)

      if (events.length > 0) {
        const externalIds = events.map(e => e.externalEventId)

        const { data: existing } = await supabaseAdmin()
          .from('calendar_appointments')
          .select('id, external_event_id, status')
          .eq('account_id', accountId)
          .in('external_event_id', externalIds)

        const existingMap = new Map(
          (existing ?? []).map(r => [r.external_event_id as string, r])
        )

        for (const event of events) {
          const row = existingMap.get(event.externalEventId)

          if (!row) {
            const { error } = await supabaseAdmin()
              .from('calendar_appointments')
              .insert({
                account_id:         accountId,
                provider_type:      configuredProvider,
                external_event_id:  event.externalEventId,
                title:              event.title,
                start_at:           event.startISO,
                end_at:             event.endISO,
                online_meeting_url: event.onlineMeetingUrl,
                status:             event.isCancelled ? 'cancelled' : 'scheduled',
                origin:             configuredProvider === 'GOOGLE' ? 'Google' : 'Outlook',
              })

            if (error) { result.errors++ } else { result.inserted++ }
          } else {
            // Preserve user-set status unless provider cancelled the event
            const newStatus = event.isCancelled ? 'cancelled' : row.status
            const { error: updateError } = await supabaseAdmin()
              .from('calendar_appointments')
              .update({
                title:              event.title,
                start_at:           event.startISO,
                end_at:             event.endISO,
                online_meeting_url: event.onlineMeetingUrl,
                status:             newStatus,
                updated_at:         new Date().toISOString(),
              })
              .eq('id', row.id)

            if (updateError) { result.errors++ } else { result.updated++ }
          }
        }
      }

      logCalendarEvent(CalendarLogEvent.AvailabilityQueried, {
        accountId,
        provider: configuredProvider,
        eventsFetched: events.length,
        inserted: result.inserted,
        updated: result.updated,
      })
    } catch (err) {
      result.errors++
      logCalendarEvent(CalendarLogEvent.AvailabilityError, {
        accountId,
        provider: configuredProvider,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    return NextResponse.json({ success: true, results: { [configuredProvider]: result } })
  } catch (err) {
    console.error('[calendar/sync POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
