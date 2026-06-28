import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/calendar/admin-client'
import { dispatchAppointmentComm } from '@/lib/agenda/comm-dispatcher'
import type { CommTrigger } from '@/lib/agenda/comm-dispatcher'

/**
 * GET /api/agenda/reminders/cron
 *
 * Fase 8.3 — triggered every 15 minutes by Vercel Cron (vercel.json).
 * Processes three reminder windows per run: 24 h, 2 h, and 30 min before
 * each appointment's start_at (UTC).
 *
 * Auth: Vercel injects `Authorization: Bearer <CRON_SECRET>` automatically.
 *
 * Deduplication strategy (Adjustment 2 — atomic):
 *   claim_reminder_appointments() uses a CTE + FOR UPDATE SKIP LOCKED to
 *   atomically select and mark rows, preventing concurrent cron executions
 *   from processing the same appointment.
 *
 * On send failure (Adjustment 1):
 *   The column is cleared back to NULL so the next cron run retries.
 *
 * Channel isolation (Adjustment 3):
 *   The cron never references channels. It calls dispatchAppointmentComm()
 *   with only (appointmentId, accountId, trigger) and checks result.sent.
 */

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

type ClaimedRow = { id: string; account_id: string; start_at: string }

type ReminderConfig = {
  col:     'reminder_24h_sent_at' | 'reminder_2h_sent_at' | 'reminder_30min_sent_at'
  lower:   Date
  upper:   Date
  trigger: CommTrigger
  key:     'h24' | 'h2' | 'min30'
}

export async function GET(request: Request) {
  // Auth matches the existing /api/automations/cron pattern:
  // caller sends x-cron-secret: <AUTOMATION_CRON_SECRET>
  const expected = process.env.AUTOMATION_CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 503 })
  }

  const supplied = (request as { headers: { get(n: string): string | null } }).headers.get('x-cron-secret')
  if (supplied !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  const configs: ReminderConfig[] = [
    {
      col:     'reminder_24h_sent_at',
      lower:   addMinutes(now, 23 * 60 + 45),   // 23 h 45 min from now
      upper:   addMinutes(now, 24 * 60 + 15),   // 24 h 15 min from now
      trigger: 'reminder_24h',
      key:     'h24',
    },
    {
      col:     'reminder_2h_sent_at',
      lower:   addMinutes(now, 105),             // 1 h 45 min
      upper:   addMinutes(now, 135),             // 2 h 15 min
      trigger: 'reminder_2h',
      key:     'h2',
    },
    {
      col:     'reminder_30min_sent_at',
      lower:   addMinutes(now, 20),              // 20 min
      upper:   addMinutes(now, 40),              // 40 min
      trigger: 'reminder_30min',
      key:     'min30',
    },
  ]

  const processed = { h24: 0, h2: 0, min30: 0 }
  let errors = 0

  for (const config of configs) {
    // ── Atomic claim (Adjustment 2) ──────────────────────────────────────────
    const { data: claimed, error: claimError } = await (supabaseAdmin().rpc(
      'claim_reminder_appointments',
      {
        p_col:   config.col,
        p_lower: config.lower.toISOString(),
        p_upper: config.upper.toISOString(),
        p_limit: 20,
      },
    ) as unknown as Promise<{ data: ClaimedRow[] | null; error: { message: string } | null }>)

    if (claimError) {
      console.error(`[reminders/cron] claim error (${config.trigger}):`, claimError.message)
      errors++
      continue
    }

    for (const appt of claimed ?? []) {
      // ── Dispatch (Adjustment 3: cron has no channel knowledge) ───────────
      const result = await dispatchAppointmentComm({
        appointmentId: appt.id,
        accountId:     appt.account_id,
        trigger:       config.trigger,
      })

      if (result.sent) {
        processed[config.key]++
      } else {
        // ── Release lock on failure (Adjustment 1) ────────────────────────
        // Clear sent_at so the next cron run retries.
        errors++
        const { error: releaseError } = await supabaseAdmin()
          .from('calendar_appointments')
          .update({ [config.col]: null })
          .eq('id', appt.id)

        if (releaseError) {
          console.error(
            `[reminders/cron] failed to release ${config.col} for ${appt.id}:`,
            releaseError.message,
          )
        }
      }
    }
  }

  return NextResponse.json({
    ok:        true,
    processed,
    errors,
    timestamp: now.toISOString(),
  })
}
