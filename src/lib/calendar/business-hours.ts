import { supabaseAdmin } from './admin-client'
import type { BusinessHoursConfig, BusinessHoursRow, BusinessHoursStatus, TimeSlot } from './types'

const WEEKDAY_PT: Record<number, string> = {
  0: 'domingo',
  1: 'segunda-feira',
  2: 'terça-feira',
  3: 'quarta-feira',
  4: 'quinta-feira',
  5: 'sexta-feira',
  6: 'sábado',
}

const WEEKDAY_SHORT_PT: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

const MONTH_PT: Record<number, string> = {
  0: 'janeiro', 1: 'fevereiro', 2: 'março', 3: 'abril', 4: 'maio', 5: 'junho',
  6: 'julho', 7: 'agosto', 8: 'setembro', 9: 'outubro', 10: 'novembro', 11: 'dezembro',
}

// ─── Intl helpers ─────────────────────────────────────────────────────────────

function getLocalParts(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0'

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }
  const rawHour = parseInt(get('hour'), 10)

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10) - 1,
    day: parseInt(get('day'), 10),
    dayOfWeek: weekdayMap[get('weekday')] ?? 0,
    hours: rawHour === 24 ? 0 : rawHour,
    minutes: parseInt(get('minute'), 10),
  }
}

/**
 * Convert a local date/time in `timezone` to a UTC Date.
 * DST-safe: builds the naive UTC, reads back what local time that produced,
 * and adjusts for the difference.
 */
