// ============================================================
// Agenda WAVON — Communication Dispatcher (Fase 8.2)
//
// Orchestrates appointment notifications across all channels.
// Routes call this; channels (WhatsApp, future: Email, Push)
// are implemented in separate modules — adding a new channel
// never requires touching the Agenda API routes.
//
// Flow:
//   Agenda (API route)
//     └─► dispatchAppointmentComm()        ← this file
//           ├─► WhatsApp notifier           ← whatsapp-notifier.ts
//           ├─► Email notifier (future)
//           └─► Push notifier   (future)
//
// Reminder triggers (reminder_24h / reminder_2h / reminder_30min)
// are fully implemented in the notifier but not wired to any
// scheduled job yet — that is Fase 8.3.
// ============================================================

import { sendWhatsAppAppointmentMessage } from './whatsapp-notifier'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommTrigger =
  | 'appointment_created'      // on POST /api/agenda/appointments
  | 'appointment_cancelled'    // on PATCH status → cancelled
  | 'appointment_rescheduled'  // on PATCH status → rescheduled
  | 'reminder_24h'             // future cron (Fase 8.3)
  | 'reminder_2h'              // future cron (Fase 8.3)
  | 'reminder_30min'           // future cron (Fase 8.3)

export interface ChannelResult {
  attempted: boolean
  sent: boolean
  error?: string
}

export interface DispatchResult {
  whatsapp: ChannelResult
  // email: ChannelResult  // Fase futura
  // push:  ChannelResult  // Fase futura
}

// ─── Preference guards ────────────────────────────────────────────────────────
// Skip quickly when the appointment's own comm preferences disable the trigger.
// These are passed in when the caller already has them (saves a DB round-trip
// inside the notifier); the notifier re-fetches everything else it needs.

function shouldSkip(params: {
  trigger: CommTrigger
  commConfirmationEnabled?: boolean
  commReminderEnabled?: boolean
}): boolean {
  const { trigger, commConfirmationEnabled, commReminderEnabled } = params

  if (trigger === 'appointment_created' && commConfirmationEnabled === false) return true
  if (trigger.startsWith('reminder_')   && commReminderEnabled    === false) return true
  return false
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Dispatches an appointment communication event to all applicable channels.
 *
 * Called from:
 *   - POST  /api/agenda/appointments      (trigger: 'appointment_created')
 *   - PATCH /api/agenda/appointments/[id] (trigger: 'appointment_cancelled' | 'appointment_rescheduled')
 *   - Future cron job                     (trigger: 'reminder_*')
 *
 * Never throws — all channel errors are logged internally and the result
 * reflects what actually happened.
 */
export async function dispatchAppointmentComm(params: {
  appointmentId: string
  accountId: string
  trigger: CommTrigger
  // Optional pre-fetched comm preferences to avoid an extra DB round-trip.
  // When omitted, the notifier fetches the appointment itself.
  commChannel?: string
  commConfirmationEnabled?: boolean
  commReminderEnabled?: boolean
}): Promise<DispatchResult> {
  const {
    appointmentId,
    accountId,
    trigger,
    commChannel,
    commConfirmationEnabled,
    commReminderEnabled,
  } = params

  const result: DispatchResult = {
    whatsapp: { attempted: false, sent: false },
  }

  if (shouldSkip({ trigger, commConfirmationEnabled, commReminderEnabled })) {
    return result
  }

  // Dispatch to WhatsApp when enabled (default: whatsapp)
  const wantsWhatsApp =
    !commChannel ||
    commChannel === 'whatsapp' ||
    commChannel === 'both'

  if (wantsWhatsApp) {
    try {
      result.whatsapp = await sendWhatsAppAppointmentMessage({
        appointmentId,
        accountId,
        trigger,
      })
    } catch (err) {
      // Safety net: the notifier itself is designed never to throw,
      // but this guard ensures a bug there never propagates to the route.
      console.error('[comm-dispatcher] unexpected error in WhatsApp notifier:', err)
      result.whatsapp = {
        attempted: true,
        sent: false,
        error: err instanceof Error ? err.message : 'unknown',
      }
    }
  }

  // Future channels — add here without touching any route:
  // const wantsEmail = commChannel === 'email' || commChannel === 'both'
  // if (wantsEmail) result.email = await sendEmailAppointmentMessage(...)

  // const wantsPush = true // push could be independent of comm_channel
  // if (wantsPush) result.push = await sendPushAppointmentMessage(...)

  return result
}
