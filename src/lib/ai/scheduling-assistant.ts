import {
  checkBusinessHours,
  computeAvailableSlots,
  getBusinessHours,
  getCalendarAdapter,
  logCalendarEvent,
  CalendarLogEvent,
} from '@/lib/calendar'
import type { TimeSlot } from '@/lib/calendar'

interface SchedulingContextArgs {
  accountId: string
  /** Optional: skip slot lookup when only the open/closed status is needed. */
  includeSlots?: boolean
  now?: Date
}

export interface SchedulingContext {
  /** Whether the account is currently within business hours. */
  isOpen: boolean
  /** Plain-text block to inject into the AI system prompt, or null. */
  promptBlock: string | null
  /** Available slots (populated when isOpen=false and calendar connected). */
  slots: TimeSlot[]
}

/**
 * Builds the business-hours + available-slots context block that is
 * injected into the AI prompt whenever a new message arrives.
 *
 * Never throws — any failure degrades to { isOpen: true, promptBlock: null, slots: [] }
 * so a calendar misconfiguration can never break the Inbox or the widget.
 */
export async function getSchedulingContext(
  args: SchedulingContextArgs,
): Promise<SchedulingContext> {
  const { accountId, includeSlots = true, now = new Date() } = args

  try {
    const status = await checkBusinessHours(accountId, now)

    if (status.isOpen) {
      return { isOpen: true, promptBlock: null, slots: [] }
    }

    // Build the out-of-hours base message
    const closedLine = status.nextOpenDescription
      ? `A empresa está fora do horário de atendimento comercial. Reabre ${status.nextOpenDescription}.`
      : 'A empresa está fora do horário de atendimento comercial.'

    if (!includeSlots) {
      return {
        isOpen: false,
        promptBlock: buildOutOfHoursBlock(closedLine, []),
        slots: [],
      }
    }

    // Try to get available slots from the calendar provider
    const [adapter, businessHours] = await Promise.all([
      getCalendarAdapter(accountId).catch(() => null),
      getBusinessHours(accountId).catch(() => []),
    ])

    if (!adapter || businessHours.length === 0) {
      return {
        isOpen: false,
        promptBlock: buildOutOfHoursBlock(closedLine, []),
        slots: [],
      }
    }

    // Look ahead 7 days for free slots
    const endBound = new Date(now.getTime() + 7 * 24 * 60 * 60_000)
    const busyIntervals = await adapter
      .getFreeBusyIntervals(now.toISOString(), endBound.toISOString())
      .catch(() => [])

    // calendar_settings.timezone and meeting_duration_minutes
    const { getAccountCalendarSettings } = await import('@/lib/calendar/calendar-settings')
    const settings = await getAccountCalendarSettings(accountId).catch(() => null)
    const timezone = settings?.timezone ?? businessHours[0]?.timezone ?? 'America/Sao_Paulo'
    const duration = settings?.meetingDurationMinutes ?? 30

    const slots = computeAvailableSlots({
      busyIntervals,
      businessHours,
      durationMinutes: duration,
      timezone,
      from: now,
      lookAheadDays: 7,
      maxSlots: 6,
      sampleIntervalMinutes: 60,  // spread across the day (morning + afternoon)
    })

    logCalendarEvent(CalendarLogEvent.IntentInjected, {
      accountId,
      slotsFound: slots.length,
    })

    return {
      isOpen: false,
      promptBlock: buildOutOfHoursBlock(closedLine, slots),
      slots,
    }
  } catch (err) {
    console.error('[scheduling-assistant] getSchedulingContext failed:', err)
    return { isOpen: true, promptBlock: null, slots: [] }
  }
}

function buildOutOfHoursBlock(closedLine: string, slots: TimeSlot[]): string {
  const lines: string[] = [
    '## Contexto: fora do horário comercial',
    '',
    closedLine,
    'Continue atendendo o cliente normalmente, usando toda a base de conhecimento disponível.',
    'NUNCA responda apenas "estamos fechados" — continue ajudando.',
  ]

  if (slots.length > 0) {
    lines.push(
      '',
      'Se o cliente demonstrar intenção comercial (orçamento, reunião, demonstração,',
      'contratação, suporte especializado), ajude-o a agendar um atendimento.',
      '',
      'Horários disponíveis confirmados na agenda:',
      ...slots.map((s, i) => `  ${i + 1}. ${s.label}`),
      '',
      'Instruções para tratar o horário pedido pelo cliente:',
      '- Se o cliente pedir um horário específico E ele estiver na lista acima: confirme',
      '  a disponibilidade e informe que a equipe formalizará o agendamento.',
      '- Se o horário pedido NÃO estiver na lista: informe que aquele horário específico',
      '  não está disponível e ofereça as opções da lista como alternativas.',
      '- Nunca confirme nem invente horários que não estejam na lista acima.',
    )
  }

  return lines.join('\n')
}
