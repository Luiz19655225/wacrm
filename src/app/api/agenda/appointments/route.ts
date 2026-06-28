import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import { getCalendarAdapter, getAccountCalendarSettings } from '@/lib/calendar'
import { findExistingContact } from '@/lib/contacts/dedupe'
import { dispatchAppointmentComm } from '@/lib/agenda/comm-dispatcher'
import type { AppointmentWithContact, CommChannel } from '@/lib/agenda/types'

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
        status, confirmed_at, reason, origin, assigned_user_id, notes,
        comm_confirmation_enabled, comm_reminder_enabled, comm_channel,
        reminder_24h_sent_at, reminder_2h_sent_at, reminder_30min_sent_at,
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
        confirmed_at:      r.confirmed_at as string | null,
        reason:            r.reason as string | null,
        origin:            r.origin as AppointmentWithContact['origin'],
        assigned_user_id:  r.assigned_user_id as string | null,
        notes:             r.notes as string | null,
        comm_confirmation_enabled: (r.comm_confirmation_enabled as boolean | null) ?? true,
        comm_reminder_enabled:     (r.comm_reminder_enabled as boolean | null) ?? true,
        comm_channel:              ((r.comm_channel as string | null) ?? 'whatsapp') as CommChannel,
        reminder_24h_sent_at:      (r.reminder_24h_sent_at as string | null) ?? null,
        reminder_2h_sent_at:       (r.reminder_2h_sent_at as string | null) ?? null,
        reminder_30min_sent_at:    (r.reminder_30min_sent_at as string | null) ?? null,
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

