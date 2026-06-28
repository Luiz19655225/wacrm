// ============================================================
// Agenda WAVON — Communication Service (Fase 8.1.4).
//
// Single entry-point for all comm log writes. Future providers
// (WhatsApp, e-mail, WAVI) call logCommEvent after attempting
// to send — the log persists the outcome regardless of channel.
//
// Reads (getCommLog) are used by the API endpoint; the panel
// fetches history via /api/agenda/appointments/[id]/comm-log.
// ============================================================

import { supabaseAdmin } from '@/lib/calendar/admin-client'
import type { CommEventType, CommLogEntry } from './types'
import { STATUS_LABEL } from './types'

export type CommLogChannel = 'whatsapp' | 'email' | 'system' | 'manual'

// ─── Write ────────────────────────────────────────────────────────────────────

export async function logCommEvent(params: {
  appointmentId: string
  accountId: string
  eventType: CommEventType
  channel?: CommLogChannel
  oldStatus?: string
  newStatus?: string
  message: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('appointment_comm_log')
    .insert({
      appointment_id: params.appointmentId,
      account_id:     params.accountId,
      event_type:     params.eventType,
      channel:        params.channel ?? null,
      old_status:     params.oldStatus ?? null,
      new_status:     params.newStatus ?? null,
      message:        params.message,
      metadata:       params.metadata ?? null,
    })

  if (error) {
    console.error('[comm-service] logCommEvent:', error)
  }
}

/** Convenience: logs a status transition with a standardized pt-BR message. */
export async function logStatusChange(params: {
  appointmentId: string
  accountId: string
  oldStatus: string
  newStatus: string
}): Promise<void> {
  const oldLabel = STATUS_LABEL[params.oldStatus as keyof typeof STATUS_LABEL] ?? params.oldStatus
  const newLabel = STATUS_LABEL[params.newStatus as keyof typeof STATUS_LABEL] ?? params.newStatus

  await logCommEvent({
    appointmentId: params.appointmentId,
    accountId:     params.accountId,
    eventType:     'status_changed',
    channel:       'system',
    oldStatus:     params.oldStatus,
    newStatus:     params.newStatus,
    message:       `Status alterado: ${oldLabel} → ${newLabel}`,
  })
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getCommLog(
  appointmentId: string,
  accountId: string,
): Promise<CommLogEntry[]> {
  const { data, error } = await supabaseAdmin()
    .from('appointment_comm_log')
    .select('id, appointment_id, event_type, channel, old_status, new_status, message, created_at')
    .eq('appointment_id', appointmentId)
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[comm-service] getCommLog:', error)
    return []
  }

  return (data ?? []) as CommLogEntry[]
}
