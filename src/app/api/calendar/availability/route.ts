import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import {
  getCalendarAdapter,
  getBusinessHours,
  computeAvailableSlots,
  getAccountCalendarSettings,
  logCalendarEvent,
  CalendarLogEvent,
} from '@/lib/calendar'

/**
 * GET /api/calendar/availability?days=7&max=3
 *
 * Returns available time slots for the account's calendar.
 * Used by the Inbox "Agendar" dialog to show free slots to the agent.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const lookAheadDays = Math.min(parseInt(searchParams.get('days') ?? '7', 10), 30)
    const maxSlots = Math.min(parseInt(searchParams.get('max') ?? '6', 10), 10)

    const [adapter, settings, businessHours] = await Promise.all([
      getCalendarAdapter(accountId),
      getAccountCalendarSettings(accountId),
      getBusinessHours(accountId),
    ])

    if (!adapter) {
      return NextResponse.json({ error: 'Agenda não conectada.' }, { status: 404 })
    }

    const now = new Date()
    const endBound = new Date(now.getTime() + lookAheadDays * 24 * 60 * 60_000)

    const busyIntervals = await adapter
      .getFreeBusyIntervals(now.toISOString(), endBound.toISOString())
      .catch((err: unknown) => {
        logCalendarEvent(CalendarLogEvent.AvailabilityError, {
          accountId,
          error: err instanceof Error ? err.message : String(err),
        })
        return []
      })

    const timezone = settings?.timezone ?? businessHours[0]?.timezone ?? 'America/Sao_Paulo'
    const duration = settings?.meetingDurationMinutes ?? 30

    const slots = computeAvailableSlots({
      busyIntervals,
      businessHours,
      durationMinutes: duration,
      timezone,
      from: now,
      lookAheadDays,
      maxSlots,
      sampleIntervalMinutes: 120,
    })

    logCalendarEvent(CalendarLogEvent.AvailabilityQueried, {
      accountId,
      slotsFound: slots.length,
    })

    return NextResponse.json({
      slots,
      duration_minutes: duration,
      timezone,
    })
  } catch (err) {
    console.error('[calendar/availability GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