/**
 * POST /api/agenda/appointments
 *
 * Fase 8.1.1 — Agendamento Comercial. Creates a new appointment from the
 * Agenda UI, linking or creating a CRM contact, and optionally syncing
 * the event to Google Calendar when a calendar is connected.
 *
 * Body: {
 *   contact_id?:      string   // link to existing contact (optional)
 *   contact_name:     string   // required
 *   contact_phone:    string   // required
 *   contact_email?:   string
 *   contact_company?: string
 *   title:            string   // required
 *   start_at:         string   // UTC ISO, required
 *   end_at:           string   // UTC ISO, required
 *   reason?:          string
 *   notes?:           string
 *   assigned_user_id?: string
 * }
 *
 * Response: { success, appointment_id, calendar_synced, online_meeting_url }
 *
 * Google Calendar failure is non-blocking: the appointment is always
 * saved locally; calendar_synced = false indicates the sync didn't happen.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const body = await request.json() as {
      contact_id?: string
      contact_name?: string
      contact_phone?: string
      contact_email?: string
      contact_company?: string
      title?: string
      start_at?: string
      end_at?: string
      reason?: string
      notes?: string
      assigned_user_id?: string
    }

    // ── Validation ─────────────────────────────────────────────────────────────
    if (!body.contact_name?.trim()) {
      return NextResponse.json({ error: 'Nome do cliente é obrigatório.' }, { status: 400 })
    }
    if (!body.contact_phone?.trim()) {
      return NextResponse.json({ error: 'Celular do cliente é obrigatório.' }, { status: 400 })
    }
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Título do compromisso é obrigatório.' }, { status: 400 })
    }
    if (!body.start_at || !body.end_at) {
      return NextResponse.json({ error: 'Data e hora são obrigatórios.' }, { status: 400 })
    }

    // ── 1. Resolve or create contact ───────────────────────────────────────────
    let contactId: string | null = null

    if (body.contact_id) {
      const { data: existing } = await supabaseAdmin()
        .from('contacts')
        .select('id')
        .eq('id', body.contact_id)
        .eq('account_id', accountId)
        .maybeSingle()
      if (existing) contactId = existing.id as string
    }

    if (!contactId) {
      const found = await findExistingContact(supabaseAdmin(), accountId, body.contact_phone.trim())
      if (found) {
        contactId = found.id
        // Fill in missing email / company if the user provided them
        const patch: Record<string, unknown> = {}
        if (body.contact_email?.trim() && !(found as { email?: string }).email) {
          patch.email = body.contact_email.trim()
        }
        if (body.contact_company?.trim() && !(found as { company?: string }).company) {
          patch.company = body.contact_company.trim()
        }
        if (Object.keys(patch).length > 0) {
          patch.updated_at = new Date().toISOString()
          await supabaseAdmin().from('contacts').update(patch).eq('id', contactId)
        }
      } else {
        // Create new contact
        const { data: newContact, error: createError } = await supabaseAdmin()
          .from('contacts')
          .insert({
            account_id: accountId,
            user_id: user.id,
            name: body.contact_name.trim(),
            phone: body.contact_phone.trim(),
            email: body.contact_email?.trim() || null,
            company: body.contact_company?.trim() || null,
          })
          .select('id')
          .single()

        if (createError || !newContact) {
          console.error('[agenda/appointments POST] create contact:', createError)
          return NextResponse.json({ error: 'Erro ao criar contato no CRM.' }, { status: 500 })
        }
        contactId = newContact.id as string
      }
    }

    // ── 2. Try Google Calendar sync (non-blocking) ─────────────────────────────
    let providerType: 'GOOGLE' | 'OUTLOOK' | 'LOCAL' = 'LOCAL'
    let externalEventId: string | null = null
    let onlineMeetingUrl: string | null = null
    let calendarSynced = false

    try {
      const [adapter, settings] = await Promise.all([
        getCalendarAdapter(accountId),
        getAccountCalendarSettings(accountId),
      ])

      if (adapter && settings) {
        const descriptionParts = [
          body.reason ? `Motivo: ${body.reason.trim()}` : null,
          body.notes  ? `Observações: ${body.notes.trim()}` : null,
          `Criado via WAVON Agenda`,
        ].filter(Boolean) as string[]

        const created = await adapter.createAppointment({
          title:                body.title!.trim(),
          startISO:             body.start_at,
          endISO:               body.end_at,
          description:          descriptionParts.join('\n'),
          attendeeEmail:        body.contact_email?.trim() || null,
          attendeeName:         body.contact_name.trim(),
          requestOnlineMeeting: true,
        })

        providerType     = settings.providerType
        externalEventId  = created.externalEventId
        onlineMeetingUrl = created.onlineMeetingUrl
        calendarSynced   = true
      }
    } catch (err) {
      console.error('[agenda/appointments POST] calendar sync:', err)
      // Non-blocking — continue with LOCAL provider
    }

    // ── 3. Insert appointment ──────────────────────────────────────────────────
    const { data: appt, error: insertError } = await supabaseAdmin()
      .from('calendar_appointments')
      .insert({
        account_id:        accountId,
        contact_id:        contactId,
        provider_type:     providerType,
        external_event_id: externalEventId,
        title:             body.title!.trim(),
        start_at:          body.start_at,
        end_at:            body.end_at,
        online_meeting_url: onlineMeetingUrl,
        status:            'scheduled',
        reason:            body.reason?.trim() || null,
        notes:             body.notes?.trim() || null,
        origin:            'Manual',
        assigned_user_id:  body.assigned_user_id || null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[agenda/appointments POST] insert:', insertError)
      return NextResponse.json({ error: 'Erro ao salvar compromisso.' }, { status: 500 })
    }

    // Dispatch WhatsApp confirmation after the response (non-blocking, same
    // pattern as RAG document processing in Fase 7.1). If the account has no
    // Evolution connection or the contact has no phone, the notifier exits
    // silently — never breaks the appointment creation flow.
    const dispatchId  = appt.id as string
    const dispatchAcc = accountId
    after(() => dispatchAppointmentComm({
      appointmentId: dispatchId,
      accountId:     dispatchAcc,
      trigger:       'appointment_created',
    }))

    return NextResponse.json({
      success:            true,
      appointment_id:     appt.id,
      calendar_synced:    calendarSynced,
      online_meeting_url: onlineMeetingUrl,
      whatsapp_sent:      null, // resolved asynchronously via after()
    })
  } catch (err) {
    console.error('[agenda/appointments POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
