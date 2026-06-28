import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import { parseRange, buildDateRangeSeries } from '@/lib/analytics/date-range'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const { from, to, fromIso, toIso } = parseRange(new URL(request.url).searchParams)
    const dates = buildDateRangeSeries(from, to)
    const admin = supabaseAdmin()

    const { data: apts } = await admin
      .from('calendar_appointments')
      .select('id, status, start_at, created_at, confirmed_at, origin')
      .eq('account_id', accountId)
      .gte('start_at', fromIso)
      .lte('start_at', toIso)
      .limit(10000)

    const rows = apts ?? []
    const byStatus: Record<string, number> = {}
    for (const a of rows) {
      const s = a.status as string
      byStatus[s] = (byStatus[s] ?? 0) + 1
    }

    const confirmed = byStatus['confirmed'] ?? 0
    const cancelled = byStatus['cancelled'] ?? 0
    const noShow = byStatus['no_show'] ?? 0
    const total = rows.length
    const attended = confirmed
    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0

    // avg time to confirm (minutes) for confirmed appointments
    const confirmedRows = rows.filter(a => a.confirmed_at && a.created_at)
    const avgMinutesToConfirm =
      confirmedRows.length > 0
        ? Math.round(
            confirmedRows.reduce((acc, a) => {
              const diff = new Date(a.confirmed_at as string).getTime() - new Date(a.created_at as string).getTime()
              return acc + diff / 60000
            }, 0) / confirmedRows.length,
          )
        : null

    // appointments by day
    const dayMap = Object.fromEntries(dates.map(d => [d, { total: 0, confirmed: 0, cancelled: 0 }]))
    for (const a of rows) {
      const d = (a.start_at as string).split('T')[0]
      if (d in dayMap) {
        dayMap[d].total++
        if (a.status === 'confirmed') dayMap[d].confirmed++
        if (a.status === 'cancelled') dayMap[d].cancelled++
      }
    }

    // by origin
    const originMap: Record<string, number> = {}
    for (const a of rows) {
      const o = (a.origin as string) ?? 'Manual'
      originMap[o] = (originMap[o] ?? 0) + 1
    }

    return NextResponse.json({
      kpis: {
        total,
        confirmed,
        cancelled,
        noShow,
        pending: byStatus['pending'] ?? 0,
        attendanceRate,
        cancellationRate,
        avgMinutesToConfirm,
      },
      charts: {
        appointmentsByDay: dates.map(d => ({ date: d, ...dayMap[d] })),
        byOrigin: Object.entries(originMap)
          .map(([origin, count]) => ({ origin, count }))
          .sort((a, b) => b.count - a.count),
      },
    })
  } catch (err) {
    console.error('[analytics/agenda GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
