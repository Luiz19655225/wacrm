import { decrypt } from '@/lib/whatsapp/encryption'
import { supabaseAdmin } from './admin-client'

// ------------------------------------------------------------
// Shared helpers for every AI feature (Inbox suggest/summarize/
// classify + the public site widget). Each account brings its own
// OpenAI key — this never falls back to a global key.
// ------------------------------------------------------------

export interface ResolvedAiSettings {
  apiKey: string
  model: string
  customSystemPrompt: string | null
}

/**
 * Decrypts and returns the account's OpenAI config, or null when AI
 * isn't configured for this account yet. Callers should treat null as
 * "feature unavailable" — never silently fall back to any other key.
 */
export async function getAccountAiSettings(
  accountId: string,
): Promise<ResolvedAiSettings | null> {
  const { data, error } = await supabaseAdmin()
    .from('ai_settings')
    .select('api_key_encrypted, default_model, custom_system_prompt')
    .eq('account_id', accountId)
    .maybeSingle()

  if (error || !data?.api_key_encrypted) return null

  try {
    const apiKey = decrypt(data.api_key_encrypted as string)
    return {
      apiKey,
      model: (data.default_model as string) || 'gpt-4o-mini',
      customSystemPrompt: (data.custom_system_prompt as string) || null,
    }
  } catch (err) {
    console.error('[ai] failed to decrypt stored API key:', err)
    return null
  }
}

export type AiFeature =
  | 'suggest_reply'
  | 'summarize'
  | 'classify_lead'
  | 'site_widget_reply'
  | 'connection_test'
  | 'rag_document_ingest'
  | 'rag_search'

interface LogAiUsageArgs {
  accountId: string
  feature: AiFeature
  conversationId?: string | null
  model?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  /** Wall-clock duration of the call this log entry represents, in ms. */
  durationMs?: number | null
  status: 'success' | 'error'
  errorMessage?: string | null
}

/**
 * Best-effort usage log — never throws. A logging failure must not
 * surface as a feature failure to the agent or site visitor.
 */
export async function logAiUsage(args: LogAiUsageArgs): Promise<void> {
  try {
    await supabaseAdmin().from('ai_usage_logs').insert({
      account_id: args.accountId,
      feature: args.feature,
      conversation_id: args.conversationId ?? null,
      model: args.model ?? null,
      tokens_input: args.inputTokens ?? null,
      tokens_output: args.outputTokens ?? null,
      duration_ms: args.durationMs ?? null,
      status: args.status,
      error_message: args.errorMessage ?? null,
    })
  } catch (err) {
    console.error('[ai] failed to write usage log:', err)
  }
}
