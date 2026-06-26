import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'

/**
 * PATCH /api/agenda/appointments/[id]
 * Body: { status?, reason?, assigned_user_id? }
 *
 * Partial update of a calendar_appointments row.
 * Ownership is verified via account_id before any write.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const { id } = await params

    const body = await request.json() as {
      status?: string
      reason?: string
      assigned_user_id?: string | null
    }

    const ALLOWED_STATUSES = ['scheduled', 'rescheduled', 'cancelled', 'completed']
    if (body.status && !ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `Status inválido: ${body.status}` }, { status: 400 })
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.status !== undefined)           patch.status           = body.status
    if (body.reason !== undefined)           patch.reason           = body.reason
    if (body.assigned_user_id !== undefined) patch.assigned_user_id = body.assigned_user_id

    if (Object.keys(patch).length === 1) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin()
      .from('calendar_appointments')
      .update(patch)
      .eq('id', id)
      .eq('account_id', accountId)

    if (error) {
      console.error('[agenda/appointments PATCH]', error)
      return NextResponse.json({ error: 'Erro ao atualizar agendamento.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[agenda/appointments PATCH]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/agenda/appointments/[id]
 *
 * Soft delete: sets status = 'cancelled'.
 * Hard delete is not exposed — data is kept for CRM history.
 */
export async function DELETE(
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

    const { error } = await supabaseAdmin()
      .from('calendar_appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('account_id', accountId)

    if (error) {
      console.error('[agenda/appointments DELETE]', error)
      return NextResponse.json({ error: 'Erro ao cancelar agendamento.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[agenda/appointments DELETE]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
