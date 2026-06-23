import { supabaseAdmin } from './admin-client'
import { findOrCreateContact, findOrCreateConversation } from './conversation-pipeline'
import { runAutomationsForTrigger } from '@/lib/automations/engine'
import { dispatchInboundToFlows } from '@/lib/flows/engine'

// Handles the three Evolution webhook events needed for
// "QR Code -> Conexão -> Conversas -> Inbox" (Fase 3 plan):
//   - qrcode.updated     -> account_connections.metadata.qrcode_base64
//   - connection.update  -> account_connections.connection_status
//   - messages.upsert    -> contacts / conversations / messages,
//                           same pipeline the Meta webhook already uses
//
// Idempotency is handled at the domain-table level (migration
// 030_evolution_connections.sql), not with a separate event-log table:
// qrcode/connection updates are naturally idempotent overwrites, and
// messages.upsert redeliveries are absorbed by the
// (conversation_id, message_id) unique index + ON CONFLICT DO NOTHING
// below.

interface EvolutionConnectionRow {
  id: string
  account_id: string
  metadata: Record<string, unknown>
}

async function resolveConnection(instanceName: string): Promise<EvolutionConnectionRow | null> {
  const { data, error } = await supabaseAdmin()
    .from('account_connections')
    .select('id, account_id, metadata')
    .eq('provider', 'EVOLUTION')
    .eq('external_id', instanceName)
    .maybeSingle()

  if (error) {
    console.error('[evolution webhook] resolveConnection failed:', error.message)
    return null
  }
  return data
}

/**
 * Stable "sender of record" for inserts that need a NOT NULL user_id FK
 * (contacts, conversations) — same role as the WhatsApp config owner on
 * the Meta path. accounts.owner_user_id is denormalised exactly for
 * this kind of lookup (migration 017_account_sharing.sql).
 */
async function resolveAccountOwnerUserId(accountId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from('accounts')
    .select('owner_user_id')
    .eq('id', accountId)
    .single()

  if (error || !data) {
    console.error('[evolution webhook] resolveAccountOwnerUserId failed:', error?.message)
    return null
  }
  return data.owner_user_id as string
}

