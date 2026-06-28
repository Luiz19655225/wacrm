// ============================================================
// Agenda WAVON — WhatsApp Notifier (Fase 8.2)
//
// Implements the WhatsApp channel for appointment
// communications. Called exclusively by comm-dispatcher.ts —
// no route or component imports this directly.
//
// Design principles:
//   - Never throws: every error is caught, logged to
//     appointment_comm_log, and swallowed so a WhatsApp
//     failure never breaks the appointment flow.
//   - Best-effort: if the account has no Evolution connection
//     or the contact has no phone, silently returns
//     { attempted: false } without logging noise.
//   - Single responsibility: message formatting, Evolution
//     transport, and comm-log writes — nothing else.
// ============================================================

import { supabaseAdmin } from '@/lib/calendar/admin-client'
import { sendTextMessage } from '@/lib/whatsapp/evolution-api'
import { logCommEvent } from './comm-service'
import { toLocalLabel, toLocalTime } from './types'
import type { CommEventType } from './types'
import type { CommTrigger } from './comm-dispatcher'

// ─── Timezone helper ──────────────────────────────────────────────────────────

async function getAccountTimezone(accountId: string): Promise<string> {
  const { data } = await supabaseAdmin()
    .from('calendar_settings')
    .select('timezone')
    .eq('account_id', accountId)
    .maybeSingle()
  return (data?.timezone as string | null) ?? 'America/Sao_Paulo'
}

// ─── Message templates (pt-BR) ────────────────────────────────────────────────

function buildMessageText(params: {
  trigger: CommTrigger
  contactName: string
  startAt: string
  reason: string | null
  timezone: string
}): string {
  const { trigger, contactName, startAt, reason, timezone } = params
  const firstName = contactName.split(' ')[0] || contactName
  const dateLabel = toLocalLabel(startAt, timezone)
  const timeLabel = toLocalTime(startAt, timezone)

  switch (trigger) {
    case 'appointment_created':
      return [
        `Olá, ${firstName}! 👋`,
        '',
        'Seu compromisso foi agendado com sucesso.',
        '',
        `📅 *${dateLabel}*`,
        `🕒 *${timeLabel}*`,
        reason ? `📋 Motivo: ${reason}` : null,
        '',
        'Confirme sua presença respondendo:',
        '1️⃣ Confirmar',
        '2️⃣ Reagendar',
        '3️⃣ Cancelar',
      ].filter((l): l is string => l !== null).join('\n')

    case 'appointment_cancelled':
      return [
        `Olá, ${firstName}.`,
        '',
        `Informamos que seu compromisso de ${dateLabel} às ${timeLabel} foi cancelado.`,
        '',
        'Em caso de dúvidas, entre em contato conosco.',
      ].join('\n')

    case 'appointment_rescheduled':
      return [
        `Olá, ${firstName}.`,
        '',
        'Seu compromisso foi reagendado.',
        '',
        'Entraremos em contato em breve para combinar o novo horário.',
        '',
        'Em caso de dúvidas, responda esta mensagem.',
      ].join('\n')

    case 'reminder_24h':
      return [
        `Olá, ${firstName}! 👋`,
        '',
        'Lembrete: você tem um compromisso *amanhã*.',
        '',
        `📅 *${dateLabel}*`,
        `🕒 *${timeLabel}*`,
        reason ? `📋 ${reason}` : null,
        '',
        'Responda *1* para confirmar ou *3* para cancelar.',
      ].filter((l): l is string => l !== null).join('\n')

    case 'reminder_2h':
      return [
        `Olá, ${firstName}! 👋`,
        '',
        'Lembrete: seu compromisso é *em 2 horas*.',
        '',
        `🕒 *${timeLabel}*`,
        '',
        'Até logo!',
      ].join('\n')

    case 'reminder_30min':
      return [
        `Olá, ${firstName}! ⏰`,
        '',
        `Seu compromisso começa *em 30 minutos* (${timeLabel}).`,
        '',
        'Estamos te aguardando!',
      ].join('\n')

    default:
      return `Olá, ${firstName}. Atualização sobre seu compromisso de ${dateLabel} às ${timeLabel}.`
  }
}

function buildLogMessage(trigger: CommTrigger): string {
  switch (trigger) {
    case 'appointment_created':    return 'Confirmação de agendamento enviada via WhatsApp'
    case 'appointment_cancelled':  return 'Notificação de cancelamento enviada via WhatsApp'
    case 'appointment_rescheduled': return 'Notificação de reagendamento enviada via WhatsApp'
    case 'reminder_24h':  return 'Lembrete de 24h enviado via WhatsApp'
    case 'reminder_2h':   return 'Lembrete de 2h enviado via WhatsApp'
    case 'reminder_30min': return 'Lembrete de 30min enviado via WhatsApp'
    default: return 'Notificação enviada via WhatsApp'
  }
}

