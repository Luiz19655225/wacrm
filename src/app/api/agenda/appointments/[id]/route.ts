import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import { logStatusChange } from '@/lib/agenda/comm-service'

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
      comm_confirmation_enabled?: boolean
      comm_reminder_enabled?: boolean
      comm_channel?: string
    }

    const ALLOWED_STATUSES = [
      'scheduled', 'confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show',
    ]
    if (body.status && !ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `Status inválido: ${body.status}` }, { status: 400 })
    }

    const ALLOWED_CHANNELS = ['whatsapp', 'email', 'both']
    if (body.comm_channel && !ALLOWED_CHANNELS.includes(body.comm_channel)) {
      return NextResponse.json({ error: `Canal inválido: ${body.comm_channel}` }, { status: 400 })
    }

    // Fetch current appointment to get old_status for the change log
    let oldStatus: string | null = null
    if (body.status) {
      const { data: current } = await supabaseAdmin()
        .from('calendar_appointments')
        .select('status')
        .eq('id', id)
        .eq('account_id', accountId)
        .maybeSingle()
      oldStatus = (current?.status as string | null) ?? null
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.status !== undefined)           patch.status           = body.status
    if (body.reason !== undefined)           patch.reason           = body.reason
    if (body.assigned_user_id !== undefined) patch.assigned_user_id = body.assigned_user_id
    if (body.comm_confirmation_enabled !== undefined) {
      patch.comm_confirmation_enabled = body.comm_confirmation_enabled
    }
    if (body.comm_reminder_enabled !== undefined) {
      patch.comm_reminder_enabled = body.comm_reminder_enabled
    }
    if (body.comm_channel !== undefined) {
      patch.comm_channel = body.comm_channel
    }
    // Set confirmed_at when transitioning to 'confirmed'
    if (body.status === 'confirmed') {
      patch.confirmed_at = new Date().toISOString()
    }

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

    // Log status transition (non-blocking — log failure doesn't break the update)
    if (body.status && oldStatus && body.status !== oldStatus) {
      void logStatusChange({
        appointmentId: id,
        accountId,
        oldStatus,
        newStatus: body.status,
      })
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
