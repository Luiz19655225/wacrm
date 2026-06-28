import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import type { AppointmentStatus, AppointmentOrigin } from '@/lib/agenda/types'

type Period = 'today' | 'week' | 'month'

function getPeriodWindow(period: Period): { from: string; to: string } {
  const now = new Date()
  const todayStart = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  )

  if (period === 'today') {
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
    return { from: todayStart.toISOString(), to: todayEnd.toISOString() }
  }

  if (period === 'week') {
    const dayOfWeek = now.getDay() // 0=Sun
    const weekStart = new Date(todayStart)
    weekStart.setUTCDate(weekStart.getUTCDate() - dayOfWeek)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
    return { from: weekStart.toISOString(), to: weekEnd.toISOString() }
  }

  // month
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1) - 1)
  return { from: monthStart.toISOString(), to: monthEnd.toISOString() }
}

/**
 * GET /api/observabilidade/agenda?period=today|week|month
 * Returns KPI stats for the selected period + upcoming appointments (next 24h).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const url = new URL(request.url)
    const period = (['today', 'week', 'month'].includes(url.searchParams.get('period') ?? '')
      ? url.searchParams.get('period')
      : 'today') as Period
    const { from, to } = getPeriodWindow(period)

    const { data: appointments, error } = await supabaseAdmin()
      .from('calendar_appointments')
      .select(`
        id, status, origin, assigned_user_id,
        reminder_24h_sent_at, reminder_2h_sent_at, reminder_30min_sent_at,
        start_at, end_at, title,
        contacts(name, phone)
      `)
      .eq('account_id', accountId)
      .gte('start_at', from)
      .lte('start_at', to)
      .order('start_at', { ascending: true })

    if (error) {
      console.error('[observabilidade/agenda GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar dados.' }, { status: 500 })
    }

    const rows = appointments ?? []

    const byStatus: Record<AppointmentStatus, number> = {
      scheduled: 0, confirmed: 0, rescheduled: 0,
      completed: 0, cancelled: 0, no_show: 0,
    }
    const byOrigin: Partial<Record<AppointmentOrigin, number>> = {}
    const byUser: Record<string, { name: string | null; count: number }> = {}
    let reminders24h = 0, reminders2h = 0, reminders30min = 0

    for (const r of rows) {
      byStatus[r.status as AppointmentStatus]++

      if (r.origin) {
        const o = r.origin as AppointmentOrigin
        byOrigin[o] = (byOrigin[o] ?? 0) + 1
      }

      if (r.assigned_user_id) {
        const uid = r.assigned_user_id as string
        if (!byUser[uid]) byUser[uid] = { name: null, count: 0 }
        byUser[uid].count++
      }

      if (r.reminder_24h_sent_at)  reminders24h++
      if (r.reminder_2h_sent_at)   reminders2h++
      if (r.reminder_30min_sent_at) reminders30min++
    }

    // Resolve user names (single query)
    const userIds = Object.keys(byUser)
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin()
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds)
      for (const p of profiles ?? []) {
        const uid = p.user_id as string
        if (byUser[uid]) byUser[uid].name = p.full_name as string | null
      }
    }

    // Upcoming in next 24h (independent of period)
    const now = new Date()
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const { data: upcoming } = await supabaseAdmin()
      .from('calendar_appointments')
      .select('id, title, start_at, end_at, status, contacts(name, phone)')
      .eq('account_id', accountId)
      .gte('start_at', now.toISOString())
      .lte('start_at', next24h.toISOString())
      .not('status', 'in', '("cancelled","completed","no_show")')
      .order('start_at', { ascending: true })
      .limit(5)

    return NextResponse.json({
      period,
      stats: {
        total: rows.length,
        byStatus,
        byOrigin,
        byUser: Object.entries(byUser).map(([id, v]) => ({ id, ...v })),
        reminders: { h24: reminders24h, h2: reminders2h, min30: reminders30min },
      },
      upcoming: (upcoming ?? []).map(r => ({
        id: r.id as string,
        title: r.title as string,
        start_at: r.start_at as string,
        end_at: r.end_at as string,
        status: r.status as AppointmentStatus,
        contact: (r.contacts as unknown as { name: string | null; phone: string } | null),
      })),
    })
  } catch (err) {
    console.error('[observabilidade/agenda GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
