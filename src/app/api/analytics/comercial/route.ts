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

    const [contactsResult, dealsResult, stagesResult] = await Promise.all([
      supabase
        .from('contacts')
        .select('id, created_at')
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
      supabase
        .from('deals')
        .select('id, stage_id, value, user_id, created_at')
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
      supabase
        .from('pipeline_stages')
        .select('id, name, position')
        .order('position'),
    ])

    const contacts = contactsResult.data ?? []
    const deals = dealsResult.data ?? []
    const stages = stagesResult.data ?? []

    const stageMap = Object.fromEntries(stages.map(s => [s.id as string, s.name as string]))

    // contacts by day
    const contactDateMap = Object.fromEntries(dates.map(d => [d, 0]))
    for (const c of contacts) {
      const d = (c.created_at as string).split('T')[0]
      if (d in contactDateMap) contactDateMap[d]++
    }

    // deals by stage
    const stageCount: Record<string, { stage: string; count: number; value: number }> = {}
    for (const deal of deals) {
      const sid = deal.stage_id as string
      const name = stageMap[sid] ?? 'Sem estágio'
      if (!stageCount[sid]) stageCount[sid] = { stage: name, count: 0, value: 0 }
      stageCount[sid].count++
      stageCount[sid].value += Number(deal.value ?? 0)
    }

    const openValue = deals.reduce((acc, d) => acc + Number(d.value ?? 0), 0)

    return NextResponse.json({
      kpis: {
        newContacts: contacts.length,
        openDeals: deals.length,
        openValue,
        wonDeals: null,
        wonValue: null,
        conversionRate: null,
      },
      charts: {
        contactsByDay: dates.map(d => ({ date: d, count: contactDateMap[d] })),
        dealsByStage: Object.values(stageCount).sort((a, b) => b.count - a.count),
      },
    })
  } catch (err) {
    console.error('[analytics/comercial GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
