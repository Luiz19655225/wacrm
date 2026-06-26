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
      promptBlock: buildOutOfHoursBlock(closedLine, slots, now, timezone),
      slots,
    }
  } catch (err) {
    console.error('[scheduling-assistant] getSchedulingContext failed:', err)
    return { isOpen: true, promptBlock: null, slots: [] }
  }
}

function buildOutOfHoursBlock(
  closedLine: string,
  slots: TimeSlot[],
  now = new Date(),
  timezone = 'America/Sao_Paulo',
): string {
  // Inject explicit date anchors so the AI can resolve "amanhã", "sexta-feira",
  // "próxima semana" etc. to concrete dates and match them against the slot list.
  const fmtDatetime = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
  const fmtDate = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60_000)

  const lines: string[] = [
    '## Contexto: fora do horário comercial',
    '',
    `Referência de data/hora atual (${timezone}):`,
    `  Hoje: ${fmtDatetime.format(now)}`,
    `  Amanhã: ${fmtDate.format(tomorrow)}`,
    '',
    closedLine,
    'Continue atendendo o cliente normalmente, usando toda a base de conhecimento disponível.',
    'NUNCA responda apenas "estamos fechados" — continue ajudando.',
  ]

  if (slots.length > 0) {
    lines.push(
      '',
      'Quando o cliente demonstrar intenção comercial (orçamento, reunião, demonstração,',
      'contratação, suporte especializado), ajude-o a agendar um atendimento.',
      '',
      'Horários disponíveis confirmados na agenda:',
      ...slots.map((s, i) => `  ${i + 1}. ${s.label}`),
      '',
      'REGRAS para responder pedidos de agendamento:',
      '1. Use a referência de data acima para converter expressões relativas como',
      '   "amanhã", "sexta-feira", "próxima semana" para as datas concretas.',
      '2. Ao receber um pedido de horário específico, compare com a lista acima:',
      '   - Horário pedido ESTÁ na lista → confirme diretamente:',
      '     "Sim, temos disponibilidade [horário]. Posso confirmar para você?"',
      '   - Horário pedido NÃO está na lista → informe que não está disponível',
      '     e ofereça os horários da lista como alternativas.',
      '3. Nunca confirme nem invente horários que não estejam na lista acima.',
      '4. Só finalize o agendamento após o cliente confirmar explicitamente.',
    )
  }

  return lines.join('\n')
}
