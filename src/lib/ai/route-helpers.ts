import { createClient } from '@/lib/supabase/server'
import type { TranscriptMessage } from './inbox-assistant'

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

export async function resolveAccountId(
  supabase: SupabaseServer,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.account_id) return null
  return data.account_id as string
}

export interface ConversationContext {
  accountId: string
  messages: TranscriptMessage[]
  contactName: string | null
}

export type ConversationContextResult =
  | { ok: true; data: ConversationContext }
  | { ok: false; status: number; error: string }

/**
 * Shared auth + tenancy guard for the 3 Inbox AI routes: resolves the
 * caller's account, confirms the conversation actually belongs to that
 * account (RLS would also catch a cross-tenant read, but failing
 * explicitly here gives a clearer error than an empty result), and
 * loads recent messages for the prompt.
 */
export async function resolveConversationContext(
  supabase: SupabaseServer,
  userId: string,
  conversationId: string,
): Promise<ConversationContextResult> {
  const accountId = await resolveAccountId(supabase, userId)
  if (!accountId) {
    return { ok: false, status: 403, error: 'Seu perfil não está vinculado a uma conta.' }
  }

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, account_id, contact:contacts(name, phone)')
    .eq('id', conversationId)
    .eq('account_id', accountId)
    .maybeSingle()

  if (convError || !conversation) {
    return { ok: false, status: 404, error: 'Conversa não encontrada.' }
  }

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('sender_type, content_type, content_text')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (msgError) {
    return { ok: false, status: 500, error: 'Falha ao carregar mensagens da conversa.' }
  }

  const contact = conversation.contact as unknown as { name?: string; phone?: string } | null

  return {
    ok: true,
    data: {
      accountId,
      messages: (messages ?? []) as TranscriptMessage[],
      contactName: contact?.name || contact?.phone || null,
    },
  }
}
