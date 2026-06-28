import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import { parseRange, buildDateRangeSeries } from '@/lib/analytics/date-range'

type IaFeature = 'suggest_reply' | 'summarize' | 'classify_lead' | 'rag_search' | 'rag_document_ingest' | 'site_widget_reply'

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

    const [logsResult, widgetAptsResult] = await Promise.all([
      admin
        .from('ai_usage_logs')
        .select('feature, tokens_input, tokens_output, created_at, status')
        .eq('account_id', accountId)
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
      admin
        .from('calendar_appointments')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('origin', 'Widget')
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
    ])

    const logs = logsResult.data ?? []

    const byFeature: Record<IaFeature, number> = {
      suggest_reply: 0, summarize: 0, classify_lead: 0,
      rag_search: 0, rag_document_ingest: 0, site_widget_reply: 0,
    }
    let totalTokensInput = 0
    let totalTokensOutput = 0

    for (const l of logs) {
      const f = l.feature as IaFeature
      if (f in byFeature) byFeature[f]++
      totalTokensInput += Number(l.tokens_input ?? 0)
      totalTokensOutput += Number(l.tokens_output ?? 0)
    }

    // daily usage by feature
    type DayEntry = { date: string } & Record<IaFeature, number>
    const dayMap = new Map<string, DayEntry>(
      dates.map(d => [d, { date: d, suggest_reply: 0, summarize: 0, classify_lead: 0, rag_search: 0, rag_document_ingest: 0, site_widget_reply: 0 }])
    )
    for (const l of logs) {
      const d = (l.created_at as string).split('T')[0]
      const entry = dayMap.get(d)
      if (entry) {
        const f = l.feature as IaFeature
        if (f in entry) (entry[f] as number)++
      }
    }

    return NextResponse.json({
      kpis: {
        suggestReply: byFeature.suggest_reply,
        summarize: byFeature.summarize,
        classifyLead: byFeature.classify_lead,
        ragSearch: byFeature.rag_search,
        ragIngest: byFeature.rag_document_ingest,
        widgetReply: byFeature.site_widget_reply,
        totalTokensInput,
        totalTokensOutput,
        totalTokens: totalTokensInput + totalTokensOutput,
        widgetAppointments: widgetAptsResult.count ?? 0,
      },
      charts: {
        usageByDay: [...dayMap.values()],
      },
    })
  } catch (err) {
    console.error('[analytics/ia GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