async function handleQrcodeUpdated(
  connection: EvolutionConnectionRow,
  data: unknown,
): Promise<void> {
  const qrcode = (data as { qrcode?: { base64?: string }; base64?: string } | undefined)
  const base64 = qrcode?.qrcode?.base64 ?? qrcode?.base64 ?? null
  if (!base64) return

  const { error } = await supabaseAdmin()
    .from('account_connections')
    .update({
      connection_status: 'qrcode_ready',
      metadata: { ...connection.metadata, qrcode_base64: base64 },
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id)

  if (error) {
    console.error('[evolution webhook] qrcode update failed:', error.message)
  }
}

async function handleConnectionUpdate(
  connection: EvolutionConnectionRow,
  data: unknown,
): Promise<void> {
  const state = (data as { state?: string } | undefined)?.state

  if (state === 'open') {
    const { error } = await supabaseAdmin()
      .from('account_connections')
      .update({
        connection_status: 'connected',
        connected_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)
    if (error) console.error('[evolution webhook] connection->connected failed:', error.message)
    return
  }

  if (state === 'close') {
    const { error } = await supabaseAdmin()
      .from('account_connections')
      .update({ connection_status: 'disconnected', updated_at: new Date().toISOString() })
      .eq('id', connection.id)
    if (error) console.error('[evolution webhook] connection->disconnected failed:', error.message)
    return
  }

  // 'connecting' and any other transient state — no status change.
}

/**
 * Maps a Baileys-shaped inbound message envelope to the same
 * {contentText, contentType} pair parseMessageContent() produces for
 * Meta. Text is handled fully. Media types are recorded with a
 * readable placeholder rather than dropped — downloading/decrypting
 * Evolution media is a known follow-up, not implemented in this pass
 * (see Fase 3 plan).
 */
function parseEvolutionMessageContent(message: Record<string, unknown> | undefined): {
  contentText: string | null
  contentType: 'text' | 'image' | 'video' | 'audio' | 'document'
} {
  if (!message) return { contentText: null, contentType: 'text' }

  if (typeof message.conversation === 'string') {
    return { contentText: message.conversation, contentType: 'text' }
  }

  const extended = message.extendedTextMessage as { text?: string } | undefined
  if (extended?.text) {
    return { contentText: extended.text, contentType: 'text' }
  }

  const mediaKinds: Array<['image' | 'video' | 'audio' | 'document', string]> = [
    ['image', 'imageMessage'],
    ['video', 'videoMessage'],
    ['audio', 'audioMessage'],
    ['document', 'documentMessage'],
  ]
  for (const [contentType, key] of mediaKinds) {
    const media = message[key] as { caption?: string } | undefined
    if (media) {
      return { contentText: media.caption || `[${contentType}]`, contentType }
    }
  }

  return { contentText: '[Unsupported message type]', contentType: 'text' }
}

async function handleMessagesUpsert(
  connection: EvolutionConnectionRow,
  data: unknown,
): Promise<void> {
  const payload = data as {
    key?: { id?: string; remoteJid?: string; fromMe?: boolean }
    pushName?: string
    message?: Record<string, unknown>
    messageTimestamp?: number | string
  } | undefined

  const key = payload?.key
  if (!key?.id || !key.remoteJid) return
  // Our own outbound message, echoed back by Evolution — already
  // recorded by send/route.ts when we sent it. Recording it again here
  // would duplicate it as an inbound 'customer' message.
  if (key.fromMe) return

  const phone = key.remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '')
  const pushName = payload?.pushName

  const ownerUserId = await resolveAccountOwnerUserId(connection.account_id)
  if (!ownerUserId) return

  const contactOutcome = await findOrCreateContact(
    connection.account_id,
    ownerUserId,
    phone,
    pushName || phone,
  )
  if (!contactOutcome) return
  const contactRecord = contactOutcome.contact

  const conversation = await findOrCreateConversation(
    connection.account_id,
    ownerUserId,
    contactRecord.id,
    connection.id,
  )
  if (!conversation) return

  const { contentText, contentType } = parseEvolutionMessageContent(payload?.message)

  const timestampRaw = payload?.messageTimestamp
  const timestampSeconds = typeof timestampRaw === 'number'
    ? timestampRaw
    : Number(timestampRaw) || Math.floor(Date.now() / 1000)

  const { count: priorCustomerMsgCount } = await supabaseAdmin()
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversation.id)
    .eq('sender_type', 'customer')
  const isFirstInboundMessage = (priorCustomerMsgCount ?? 0) === 0

  // ON CONFLICT DO NOTHING absorbs Evolution redelivering the same
  // messages.upsert event — see migration 030's unique index on
  // (conversation_id, message_id).
  const { error: msgError } = await supabaseAdmin()
    .from('messages')
    .upsert(
      {
        conversation_id: conversation.id,
        sender_type: 'customer',
        content_type: contentType,
        content_text: contentText,
        message_id: key.id,
        status: 'delivered',
        created_at: new Date(timestampSeconds * 1000).toISOString(),
      },
      { onConflict: 'conversation_id,message_id', ignoreDuplicates: true },
    )

  if (msgError) {
    console.error('[evolution webhook] insert message failed:', msgError.message)
    return
  }

  const { error: convError } = await supabaseAdmin()
    .from('conversations')
    .update({
      last_message_text: contentText || `[${contentType}]`,
      last_message_at: new Date().toISOString(),
      unread_count: (conversation.unread_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id)

  if (convError) {
    console.error('[evolution webhook] update conversation failed:', convError.message)
  }

  const flowResult = await dispatchInboundToFlows({
    accountId: connection.account_id,
    userId: ownerUserId,
    contactId: contactRecord.id,
    conversationId: conversation.id,
    message: { kind: 'text', text: contentText ?? '', meta_message_id: key.id },
    isFirstInboundMessage,
  })

  const automationTriggers: (
    | 'new_contact_created'
    | 'first_inbound_message'
    | 'new_message_received'
    | 'keyword_match'
  )[] = []
  if (!flowResult.consumed) {
    automationTriggers.push('new_message_received', 'keyword_match')
  }
  if (contactOutcome.wasCreated) automationTriggers.unshift('new_contact_created')
  if (isFirstInboundMessage) automationTriggers.unshift('first_inbound_message')

  for (const triggerType of automationTriggers) {
    runAutomationsForTrigger({
      accountId: connection.account_id,
      triggerType,
      contactId: contactRecord.id,
      context: { message_text: contentText ?? '', conversation_id: conversation.id },
    }).catch((err) => console.error('[evolution webhook] automations dispatch failed:', err))
  }
}

export interface EvolutionWebhookPayload {
  event?: string
  instance?: string
  data?: unknown
}

/**
 * Entry point called by src/app/api/webhooks/evolution/route.ts after
 * the shared-secret check passes. Resolves the connection once, then
 * branches on event type — unknown events are logged and ignored
 * rather than treated as errors (Evolution adds new event types over
 * time; this must not start rejecting webhook deliveries on a 200).
 */
export async function processEvolutionWebhookEvent(payload: EvolutionWebhookPayload): Promise<void> {
  if (!payload.instance) {
    console.warn('[evolution webhook] payload missing instance, ignored')
    return
  }

  const connection = await resolveConnection(payload.instance)
  if (!connection) {
    console.warn('[evolution webhook] no connection found for instance:', payload.instance)
    return
  }

  switch (payload.event) {
    case 'qrcode.updated':
      await handleQrcodeUpdated(connection, payload.data)
      break
    case 'connection.update':
      await handleConnectionUpdate(connection, payload.data)
      break
    case 'messages.upsert':
      await handleMessagesUpsert(connection, payload.data)
      break
    default:
      console.warn('[evolution webhook] unhandled event type, ignored:', payload.event)
  }
}
