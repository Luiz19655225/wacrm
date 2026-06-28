import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'

function buildDateSeries(days: number): string[] {
  const now = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() - (days - 1 - i) * 24 * 60 * 60 * 1000)
    return d.toISOString().split('T')[0]
  })
}

/**
 * GET /api/dashboard-exec/series?days=7|14|30
 * Returns daily message and appointment counts for the selected period.
 * Used by the Executive Dashboard charts.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const url = new URL(request.url)
    const raw = parseInt(url.searchParams.get('days') ?? '7', 10)
    const days = ([7, 14, 30] as const).includes(raw as 7 | 14 | 30) ? (raw as 7 | 14 | 30) : 7
    const dates = buildDateSeries(days)
    const from = `${dates[0]}T00:00:00.000Z`

    const countByDate = (timestamps: string[]) => {
      const map = Object.fromEntries(dates.map(d => [d, 0]))
      for (const ts of timestamps) {
        const d = ts.split('T')[0]
        if (d in map) map[d]++
      }
      return dates.map(d => ({ date: d, count: map[d] }))
    }

    const [msgsResult, aptsResult] = await Promise.all([
      supabase.from('messages').select('created_at').gte('created_at', from),
      supabaseAdmin()
        .from('calendar_appointments')
        .select('start_at')
        .eq('account_id', accountId)
        .gte('start_at', from),
    ])

    const msgTs = (msgsResult.data ?? []).map(m => m.created_at as string)
    const aptTs = (aptsResult.data ?? []).map(a => a.start_at as string)

    return NextResponse.json({
      days,
      messages: countByDate(msgTs),
      appointments: countByDate(aptTs),
    })
  } catch (err) {
    console.error('[dashboard-exec/series GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