function triggerToEventType(trigger: CommTrigger): CommEventType {
  if (trigger === 'appointment_created') return 'confirmation_sent'
  if (trigger.startsWith('reminder_')) return 'reminder_sent'
  return 'status_changed'
}

// ─── Conversation linking (non-blocking, best-effort) ────────────────────────
// When a confirmation is sent, try to link the appointment to the contact's
// existing Evolution conversation so that reply-intent detection (in the
// webhook processor) can look up the appointment by conversation_id.
// Only runs when the appointment has no conversation yet.

async function tryLinkConversation(
  appointmentId: string,
  accountId: string,
  contactId: string,
  connectionId: string,
): Promise<void> {
  try {
    const { data: conv } = await supabaseAdmin()
      .from('conversations')
      .select('id')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!conv) return

    await supabaseAdmin()
      .from('calendar_appointments')
      .update({ conversation_id: conv.id, updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .eq('account_id', accountId)
      .is('conversation_id', null) // only link if not already linked
  } catch {
    // best-effort — linking failure does not affect the notification
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface WhatsAppSendResult {
  attempted: boolean
  sent: boolean
  error?: string
}

/**
 * Sends a WhatsApp notification for an appointment event.
 * Fetches all required data internally from the DB.
 *
 * Called by:
 *   - comm-dispatcher.ts for appointment_created / cancelled / rescheduled
 *   - Future: cron job for reminder_24h / reminder_2h / reminder_30min
 */
export async function sendWhatsAppAppointmentMessage(params: {
  appointmentId: string
  accountId: string
  trigger: CommTrigger
}): Promise<WhatsAppSendResult> {
  const { appointmentId, accountId, trigger } = params

  // 1. Fetch appointment + contact
  const { data: row, error: fetchErr } = await supabaseAdmin()
    .from('calendar_appointments')
    .select(`
      contact_id, title, start_at, reason,
      comm_channel, comm_confirmation_enabled, comm_reminder_enabled,
      contacts ( name, phone )
    `)
    .eq('id', appointmentId)
    .eq('account_id', accountId)
    .single()

  if (fetchErr || !row) {
    console.error('[whatsapp-notifier] fetch appointment failed:', fetchErr?.message)
    return { attempted: false, sent: false, error: 'appointment_not_found' }
  }

  const contactRaw = row.contacts as unknown as { name: string | null; phone: string } | null
  const contactId  = row.contact_id as string | null
  const phone      = contactRaw?.phone?.replace(/\D/g, '') ?? null
  const contactName = contactRaw?.name || phone || 'Cliente'

  if (!contactId || !phone) {
    return { attempted: false, sent: false, error: 'no_contact_phone' }
  }

  // 2. Find active Evolution connection for this account
  const { data: connection } = await supabaseAdmin()
    .from('account_connections')
    .select('id, external_id, connection_status')
    .eq('account_id', accountId)
    .eq('provider', 'EVOLUTION')
    .eq('connection_status', 'connected')
    .maybeSingle()

  if (!connection?.external_id) {
    return { attempted: false, sent: false, error: 'no_evolution_connection' }
  }

  // 3. Build message text
  const timezone = await getAccountTimezone(accountId)
  const text = buildMessageText({
    trigger,
    contactName,
    startAt: row.start_at as string,
    reason:  row.reason  as string | null,
    timezone,
  })

  // 4. Send via Evolution
  let messageId: string | null = null
  try {
    const result = await sendTextMessage(connection.external_id as string, phone, text)
    messageId = result?.key?.id ?? null
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[whatsapp-notifier] sendTextMessage failed:', errMsg)
    await logCommEvent({
      appointmentId,
      accountId,
      eventType: 'send_error',
      channel: 'whatsapp',
      message: `Falha ao enviar via WhatsApp: ${errMsg.slice(0, 200)}`,
      metadata: { error: errMsg, phone, trigger },
    })
    return { attempted: true, sent: false, error: errMsg }
  }

  // 5. Try to link the appointment to the contact's conversation (non-blocking)
  void tryLinkConversation(
    appointmentId,
    accountId,
    contactId,
    connection.id as string,
  )

  // 6. Log success
  await logCommEvent({
    appointmentId,
    accountId,
    eventType: triggerToEventType(trigger),
    channel: 'whatsapp',
    message: buildLogMessage(trigger),
    metadata: { whatsapp_message_id: messageId, phone, trigger },
  })

  return { attempted: true, sent: true }
}
