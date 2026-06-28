// ============================================================
// Agenda WAVON — Appointment Intent Detector (Fase 8.2)
//
// Maps incoming WhatsApp text to a structured appointment
// intent (confirm / reschedule / cancel / unknown).
//
// Accepts both numeric shortcuts ("1","2","3") and natural
// language in pt-BR with accent tolerance. This is a pure
// function — no I/O, easily unit-testable. A future phase
// can swap the keyword lists for an LLM classifier without
// touching any caller.
// ============================================================

export type AppointmentIntent = 'confirm' | 'reschedule' | 'cancel' | 'unknown'

/** Lowercase + strip diacritics so "Confirmado" == "confirmado" == "confirmâdo". */
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

// ─── Exact-match sets (single token or very short phrases) ──────────────────
// These fire before substring checks to avoid false positives on longer
// messages that happen to contain these strings (e.g. "não quero cancelar").

const CONFIRM_EXACT = new Set([
  '1', 'sim', 'ok', 'confirmo', 'confirmado', 'confirmar', 'confirmei',
  'claro', 'pode', 'pode ser', 'com certeza', 'vou sim', 'irei', 'vou',
])

const RESCHEDULE_EXACT = new Set([
  '2', 'reagendar', 'remarcar', 'reagendo', 'remarcando',
])

const CANCEL_EXACT = new Set([
  '3', 'cancelar', 'cancela', 'cancelado', 'cancelo', 'nao', 'não',
])

// ─── Substring keywords for longer natural-language messages ─────────────────
// Checked only when no exact match was found. All lowercase + no accents
// (normalize() is applied to the input before comparison).

const CONFIRM_CONTAINS = [
  'tudo certo', 'tudo bem', 'ta bom', 'ta otimo', 'ta certo',
  'vou comparecer', 'estarei la', 'estarei presente', 'estarei ai',
  'vou estar', 'vou la', 'vou ai', 'confirmado', 'confirmei',
  'pode confirmar', 'quero confirmar',
]

const RESCHEDULE_CONTAINS = [
  'outro horario', 'outro dia', 'mudar horario', 'trocar horario',
  'mudar o horario', 'trocar o horario', 'mudar a data', 'trocar a data',
  'preciso remarcar', 'preciso reagendar', 'quero remarcar', 'quero reagendar',
  'gostaria de remarcar', 'gostaria de reagendar', 'pode remarcar', 'pode reagendar',
  'outra data', 'outro momento',
]

const CANCEL_CONTAINS = [
  'nao vou', 'nao posso', 'nao consigo', 'nao quero ir', 'nao irei',
  'quero cancelar', 'pode cancelar', 'preciso cancelar', 'vou cancelar',
  'desistir', 'desisto', 'impossivel comparecer', 'nao vou conseguir',
  'nao vou poder', 'nao terei como', 'tenho que cancelar', 'tenho que desmarcar',
  'preciso desmarcar', 'quero desmarcar', 'pode desmarcar',
]

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the appointment intent for an incoming customer message.
 * Never throws — returns 'unknown' for unrecognized input.
 *
 * To extend intent coverage in the future:
 *   - Fase 8.3: pass to an LLM classifier when `unknown` is returned
 *   - Just add entries to the *_EXACT / *_CONTAINS sets above for
 *     pure-keyword coverage, no structural changes needed
 */
export function detectAppointmentIntent(text: string): AppointmentIntent {
  const n = normalize(text)

  // 1. Exact match (highest confidence, checked first)
  if (CONFIRM_EXACT.has(n)) return 'confirm'
  if (RESCHEDULE_EXACT.has(n)) return 'reschedule'
  if (CANCEL_EXACT.has(n)) return 'cancel'

  // 2. Substring match for multi-word responses
  if (CONFIRM_CONTAINS.some(k => n.includes(k))) return 'confirm'
  if (RESCHEDULE_CONTAINS.some(k => n.includes(k))) return 'reschedule'
  if (CANCEL_CONTAINS.some(k => n.includes(k))) return 'cancel'

  return 'unknown'
}
