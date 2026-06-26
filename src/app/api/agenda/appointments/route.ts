import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import type { AppointmentWithContact } from '@/lib/agenda/types'

/**
 * GET /api/agenda/appointments?from=ISO&to=ISO&status=scheduled,completed&origin=Google
 *
 * Returns appointments in the given UTC window with contact and assigned_user
 * resolved. All query params are optional.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const url = new URL(request.url)
    const from    = url.searchParams.get('from')
    const to      = url.searchParams.get('to')
    const statusQ = url.searchParams.get('status')
    const originQ = url.searchParams.get('origin')

    let query = supabaseAdmin()
      .from('calendar_appointments')
      .select(`
        id, account_id, conversation_id, contact_id,
        provider_type, external_event_id,
        title, start_at, end_at, online_meeting_url,
        status, reason, origin, assigned_user_id, notes,
        created_at, updated_at,
        contacts (
          name, phone, email, company
        )
      `)
      .eq('account_id', accountId)
      .order('start_at', { ascending: true })

    if (from) query = query.gte('start_at', from)
    if (to)   query = query.lte('start_at', to)

    if (statusQ) {
      const statuses = statusQ.split(',').map(s => s.trim()).filter(Boolean)
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0])
      } else if (statuses.length > 1) {
        query = query.in('status', statuses)
      }
    }

    if (originQ) {
      const origins = originQ.split(',').map(s => s.trim()).filter(Boolean)
      if (origins.length === 1) {
        query = query.eq('origin', origins[0])
      } else if (origins.length > 1) {
        query = query.in('origin', origins)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('[agenda/appointments GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar agendamentos.' }, { status: 500 })
    }

    // Resolve assigned_user names in one query (avoid N+1)
    const userIds = [...new Set(
      (data ?? [])
        .map(r => r.assigned_user_id as string | null)
        .filter(Boolean) as string[]
    )]

    const userNameMap = new Map<string, string | null>()

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin()
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds)

      for (const p of profiles ?? []) {
        userNameMap.set(p.user_id as string, p.full_name as string | null)
      }
    }

    const appointments: AppointmentWithContact[] = (data ?? []).map(r => {
      const contactRaw = r.contacts as unknown as { name: string | null; phone: string; email: string | null; company: string | null } | null
      return {
        id:                r.id as string,
        account_id:        r.account_id as string,
        conversation_id:   r.conversation_id as string | null,
        contact_id:        r.contact_id as string | null,
        provider_type:     r.provider_type as AppointmentWithContact['provider_type'],
        external_event_id: r.external_event_id as string | null,
        title:             r.title as string,
        start_at:          r.start_at as string,
        end_at:            r.end_at as string,
        online_meeting_url: r.online_meeting_url as string | null,
        status:            r.status as AppointmentWithContact['status'],
        reason:            r.reason as string | null,
        origin:            r.origin as AppointmentWithContact['origin'],
        assigned_user_id:  r.assigned_user_id as string | null,
        notes:             r.notes as string | null,
        created_at:        r.created_at as string,
        updated_at:        r.updated_at as string,
        contact:           contactRaw ?? null,
        assigned_user:     r.assigned_user_id
          ? { full_name: userNameMap.get(r.assigned_user_id as string) ?? null }
          : null,
      }
    })

    return NextResponse.json({ appointments })
  } catch (err) {
    console.error('[agenda/appointments GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
