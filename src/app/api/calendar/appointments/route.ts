import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/ai/route-helpers'
import {
  getCalendarAdapter,
  getAccountCalendarSettings,
  logCalendarEvent,
  CalendarLogEvent,
} from '@/lib/calendar'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import { formatSlotLabel } from '@/lib/calendar/business-hours'

/**
 * POST /api/calendar/appointments
 *
 * Creates a calendar event for a conversation. Called from the Inbox
 * "Agendar" dialog when the agent confirms a slot.
 *
 * Body: {
 *   conversation_id: string
 *   contact_id: string
 *   start_iso: string      // UTC ISO
 *   end_iso: string        // UTC ISO
 *   title?: string
 *   attendee_email?: string
 *   attendee_name?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 403 })

    const body = await request.json() as {
      conversation_id?: string
      contact_id?: string
      start_iso?: string
      end_iso?: string
      title?: string
      attendee_email?: string
      attendee_name?: string
    }

    if (!body.start_iso || !body.end_iso) {
      return NextResponse.json({ error: 'start_iso e end_iso são obrigatórios.' }, { status: 400 })
    }

    const [adapter, settings] = await Promise.all([
      getCalendarAdapter(accountId),
      getAccountCalendarSettings(accountId),
    ])

    if (!adapter || !settings) {
      return NextResponse.json({ error: 'Agenda não conectada.' }, { status: 404 })
    }

    const timezone = settings.timezone
    const startDate = new Date(body.start_iso)
    const title = body.title ?? `Atendimento via WAVON — ${formatSlotLabel(startDate, timezone)}`

    let created
    try {
      created = await adapter.createAppointment({
        title,
        startISO: body.start_iso,
        endISO: body.end_iso,
        description: 'Agendamento criado automaticamente pela IA do WAVON.',
        attendeeEmail: body.attendee_email ?? null,
        attendeeName: body.attendee_name ?? null,
        requestOnlineMeeting: true,
      })
    } catch (err) {
      logCalendarEvent(CalendarLogEvent.AppointmentError, {
        accountId,
        error: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json({ error: 'Erro ao criar evento no calendário.' }, { status: 502 })
    }

    // Persist in calendar_appointments
    const { data: appointment, error: insertError } = await supabaseAdmin()
      .from('calendar_appointments')
      .insert({
        account_id: accountId,
        conversation_id: body.conversation_id ?? null,
        contact_id: body.contact_id ?? null,
        provider_type: settings.providerType,
        external_event_id: created.externalEventId,
        title: created.title,
        start_at: created.startISO,
        end_at: created.endISO,
        online_meeting_url: created.onlineMeetingUrl ?? null,
        status: 'scheduled',
        notes: 'Agendamento criado automaticamente pela IA.',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[calendar/appointments POST] insert failed:', insertError)
    }

    // Record in Inbox as a bot message
    if (body.conversation_id) {
      const slotLabel = formatSlotLabel(startDate, timezone)
      const msgLines = [
        `📅 *Agendamento confirmado*`,
        `Data: ${slotLabel}`,
        `Duração: ${settings.meetingDurationMinutes} minutos`,
      ]
      if (created.onlineMeetingUrl) {
        msgLines.push(`Link da reunião: ${created.onlineMeetingUrl}`)
      }

      const { error: msgInsertErr } = await supabaseAdmin()
        .from('messages')
        .insert({
          conversation_id: body.conversation_id,
          sender_type: 'bot',
          content_type: 'text',
          content_text: msgLines.join('\n'),
          created_at: new Date().toISOString(),
        })
      if (msgInsertErr) console.error('[calendar/appointments] inbox message failed:', msgInsertErr)

      // Update last_message_text on conversation
      const { error: convUpdateErr } = await supabaseAdmin()
        .from('conversations')
        .update({
          last_message_text: `📅 Agendamento: ${slotLabel}`,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', body.conversation_id)
      if (convUpdateErr) console.error('[calendar/appointments] conversation update failed:', convUpdateErr)
    }

    // Add note to most recent deal for this contact (best-effort)
    if (body.contact_id) {
      await addDealNote(accountId, body.contact_id, title).catch(() => null)
    }

    logCalendarEvent(CalendarLogEvent.AppointmentCreated, {
      accountId,
      appointmentId: appointment?.id,
      externalEventId: created.externalEventId,
      hasOnlineMeeting: !!created.onlineMeetingUrl,
    })

    return NextResponse.json({
      success: true,
      appointment_id: appointment?.id ?? null,
      title: created.title,
      start_iso: created.startISO,
      end_iso: created.endISO,
      online_meeting_url: created.onlineMeetingUrl,
    })
  } catch (err) {
    console.error('[calendar/appointments POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

async function addDealNote(
  accountId: string,
  contactId: string,
  appointmentTitle: string,
): Promise<void> {
  // Find the most recent deal for this contact in this account
  const { data: deal } = await supabaseAdmin()
    .from('deals')
    .select('id, notes')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!deal) return

  const noteEntry = `\n[WAVON IA] Agendamento criado automaticamente: ${appointmentTitle}`
  const currentNotes = (deal.notes as string | null) ?? ''

  await supabaseAdmin()
    .from('deals')
    .update({ notes: currentNotes + noteEntry })
    .eq('id', deal.id)

  logCalendarEvent(CalendarLogEvent.CrmNoteAdded, { dealId: deal.id })
}
