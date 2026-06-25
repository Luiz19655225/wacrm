import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { getBusinessHours, upsertBusinessHours } from '@/lib/calendar/business-hours'
import type { BusinessHoursConfig } from '@/lib/calendar/types'

/**
 * GET /api/settings/business-hours
 * Returns the account's business hours (7 rows, one per weekday).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const hours = await getBusinessHours(accountId)
    return NextResponse.json({ business_hours: hours })
  } catch (err) {
    console.error('[settings/business-hours GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * PUT /api/settings/business-hours
 * Full replace — saves all 7 days at once. Each row is upserted by
 * (account_id, day_of_week), so a partial array also works.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const body = await request.json() as { business_hours?: unknown }
    const hours = body.business_hours as BusinessHoursConfig[] | undefined

    if (!Array.isArray(hours) || hours.length === 0) {
      return NextResponse.json(
        { error: 'business_hours deve ser um array com ao menos 1 item.' },
        { status: 400 },
      )
    }

    // Basic validation
    for (const h of hours) {
      if (
        typeof h.dayOfWeek !== 'number' ||
        h.dayOfWeek < 0 ||
        h.dayOfWeek > 6 ||
        typeof h.isOpen !== 'boolean'
      ) {
        return NextResponse.json(
          { error: 'Formato inválido em business_hours.' },
          { status: 400 },
        )
      }
    }

    await upsertBusinessHours(accountId, hours)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[settings/business-hours PUT]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
