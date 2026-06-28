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

    const [allContactsResult, newContactsResult, dealsResult, aptsResult] = await Promise.all([
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
      supabase
        .from('deals')
        .select('contact_id, value')
        .gte('created_at', fromIso)
        .lte('created_at', toIso)
        .not('contact_id', 'is', null)
        .limit(10000),
      supabaseAdmin()
        .from('calendar_appointments')
        .select('contact_id, start_at, status')
        .eq('account_id', accountId)
        .gte('start_at', fromIso)
        .lte('start_at', toIso)
        .not('contact_id', 'is', null)
        .limit(10000),
    ])

    const deals = dealsResult.data ?? []
    const apts = aptsResult.data ?? []

    const contactsWithDeals = new Set(deals.map(d => d.contact_id as string))
    const aptsByContact: Record<string, { count: number; lastAt: string }> = {}
    for (const a of apts) {
      const cid = a.contact_id as string
      if (!aptsByContact[cid]) aptsByContact[cid] = { count: 0, lastAt: a.start_at as string }
      aptsByContact[cid].count++
      if ((a.start_at as string) > aptsByContact[cid].lastAt) {
        aptsByContact[cid].lastAt = a.start_at as string
      }
    }

    // top contacts by appointment count
    const topIds = Object.entries(aptsByContact)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([id]) => id)

    let topContacts: { id: string; name: string | null; phone: string | null; appointments: number; lastAt: string }[] = []
    if (topIds.length > 0) {
      const { data: cData } = await supabase
        .from('contacts')
        .select('id, name, phone')
        .in('id', topIds)
      const cMap = Object.fromEntries((cData ?? []).map(c => [c.id as string, c]))
      topContacts = topIds.map(id => ({
        id,
        name: (cMap[id]?.name as string | null) ?? null,
        phone: (cMap[id]?.phone as string | null) ?? null,
        appointments: aptsByContact[id].count,
        lastAt: aptsByContact[id].lastAt,
      }))
    }

    return NextResponse.json({
      kpis: {
        totalContacts: allContactsResult.count ?? 0,
        newInPeriod: newContactsResult.count ?? 0,
        withAppointments: new Set(apts.map(a => a.contact_id)).size,
        withDeals: contactsWithDeals.size,
      },
      topByAppointments: topContacts,
    })
  } catch (err) {
    console.error('[analytics/clientes GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
