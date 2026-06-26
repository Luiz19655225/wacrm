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
  /** Available slots (populated when calendar is connected). */
  slots: TimeSlot[]
}

/**
 * Builds the scheduling context block injected into the AI system prompt.
 *
 * Agendamento Inteligente 2.0 — the AI must ALWAYS collect 5 mandatory
 * fields (name, phone, whatsapp, email, reason) BEFORE offering any slots.
 * Slots are fetched from the calendar provider regardless of business hours.
 *
 * Never throws — any failure degrades gracefully so a calendar misconfiguration
 * can never break the Inbox or the widget.
 */
export async function getSchedulingContext(
  args: SchedulingContextArgs,
): Promise<SchedulingContext> {
  const { accountId, includeSlots = true, now = new Date() } = args

  try {
    const status = await checkBusinessHours(accountId, now)

    if (!includeSlots) {
      return {
        isOpen: status.isOpen,
        promptBlock: buildSchedulingBlock(status.isOpen, status.nextOpenDescription ?? null, [], now),
        slots: [],
      }
    }

    const [adapter, businessHours] = await Promise.all([
      getCalendarAdapter(accountId).catch(() => null),
      getBusinessHours(accountId).catch(() => []),
    ])

    if (!adapter || businessHours.length === 0) {
      return {
        isOpen: status.isOpen,
        promptBlock: buildSchedulingBlock(status.isOpen, status.nextOpenDescription ?? null, [], now),
        slots: [],
      }
    }

    const endBound = new Date(now.getTime() + 7 * 24 * 60 * 60_000)
    const busyIntervals = await adapter
      .getFreeBusyIntervals(now.toISOString(), endBound.toISOString())
      .catch(() => [])

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
      sampleIntervalMinutes: 60,
    })

    logCalendarEvent(CalendarLogEvent.IntentInjected, {
      accountId,
      slotsFound: slots.length,
    })

    return {
      isOpen: status.isOpen,
      promptBlock: buildSchedulingBlock(status.isOpen, status.nextOpenDescription ?? null, slots, now, timezone),
      slots,
    }
  } catch (err) {
    console.error('[scheduling-assistant] getSchedulingContext failed:', err)
    return { isOpen: true, promptBlock: null, slots: [] }
  }
}

function buildSchedulingBlock(
  isOpen: boolean,
  nextOpenDescription: string | null,
  slots: TimeSlot[],
  now = new Date(),
  timezone = 'America/Sao_Paulo',
): string {
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
    '## Agendamento Inteligente',
    '',
    `Referência de data/hora atual (${timezone}):`,
    `  Hoje: ${fmtDatetime.format(now)}`,
    `  Amanhã: ${fmtDate.format(tomorrow)}`,
    '',
  ]

  if (!isOpen) {
    const closedLine = nextOpenDescription
      ? `A empresa está fora do horário de atendimento comercial. Reabre ${nextOpenDescription}.`
      : 'A empresa está fora do horário de atendimento comercial.'
    lines.push(
      closedLine,
      'Continue atendendo o cliente normalmente, usando toda a base de conhecimento disponível.',
      'NUNCA responda apenas "estamos fechados" — continue ajudando.',
      '',
    )
  }

  lines.push(
    'REGRAS OBRIGATÓRIAS — Agendamento Inteligente 2.0:',
    'Quando o cliente demonstrar intenção de agendar (reunião, consulta, demonstração,',
    'suporte especializado ou qualquer tipo de atendimento presencial/remoto), você DEVE',
    'coletar os 5 dados abaixo ANTES de consultar a agenda ou oferecer qualquer horário.',
    '',
    'Colete na ordem, um por mensagem, de forma simpática e natural:',
    '  1. Nome completo',
    '  2. Celular com DDD',
    '  3. WhatsApp (confirmar se é o mesmo número ou diferente do celular)',
    '  4. E-mail válido (deve conter @ e domínio, ex: nome@email.com)',
    '  5. Motivo do atendimento',
    '',
    'Valide cada dado antes de prosseguir:',
    '  - Telefone/celular: deve ter DDD (2 dígitos) + número (8 ou 9 dígitos)',
    '  - E-mail: deve ter @ e pelo menos um ponto após o @',
    '',
    'NUNCA ofereça horários, confirme agendamentos ou mencione a agenda',
    'antes de ter TODOS os 5 dados acima confirmados pelo cliente.',
    '',
  )

  if (slots.length > 0) {
    lines.push(
      'Após coletar e confirmar TODOS os 5 dados, ofereça os horários disponíveis abaixo:',
      '',
      ...slots.map((s, i) => `  ${i + 1}. ${s.label}`),
      '',
      'REGRAS para oferecer e confirmar horários:',
      '1. Use a referência de data acima para interpretar "amanhã", "sexta-feira" etc.',
      '2. Só ofereça horários da lista acima — NUNCA invente ou improvise horários.',
      '3. Ao receber a escolha do cliente, confirme claramente o horário selecionado.',
      '4. Informe que será criado um evento Google Calendar com link do Google Meet.',
      '5. Após o cliente confirmar, diga que o agendamento foi registrado e que',
      '   ele receberá a confirmação com todos os detalhes.',
    )
  } else {
    lines.push(
      'Após coletar e confirmar TODOS os 5 dados, informe que verificará os horários',
      'disponíveis e que a equipe entrará em contato para confirmar o melhor horário.',
    )
  }

  return lines.join('\n')
}
