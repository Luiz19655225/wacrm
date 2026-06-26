import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/site-widget/admin-client'
import {
  resolveSiteWidgetAccountId,
  resolveAccountOwnerUserId,
} from '@/lib/site-widget/owner-account'
import {
  getCalendarAdapter,
  getAccountCalendarSettings,
  logCalendarEvent,
  CalendarLogEvent,
} from '@/lib/calendar'
import { formatSlotLabel } from '@/lib/calendar/business-hours'
import { normalizePhone, phonesMatch } from '@/lib/whatsapp/phone-utils'
import { buildLastMessagePreview } from '@/lib/whatsapp/message-preview'

/**
 * POST /api/public/site-widget/schedule  (unauthenticated)
 *
 * Creates a Google Calendar appointment from the public site widget after
 * the AI has collected all 5 required fields via conversation.
 *
 * Body: {
 *   conversation_id: string
 *   phone: string              // for identity validation (same as message route)
 *   start_iso: string
 *   end_iso: string
 *   attendee_name: string      // Required
 *   attendee_phone: string     // Required
 *   attendee_whatsapp: string  // Required
 *   attendee_email: string     // Required
 *   reason: string             // Required
 * }
 */
export async function POST(request: Request) {
  try {
    const ownerAccountId = resolveSiteWidgetAccountId()
    if (!ownerAccountId) {
      return NextResponse.json(
        { error: 'O atendimento do site ainda não está configurado.' },
        { status: 503 },
      )
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>

    const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id : ''
    const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '')
    const startISO = typeof body.start_iso === 'string' ? body.start_iso : ''
    const endISO = typeof body.end_iso === 'string' ? body.end_iso : ''
    const attendeeName = typeof body.attendee_name === 'string' ? body.attendee_name.trim() : ''
    const attendeePhone = typeof body.attendee_phone === 'string' ? body.attendee_phone.trim() : ''
    const attendeeWhatsapp = typeof body.attendee_whatsapp === 'string' ? body.attendee_whatsapp.trim() : ''
    const attendeeEmail = typeof body.attendee_email === 'string' ? body.attendee_email.trim() : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

    if (!conversationId || !startISO || !endISO) {
      return NextResponse.json(
        { error: 'conversation_id, start_iso e end_iso são obrigatórios.' },
        { status: 400 },
      )
    }

    const missingFields: string[] = []
    if (!attendeeName) missingFields.push('nome')
    if (!attendeePhone) missingFields.push('telefone/celular')
    if (!attendeeWhatsapp) missingFields.push('WhatsApp')
    if (!attendeeEmail) missingFields.push('e-mail')
    if (!reason) missingFields.push('motivo do atendimento')

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Dados obrigatórios ausentes: ${missingFields.join(', ')}.` },
        { status: 400 },
      )
    }

    const db = supabaseAdmin()

    // Load conversation + contact for identity validation
    const { data: conversation } = await db
      .from('conversations')
      .select('id, account_id, contact_id, contact:contacts(id, name, phone, email)')
      .eq('id', conversationId)
      .eq('account_id', ownerAccountId)
      .maybeSingle()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })
    }

    type ContactRef = { id: string; name?: string | null; phone?: string | null; email?: string | null }
    const contact = conversation.contact as unknown as ContactRef | null

    // Same identity check as the message route: phone must match the contact
    if (!contact?.phone || !phonesMatch(contact.phone, phone)) {
      return NextResponse.json(
        { error: 'Não foi possível validar sua identidade nesta conversa.' },
        { status: 403 },
      )
    }

    const ownerUserId = await resolveAccountOwnerUserId(ownerAccountId)
    if (!ownerUserId) {
      return NextResponse.json(
        { error: 'Configuração do site incompleta.' },
        { status: 503 },
      )
    }

    const [adapter, settings] = await Promise.all([
      getCalendarAdapter(ownerAccountId),
      getAccountCalendarSettings(ownerAccountId),
    ])

    if (!adapter || !settings) {
      return NextResponse.json({ error: 'Agenda não conectada.' }, { status: 404 })
    }

    const timezone = settings.timezone
    const startDate = new Date(startISO)
    const slotLabel = formatSlotLabel(startDate, timezone)
    const createdAt = new Date().toLocaleString('pt-BR', { timeZone: timezone })

    const title = `Atendimento - ${attendeeName}`

    const descriptionLines = [
      `Nome: ${attendeeName}`,
      `Telefone: ${attendeePhone}`,
      `WhatsApp: ${attendeeWhatsapp}`,
      `E-mail: ${attendeeEmail}`,
      `Motivo: ${reason}`,
      ``,
      `Origem: Widget do Site`,
      `Empresa/Workspace: WAVON`,
      `Data de criação: ${createdAt}`,
      contact.id ? `ID do contato: ${contact.id}` : null,
      `ID da conversa: ${conversationId}`,
    ].filter(Boolean).join('\n')

    let created
    try {
      created = await adapter.createAppointment({
        title,
        startISO,
        endISO,
        description: descriptionLines,
        attendeeEmail,
        attendeeName,
        requestOnlineMeeting: true,
      })
    } catch (err) {
      logCalendarEvent(CalendarLogEvent.AppointmentError, {
        accountId: ownerAccountId,
        error: err instanceof Error ? err.message : String(err),
      })
      return NextResponse.json({ error: 'Erro ao criar evento no calendário.' }, { status: 502 })
    }

    const fullDescription = created.onlineMeetingUrl
      ? descriptionLines + `\nLink Google Meet: ${created.onlineMeetingUrl}`
      : descriptionLines

    // Persist appointment record
    const { data: appointment } = await db
      .from('calendar_appointments')
      .insert({
        account_id: ownerAccountId,
        conversation_id: conversationId,
        contact_id: contact.id ?? null,
        provider_type: settings.providerType,
        external_event_id: created.externalEventId,
        title: created.title,
        start_at: created.startISO,
        end_at: created.endISO,
        online_meeting_url: created.onlineMeetingUrl ?? null,
        status: 'scheduled',
        notes: fullDescription,
      })
      .select('id')
      .single()

    // Update contact email if not yet set
    if (contact.id && !contact.email && attendeeEmail) {
      await db
        .from('contacts')
        .update({ email: attendeeEmail, updated_at: new Date().toISOString() })
        .eq('id', contact.id)
    }

    // Post confirmation message to conversation (visible in Inbox)
    const msgLines = [
      `📅 *Agendamento confirmado*`,
      ``,
      `👤 *Cliente:* ${attendeeName}`,
      `📱 *Telefone:* ${attendeePhone}`,
      `📱 *WhatsApp:* ${attendeeWhatsapp}`,
      `✉️ *E-mail:* ${attendeeEmail}`,
      `📋 *Motivo:* ${reason}`,
      ``,
      `📆 *Data:* ${slotLabel}`,
      `⏱️ *Duração:* ${settings.meetingDurationMinutes} minutos`,
    ]
    if (created.onlineMeetingUrl) {
      msgLines.push(`🔗 *Google Meet:* ${created.onlineMeetingUrl}`)
    }

    const confirmationText = msgLines.join('\n')

    await db.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'bot',
      content_type: 'text',
      content_text: confirmationText,
      created_at: new Date().toISOString(),
    })

    await db
      .from('conversations')
      .update({
        last_message_text: buildLastMessagePreview('text', `📅 Agendamento: ${slotLabel}`),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    // Update most recent deal for this contact
    if (contact.id) {
      await updateDealForScheduling(
        db,
        ownerAccountId,
        contact.id,
        title,
        slotLabel,
        created.onlineMeetingUrl ?? null,
        reason,
        attendeeEmail,
      ).catch(() => null)
    }

    logCalendarEvent(CalendarLogEvent.AppointmentCreated, {
      accountId: ownerAccountId,
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
      confirmation: confirmationText,
    })
  } catch (err) {
    console.error('[site-widget/schedule POST]', err)
    return NextResponse.json({ error: 'Erro interno ao criar agendamento.' }, { status: 500 })
  }
}

async function updateDealForScheduling(
  db: ReturnType<typeof supabaseAdmin>,
  accountId: string,
  contactId: string,
  title: string,
  slotLabel: string,
  meetUrl: string | null,
  reason: string,
  email: string,
): Promise<void> {
  const { data: deal } = await db
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
    `[WAVON IA] Agendamento via Widget: ${title}`,
    `Data: ${slotLabel}`,
    `Motivo: ${reason}`,
    `E-mail: ${email}`,
    meetUrl ? `Google Meet: ${meetUrl}` : null,
  ].filter(Boolean).join('\n')

  await db
    .from('deals')
    .update({ notes: ((deal.notes as string | null) ?? '') + noteLines })
    .eq('id', deal.id)

  logCalendarEvent(CalendarLogEvent.CrmNoteAdded, { dealId: deal.id })
}