function localToUTC(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timezone: string,
): Date {
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00Z`
  const naiveUTC = new Date(iso)
  const local = getLocalParts(naiveUTC, timezone)
  const diffMinutes =
    (local.hours * 60 + local.minutes) - (hours * 60 + minutes)
  return new Date(naiveUTC.getTime() - diffMinutes * 60_000)
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// ─── DB access ────────────────────────────────────────────────────────────────

export async function getBusinessHours(
  accountId: string,
): Promise<BusinessHoursConfig[]> {
  const { data, error } = await supabaseAdmin()
    .from('business_hours')
    .select('day_of_week, is_open, start_time, end_time, timezone')
    .eq('account_id', accountId)
    .order('day_of_week', { ascending: true })

  if (error || !data || data.length === 0) return []

  return (data as Pick<BusinessHoursRow, 'day_of_week' | 'is_open' | 'start_time' | 'end_time' | 'timezone'>[]).map(
    (row) => ({
      dayOfWeek: row.day_of_week,
      isOpen: row.is_open,
      startTime: row.start_time ? row.start_time.slice(0, 5) : null,
      endTime: row.end_time ? row.end_time.slice(0, 5) : null,
      timezone: row.timezone,
    }),
  )
}

export async function upsertBusinessHours(
  accountId: string,
  hours: BusinessHoursConfig[],
): Promise<void> {
  const rows = hours.map((h) => ({
    account_id: accountId,
    day_of_week: h.dayOfWeek,
    is_open: h.isOpen,
    start_time: h.startTime,
    end_time: h.endTime,
    timezone: h.timezone,
    updated_at: new Date().toISOString(),
  }))

  await supabaseAdmin()
    .from('business_hours')
    .upsert(rows, { onConflict: 'account_id,day_of_week' })
}

// ─── Business hours check ─────────────────────────────────────────────────────

export async function checkBusinessHours(
  accountId: string,
  now = new Date(),
): Promise<BusinessHoursStatus> {
  const hours = await getBusinessHours(accountId)
  if (hours.length === 0) {
    return { isOpen: true, nextOpenDescription: null }
  }

  const timezone = hours[0].timezone
  const local = getLocalParts(now, timezone)
  const todayConfig = hours.find((h) => h.dayOfWeek === local.dayOfWeek)

  if (!todayConfig?.isOpen || !todayConfig.startTime || !todayConfig.endTime) {
    const next = findNextOpenDescription(hours, (local.dayOfWeek + 1) % 7)
    return { isOpen: false, nextOpenDescription: next }
  }

  const nowMinutes = local.hours * 60 + local.minutes
  const startMinutes = timeToMinutes(todayConfig.startTime)
  const endMinutes = timeToMinutes(todayConfig.endTime)

  if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
    return { isOpen: true, nextOpenDescription: null }
  }

  if (nowMinutes < startMinutes) {
    return {
      isOpen: false,
      nextOpenDescription: `hoje às ${todayConfig.startTime}`,
    }
  }

  const next = findNextOpenDescription(hours, (local.dayOfWeek + 1) % 7)
  return { isOpen: false, nextOpenDescription: next }
}

function findNextOpenDescription(
  hours: BusinessHoursConfig[],
  startDow: number,
): string | null {
  for (let i = 0; i < 7; i++) {
    const dow = (startDow + i) % 7
    const dayConfig = hours.find((h) => h.dayOfWeek === dow)
    if (dayConfig?.isOpen && dayConfig.startTime) {
      return `${WEEKDAY_PT[dow]} às ${dayConfig.startTime}`
    }
  }
  return null
}

// ─── Available slots computation ──────────────────────────────────────────────

/**
 * Given a list of busy intervals from the calendar provider and the
 * account's business hours, return up to `maxSlots` free time slots
 * within the next `lookAheadDays` days, each of `durationMinutes` length.
 *
 * `sampleIntervalMinutes` controls how far apart candidate start times are
 * checked. Defaults to `durationMinutes` (back-to-back slots). Use a larger
 * value (e.g. 60) to spread samples across the day so the AI sees options
 * from morning AND afternoon instead of only the first N consecutive slots.
 */
export function computeAvailableSlots(args: {
  busyIntervals: { start: Date; end: Date }[]
  businessHours: BusinessHoursConfig[]
  durationMinutes: number
  timezone: string
  from?: Date
  lookAheadDays?: number
  maxSlots?: number
  sampleIntervalMinutes?: number
}): TimeSlot[] {
  const {
    busyIntervals,
    businessHours,
    durationMinutes,
    timezone,
    from = new Date(),
    lookAheadDays = 7,
    maxSlots = 3,
    sampleIntervalMinutes = durationMinutes,
  } = args

  if (businessHours.length === 0) return []

  const endBound = new Date(from.getTime() + lookAheadDays * 24 * 60 * 60_000)
  const slots: TimeSlot[] = []

  // Align start to next sampleInterval boundary (round up)
  const step = sampleIntervalMinutes * 60_000
  let cursor = new Date(Math.ceil(from.getTime() / step) * step)
  // Add a 15-minute buffer from now so we don't offer slots in the past
  cursor = new Date(Math.max(cursor.getTime(), from.getTime() + 15 * 60_000))

  while (cursor < endBound && slots.length < maxSlots) {
    const local = getLocalParts(cursor, timezone)
    const dayConfig = businessHours.find((h) => h.dayOfWeek === local.dayOfWeek)

    if (!dayConfig?.isOpen || !dayConfig.startTime || !dayConfig.endTime) {
      // Not a business day — jump to next day's start
      cursor = advanceToNextBusinessDay(cursor, businessHours, timezone)
      continue
    }

    const startMin = timeToMinutes(dayConfig.startTime)
    const endMin = timeToMinutes(dayConfig.endTime)
    const cursorMin = local.hours * 60 + local.minutes

    if (cursorMin < startMin) {
      cursor = localToUTC(local.year, local.month, local.day, ...splitHHMM(dayConfig.startTime), timezone)
      continue
    }

    if (cursorMin + durationMinutes > endMin) {
      cursor = advanceToNextBusinessDay(
        new Date(cursor.getTime() + 24 * 60 * 60_000),
        businessHours,
        timezone,
      )
      continue
    }

    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000)
    const isBusy = busyIntervals.some(
      (b) => cursor < b.end && slotEnd > b.start,
    )

    if (!isBusy) {
      slots.push({
        startISO: cursor.toISOString(),
        endISO: slotEnd.toISOString(),
        label: formatSlotLabel(cursor, timezone),
      })
    }

    cursor = new Date(cursor.getTime() + step)
  }

  return slots
}

function advanceToNextBusinessDay(
  from: Date,
  hours: BusinessHoursConfig[],
  timezone: string,
): Date {
  for (let i = 0; i < 7; i++) {
    const candidate = new Date(from.getTime() + i * 24 * 60 * 60_000)
    const local = getLocalParts(candidate, timezone)
    const dayConfig = hours.find((h) => h.dayOfWeek === local.dayOfWeek)
    if (dayConfig?.isOpen && dayConfig.startTime) {
      const [h, m] = splitHHMM(dayConfig.startTime)
      return localToUTC(local.year, local.month, local.day, h, m, timezone)
    }
  }
  return new Date(from.getTime() + 7 * 24 * 60 * 60_000)
}

function splitHHMM(hhmm: string): [number, number] {
  const [h, m] = hhmm.split(':').map(Number)
  return [h, m]
}

export function formatSlotLabel(date: Date, timezone: string): string {
  const local = getLocalParts(date, timezone)
  const day = WEEKDAY_SHORT_PT[local.dayOfWeek] ?? ''
  const mon = MONTH_PT[local.month] ?? ''
  const h = String(local.hours).padStart(2, '0')
  const m = String(local.minutes).padStart(2, '0')
  return `${day}, ${local.day} de ${mon} às ${h}:${m}`
}
