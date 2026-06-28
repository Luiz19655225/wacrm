import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import { parseRange } from '@/lib/analytics/date-range'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const { fromIso, toIso } = parseRange(new URL(request.url).searchParams)
    const admin = supabaseAdmin()

    const [aptsResult, dealsResult] = await Promise.all([
      admin
        .from('calendar_appointments')
        .select('assigned_user_id, status')
        .eq('account_id', accountId)
        .gte('start_at', fromIso)
        .lte('start_at', toIso)
        .not('assigned_user_id', 'is', null)
        .limit(10000),
      supabase
        .from('deals')
        .select('user_id, value')
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .not('user_id', 'is', null)
        .limit(10000),
    ])

    const apts = aptsResult.data ?? []
    const deals = dealsResult.data ?? []

    // aggregate by user
    const userMap: Record<string, { appointments: number; confirmed: number; deals: number; dealValue: number }> = {}

    for (const a of apts) {
      const uid = a.assigned_user_id as string
      if (!userMap[uid]) userMap[uid] = { appointments: 0, confirmed: 0, deals: 0, dealValue: 0 }
      userMap[uid].appointments++
      if (a.status === 'confirmed') userMap[uid].confirmed++
    }
    for (const d of deals) {
      const uid = d.user_id as string
      if (!userMap[uid]) userMap[uid] = { appointments: 0, confirmed: 0, deals: 0, dealValue: 0 }
      userMap[uid].deals++
      userMap[uid].dealValue += Number(d.value ?? 0)
    }

    const userIds = Object.keys(userMap)
    if (userIds.length === 0) return NextResponse.json({ users: [] })

    const { data: profiles } = await admin
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds)

    const nameMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id as string, p.full_name as string | null]))

    const users = Object.entries(userMap)
      .map(([uid, stats]) => ({
        userId: uid,
        name: nameMap[uid] ?? 'Usuário desconhecido',
        ...stats,
      }))
      .sort((a, b) => b.appointments - a.appointments)

    return NextResponse.json({ users })
  } catch (err) {
    console.error('[analytics/usuarios GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
