import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import type { CommEventType } from '@/lib/agenda/types'

/**
 * GET /api/observabilidade/comunicacao?days=7
 * Returns communication log stats and recent entries for the account.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const url = new URL(request.url)
    const rawDays = parseInt(url.searchParams.get('days') ?? '7', 10)
    const days = Number.isFinite(rawDays) && rawDays > 0 && rawDays <= 90 ? rawDays : 7
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: entries, error } = await supabaseAdmin()
      .from('appointment_comm_log')
      .select('id, event_type, channel, old_status, new_status, message, created_at')
      .eq('account_id', accountId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[observabilidade/comunicacao GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar dados.' }, { status: 500 })
    }

    const rows = entries ?? []

    const byEventType: Record<CommEventType, number> = {
      status_changed: 0, reminder_sent: 0, confirmation_sent: 0,
      confirmation_received: 0, send_error: 0, note_added: 0,
    }

    for (const r of rows) {
      const et = r.event_type as CommEventType
      if (et in byEventType) byEventType[et]++
    }

    const totalSent = byEventType.reminder_sent + byEventType.confirmation_sent
    const totalErrors = byEventType.send_error
    const total = totalSent + totalErrors
    const errorRate = total > 0 ? Math.round((totalErrors / total) * 100) : 0

    return NextResponse.json({
      days,
      stats: {
        total: rows.length,
        byEventType,
        totalSent,
        totalErrors,
        errorRate,
      },
      recent: rows.slice(0, 15),
    })
  } catch (err) {
    console.error('[observabilidade/comunicacao GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
