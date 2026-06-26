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
 * Agendamento Inteligente 2.0 — creates a Google Calendar event with Meet link.
 * All 5 contact data fields are required before the event can be created.
 *
 * Body: {
 *   conversation_id?: string
 *   contact_id?: string
 *   start_iso: string          // UTC ISO
 *   end_iso: string            // UTC ISO
 *   attendee_name: string      // Required
 *   attendee_phone: string     // Required
 *   attendee_whatsapp: string  // Required
 *   attendee_email: string     // Required
 *   reason: string             // Required — motivo do atendimento
 *   origin?: string            // 'Inbox' | 'Widget' | 'WhatsApp' etc.
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
      attendee_name?: string
      attendee_phone?: string
      attendee_whatsapp?: string
      attendee_email?: string
      reason?: string
      origin?: string
    }

    if (!body.start_iso || !body.end_iso) {
      return NextResponse.json({ error: 'start_iso e end_iso são obrigatórios.' }, { status: 400 })
    }

    const missingFields: string[] = []
    if (!body.attendee_name?.trim()) missingFields.push('nome')
    if (!body.attendee_phone?.trim()) missingFields.push('telefone/celular')
    if (!body.attendee_whatsapp?.trim()) missingFields.push('WhatsApp')
    if (!body.attendee_email?.trim()) missingFields.push('e-mail')
    if (!body.reason?.trim()) missingFields.push('motivo do atendimento')

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Dados obrigatórios ausentes: ${missingFields.join(', ')}.` },
        { status: 400 },
      )
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
    const slotLabel = formatSlotLabel(startDate, timezone)
    const origin = body.origin ?? 'Inbox'
    const createdAt = new Date().toLocaleString('pt-BR', { timeZone: timezone })

    const title = `Atendimento - ${body.attendee_name!.trim()}`

    const descriptionLines = [
      `Nome: ${body.attendee_name!.trim()}`,
      `Telefone: ${body.attendee_phone!.trim()}`,
      `WhatsApp: ${body.attendee_whatsapp!.trim()}`,
      `E-mail: ${body.attendee_email!.trim()}`,
      `Motivo: ${body.reason!.trim()}`,
      ``,
      `Origem: ${origin}`,
      `Empresa/Workspace: WAVON`,
      `Data de criação: ${createdAt}`,
      body.contact_id ? `ID do contato: ${body.contact_id}` : null,
      body.conversation_id ? `ID da conversa: ${body.conversation_id}` : null,
    ].filter(Boolean).join('\n')

    let created
    try {
      created = await adapter.createAppointment({
        title,
        startISO: body.start_iso,
        endISO: body.end_iso,
        description: descriptionLines,
        attendeeEmail: body.attendee_email!.trim(),
        attendeeName: body.attendee_name!.trim(),
        requestOnlineMeeting: true,
      })
    } catch (err) {
      logCalendarEvent(CalendarLogEvent.AppointmentError, {
        accountId,
        error: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json({ error: 'Erro ao criar evento no calendário.' }, { status: 502 })
    }

    const fullDescription = created.onlineMeetingUrl
      ? descriptionLines + `\nLink Google Meet: ${created.onlineMeetingUrl}`
      : descriptionLines

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
        reason: body.reason!.trim(),
        origin,
        notes: fullDescription,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[calendar/appointments POST] insert failed:', insertError)
    }

    // Update contact email if not already set
    if (body.contact_id && body.attendee_email?.trim()) {
      const { data: contact } = await supabaseAdmin()
        .from('contacts')
        .select('id, email')
        .eq('id', body.contact_id)
        .single()

      if (contact && !contact.email) {
        await supabaseAdmin()
          .from('contacts')
          .update({ email: body.attendee_email.trim(), updated_at: new Date().toISOString() })
          .eq('id', body.contact_id)
      }
    }

    // Post rich confirmation message to Inbox
    if (body.conversation_id) {
      const msgLines = [
        `📅 *Agendamento confirmado*`,
        ``,
        `👤 *Cliente:* ${body.attendee_name!.trim()}`,
        `📱 *Telefone:* ${body.attendee_phone!.trim()}`,
        `📱 *WhatsApp:* ${body.attendee_whatsapp!.trim()}`,
        `✉️ *E-mail:* ${body.attendee_email!.trim()}`,
        `📋 *Motivo:* ${body.reason!.trim()}`,
        ``,
        `📆 *Data:* ${slotLabel}`,
        `⏱️ *Duração:* ${settings.meetingDurationMinutes} minutos`,
      ]
      if (created.onlineMeetingUrl) {
        msgLines.push(`🔗 *Google Meet:* ${created.onlineMeetingUrl}`)
      }

      await supabaseAdmin()
        .from('messages')
        .insert({
          conversation_id: body.conversation_id,
          sender_type: 'bot',
          content_type: 'text',
          content_text: msgLines.join('\n'),
          created_at: new Date().toISOString(),
        })

      await supabaseAdmin()
        .from('conversations')
        .update({
          last_message_text: `📅 Agendamento: ${slotLabel}`,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', body.conversation_id)
    }

    // Update deal notes with scheduling info
    if (body.contact_id) {
      await updateDealForScheduling(
        accountId,
        body.contact_id,
        title,
        slotLabel,
        created.onlineMeetingUrl ?? null,
        body.reason!.trim(),
        body.attendee_email!.trim(),
      ).catch(() => null)
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

async function updateDealForScheduling(
  accountId: string,
  contactId: string,
  title: string,
  slotLabel: string,
  meetUrl: string | null,
  reason: string,
  email: string,
): Promise<void> {
  const { data: deal } = await supabaseAdmin()
    .from('deals')
    .select('id, notes')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!deal) return

  const noteLines = [
    ``,
    `[WAVON IA] Agendamento criado: ${title}`,
    `Data: ${slotLabel}`,
    `Motivo: ${reason}`,
    `E-mail: ${email}`,
    meetUrl ? `Google Meet: ${meetUrl}` : null,
  ].filter(Boolean).join('\n')

  await supabaseAdmin()
    .from('deals')
    .update({ notes: ((deal.notes as string | null) ?? '') + noteLines })
    .eq('id', deal.id)

  logCalendarEvent(CalendarLogEvent.CrmNoteAdded, { dealId: deal.id })
}
