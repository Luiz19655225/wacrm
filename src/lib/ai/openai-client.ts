/**
 * OpenAI API helpers — raw fetch, no SDK dependency (mirrors the
 * existing meta-api.ts / evolution-api.ts house style).
 *
 * Deliberately uses the Responses API (`/v1/responses`), not the
 * legacy Assistants API — OpenAI's current docs steer new integrations
 * there, and it doesn't require provisioning/cleaning up a persistent
 * "assistant" object per account just to ask one question.
 *
 * Every account brings its own API key (decrypted by the caller from
 * ai_settings.api_key_encrypted) — this module never reads a global
 * env var for a key, only the base URL constant.
 */

const OPENAI_API_BASE = 'https://api.openai.com/v1'

interface OpenAIErrorResponse {
  error?: { message?: string; type?: string; code?: string }
}

async function throwOpenAIError(response: Response, fallback: string): Promise<never> {
  let message = fallback
  try {
    const data = (await response.json()) as OpenAIErrorResponse
    if (data.error?.message) message = data.error.message
  } catch {
    // response body wasn't JSON — keep the fallback
  }
  throw new Error(message)
}

export interface OpenAIResponseResult {
  text: string
  inputTokens: number
  outputTokens: number
}

export interface CreateResponseArgs {
  apiKey: string
  model: string
  /** System-level instructions — company tone, task framing. */
  instructions?: string
  input: string
}

function extractOutputText(data: unknown): string {
  const output = (data as { output?: unknown })?.output
  if (!Array.isArray(output)) return ''
  for (const item of output) {
    const message = item as { type?: string; content?: unknown }
    if (message?.type !== 'message' || !Array.isArray(message.content)) continue
    for (const part of message.content) {
      const typed = part as { type?: string; text?: string }
      if (typed?.type === 'output_text' && typeof typed.text === 'string') {
        return typed.text
      }
    }
  }
  return ''
}

/**
 * Single-turn call to the Responses API. Used by every Inbox AI
 * feature and the site widget — `input` already has the full
 * conversation context baked in as plain text (built by the caller),
 * so this stays a thin, stateless wrapper.
 */
export async function createOpenAIResponse(
  args: CreateResponseArgs,
): Promise<OpenAIResponseResult> {
  const { apiKey, model, instructions, input } = args

  const response = await fetch(`${OPENAI_API_BASE}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      ...(instructions ? { instructions } : {}),
      input,
    }),
  })

  if (!response.ok) {
    await throwOpenAIError(response, `OpenAI respondeu com erro ${response.status}`)
  }

  const data = await response.json()
  return {
    text: extractOutputText(data),
    inputTokens: (data as { usage?: { input_tokens?: number } }).usage?.input_tokens ?? 0,
    outputTokens: (data as { usage?: { output_tokens?: number } }).usage?.output_tokens ?? 0,
  }
}

/**
 * Single call to the Embeddings API — every embedding generated
 * anywhere in the app (document chunks at ingestion time, a query at
 * search time) goes through this function. Nothing outside this file
 * makes an HTTP request to OpenAI; callers (the RAG module) only ever
 * pass plain strings in and get plain vectors back.
 *
 * `texts` is sent as a single batched request — OpenAI's embeddings
 * endpoint accepts an array natively. Callers are responsible for
 * keeping batch size reasonable (the RAG module batches at 96 inputs).
 */
export async function createOpenAIEmbeddings(
  apiKey: string,
  model: string,
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return []

  const response = await fetch(`${OPENAI_API_BASE}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: texts }),
  })

  if (!response.ok) {
    await throwOpenAIError(response, `OpenAI respondeu com erro ${response.status}`)
  }

  const data = (await response.json()) as { data?: Array<{ embedding: number[]; index: number }> }
  const items = data.data ?? []
  const sorted = [...items].sort((a, b) => a.index - b.index)
  return sorted.map((item) => item.embedding)
}

/**
 * Cheap auth probe for "Testar conexão" / save-time validation —
 * lists models instead of calling /responses, so checking a key
 * doesn't burn completion tokens.
 */
export async function verifyOpenAIKey(
  apiKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${OPENAI_API_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!response.ok) {
      let message = `OpenAI respondeu com erro ${response.status}`
      try {
        const data = (await response.json()) as OpenAIErrorResponse
        if (data.error?.message) message = data.error.message
      } catch {
        // not JSON — keep the fallback
      }
      return { ok: false, error: message }
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao conectar com a OpenAI',
    }
  }
}
