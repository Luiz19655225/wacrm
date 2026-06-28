import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { getCommLog } from '@/lib/agenda/comm-service'

/**
 * GET /api/agenda/appointments/[id]/comm-log
 *
 * Returns the communication log for a single appointment.
 * Entries are ordered newest-first (limit 50).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const { id } = await params
    const entries = await getCommLog(id, accountId)

    return NextResponse.json({ entries })
  } catch (err) {
    console.error('[agenda/appointments/comm-log GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
