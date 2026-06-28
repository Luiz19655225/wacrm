import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'

/**
 * GET /api/dashboard-exec/resumo
 * Aggregates billing, contacts, agenda rates, pipeline, WhatsApp volume,
 * and integration health for the Executive Dashboard.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const admin = supabaseAdmin()
    const now = new Date()

    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
    const weekStart = new Date(todayStart)
    weekStart.setUTCDate(weekStart.getUTCDate() - now.getDay())
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
    const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1) - 1)
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      subResult,
      contactTotalResult,
      contactNewResult,
      aptsLast30Result,
      aptsTodayResult,
      aptsWeekResult,
      aptsMonthResult,
      dealsResult,
      stagesResult,
      msgsLast7Result,
      msgsLast30Result,
      calResult,
      evoResult,
    ] = await Promise.all([
      admin.from('account_subscriptions')
        .select('plan_code, access_status, trial_ends_at, next_due_date')
        .eq('account_id', accountId)
        .maybeSingle(),
      supabase.from('contacts').select('id', { count: 'exact', head: true }),
      supabase.from('contacts').select('id', { count: 'exact', head: true })
        .gte('created_at', last30.toISOString()),
      admin.from('calendar_appointments')
        .select('status')
        .eq('account_id', accountId)
        .gte('start_at', last30.toISOString()),
      admin.from('calendar_appointments')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .gte('start_at', todayStart.toISOString())
        .lte('start_at', todayEnd.toISOString()),
      admin.from('calendar_appointments')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .gte('start_at', weekStart.toISOString())
        .lte('start_at', weekEnd.toISOString()),
      admin.from('calendar_appointments')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .gte('start_at', monthStart.toISOString())
        .lte('start_at', monthEnd.toISOString()),
      supabase.from('deals').select('id, value, stage_id').eq('status', 'open'),
      supabase.from('pipeline_stages').select('id, name, position').order('position'),
      supabase.from('messages').select('id', { count: 'exact', head: true })
        .gte('created_at', last7.toISOString()),
      supabase.from('messages').select('id', { count: 'exact', head: true })
        .gte('created_at', last30.toISOString()),
      admin.from('calendar_settings')
        .select('is_enabled')
        .eq('account_id', accountId)
        .maybeSingle(),
      admin.from('account_connections')
        .select('connection_status')
        .eq('account_id', accountId)
        .eq('provider', 'EVOLUTION')
        .maybeSingle(),
    ])

    // Billing — plan details require a separate query after subscription is known
    const sub = subResult.data
    let planName: string | null = null
    let priceCents: number | null = null
    if (sub?.plan_code) {
      const { data: plan } = await admin
        .from('plans')
        .select('name, price_cents')
        .eq('code', sub.plan_code)
        .maybeSingle()
      planName = (plan?.name as string | null) ?? null
      priceCents = (plan?.price_cents as number | null) ?? null
    }

    // Agenda rates — only count appointments with a terminal or action status
    const apts = (aptsLast30Result.data ?? []) as { status: string }[]
    const closed = apts.filter(a =>
      ['confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'].includes(a.status)
    )
    const total = closed.length
    const rate = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0)
    const confirmed = closed.filter(a => a.status === 'confirmed' || a.status === 'completed').length
    const cancelled = closed.filter(a => a.status === 'cancelled').length
    const noShow = closed.filter(a => a.status === 'no_show').length
    const rescheduled = closed.filter(a => a.status === 'rescheduled').length

    // Pipeline by stage
    const deals = (dealsResult.data ?? []) as { id: string; value: number | null; stage_id: string }[]
    const stages = (stagesResult.data ?? []) as { id: string; name: string; position: number }[]
    const stageMap = new Map(stages.map(s => [s.id, s.name]))
    const byStageAcc: Record<string, { name: string; count: number; value: number }> = {}
    for (const d of deals) {
      const sid = d.stage_id
      if (!byStageAcc[sid]) {
        byStageAcc[sid] = { name: stageMap.get(sid) ?? 'Sem estágio', count: 0, value: 0 }
      }
      byStageAcc[sid].count++
      byStageAcc[sid].value += d.value ?? 0
    }

    return NextResponse.json({
      billing: {
        planCode: (sub?.plan_code as string | null) ?? null,
        planName,
        priceCents,
        accessStatus: (sub?.access_status as string) ?? 'active',
        trialEndsAt: (sub?.trial_ends_at as string | null) ?? null,
        nextDueDate: (sub?.next_due_date as string | null) ?? null,
      },
      contacts: {
        total: contactTotalResult.count ?? 0,
        newLast30: contactNewResult.count ?? 0,
      },
      agenda: {
        today: aptsTodayResult.count ?? 0,
        thisWeek: aptsWeekResult.count ?? 0,
        thisMonth: aptsMonthResult.count ?? 0,
        confirmationRate: rate(confirmed),
        cancellationRate: rate(cancelled),
        reschedulingRate: rate(rescheduled),
        noShowRate: rate(noShow),
      },
      pipeline: {
        openCount: deals.length,
        openValue: deals.reduce((s, d) => s + (d.value ?? 0), 0),
        byStage: stages
          .filter(s => byStageAcc[s.id])
          .map(s => ({
            id: s.id,
            name: byStageAcc[s.id].name,
            count: byStageAcc[s.id].count,
            value: byStageAcc[s.id].value,
          })),
      },
      whatsapp: {
        last7days: msgsLast7Result.count ?? 0,
        last30days: msgsLast30Result.count ?? 0,
      },
      integrations: {
        googleCalendar: (calResult.data?.is_enabled as boolean | null) === true,
        evolutionApi: (evoResult.data?.connection_status as string | null) === 'connected',
        cronConfigured: !!(process.env.AUTOMATION_CRON_SECRET),
      },
    })
  } catch (err) {
    console.error('[dashboard-exec/resumo GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
