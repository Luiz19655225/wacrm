import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
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

    const [msgsResult, convResult] = await Promise.all([
      supabase
        .from('messages')
        .select('created_at, sender_type')
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .limit(10000),
      supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
    ])

    const msgs = msgsResult.data ?? []
    let sent = 0
    let received = 0
    for (const m of msgs) {
      if ((m.sender_type as string) === 'agent') sent++
      else received++
    }

    // by day
    const dayMap = Object.fromEntries(dates.map(d => [d, { sent: 0, received: 0 }]))
    for (const m of msgs) {
      const d = (m.created_at as string).split('T')[0]
      if (d in dayMap) {
        if ((m.sender_type as string) === 'agent') dayMap[d].sent++
        else dayMap[d].received++
      }
    }

    return NextResponse.json({
      kpis: {
        sent,
        received,
        total: msgs.length,
        conversations: convResult.count ?? 0,
      },
      charts: {
        messagesByDay: dates.map(d => ({ date: d, ...dayMap[d] })),
      },
    })
  } catch (err) {
    console.error('[analytics/comunicacao GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
