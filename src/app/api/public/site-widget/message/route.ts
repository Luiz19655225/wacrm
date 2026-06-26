import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/site-widget/admin-client'
import {
  resolveSiteWidgetAccountId,
  resolveAccountOwnerUserId,
  getOrCreateSiteWidgetConnectionId,
} from '@/lib/site-widget/owner-account'
import { findOrCreateContact, findOrCreateConversation } from '@/lib/whatsapp/conversation-pipeline'
import { runAutomationsForTrigger } from '@/lib/automations/engine'
import { getAccountAiSettings, logAiUsage } from '@/lib/ai/ai-settings'
import { getAccountKnowledgeBase, buildKnowledgeBasePromptBlock } from '@/lib/ai/knowledge-base'
import { searchRelevantChunks, buildRagPromptBlock } from '@/lib/ai/rag'
import { createOpenAIResponse } from '@/lib/ai/openai-client'
import { getSchedulingContext } from '@/lib/ai/scheduling-assistant'
import { normalizePhone, isValidE164, phonesMatch } from '@/lib/whatsapp/phone-utils'
import { buildLastMessagePreview } from '@/lib/whatsapp/message-preview'

// ------------------------------------------------------------
// POST /api/public/site-widget/message
//
// UNAUTHENTICATED — the visitor isn't a WAVON user. Feeds the exact
// same contact/conversation/automation pipeline the WhatsApp channels
// use (src/lib/whatsapp/conversation-pipeline.ts,
// src/lib/automations/engine.ts), just on a SITE_WIDGET connection
// instead of META/EVOLUTION — so anything already built on top of
// those tables (Inbox, Pipeline automations, automation_logs) works
// for site visitors with zero extra code.
//
// Body for a NEW conversation: { name, phone, message }
// Body for a FOLLOW-UP message: { conversation_id, phone, message }
// (name optional on follow-ups — the visitor's name is already saved
// on the contact row).
//
// Security note: this is a v1 "first version simples" per spec — auth
// on follow-ups is just "the phone you send matches the conversation's
// contact", and abuse protection is a per-conversation hourly message
// cap. Both are intentionally lightweight; a future phase can add
// proper session tokens / CAPTCHA if abuse shows up in practice.
// ------------------------------------------------------------

const FALLBACK_REPLY =
  'Olá! Sou a WAVI, assistente virtual da equipe. Recebemos sua mensagem e em breve nossa equipe retorna pelo WhatsApp informado.'
const RATE_LIMIT_PER_HOUR = 30

interface ContactRef {
  id: string
  name?: string | null
  phone?: string | null
}

export async function POST(request: Request) {
  try {
    const ownerAccountId = resolveSiteWidgetAccountId()
    if (!ownerAccountId) {
      return NextResponse.json(
        { error: 'O atendimento do site ainda não está configurado.' },
        { status: 503 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : ''
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : ''
    const existingConversationId =
      typeof body.conversation_id === 'string' && body.conversation_id ? body.conversation_id : null
    const phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '')

    if (!message) {
      return NextResponse.json({ error: 'Digite uma mensagem.' }, { status: 400 })
    }
    if (!existingConversationId) {
      if (!name) {
        return NextResponse.json({ error: 'Informe seu nome.' }, { status: 400 })
      }
      if (!isValidE164(phone)) {
        return NextResponse.json({ error: 'Informe um número de WhatsApp válido.' }, { status: 400 })
      }
    }

    const db = supabaseAdmin()
    const ownerUserId = await resolveAccountOwnerUserId(ownerAccountId)
    if (!ownerUserId) {
      console.error('[site-widget] owner account missing or has no owner_user_id:', ownerAccountId)
      return NextResponse.json(
        { error: 'O atendimento do site não está configurado corretamente.' },
        { status: 503 },
      )
    }

    let conversationId = existingConversationId

    if (!conversationId) {
      const connectionId = await getOrCreateSiteWidgetConnectionId(ownerAccountId)

      const contactOutcome = await findOrCreateContact(ownerAccountId, ownerUserId, phone, name)
      if (!contactOutcome) {
        return NextResponse.json({ error: 'Falha ao registrar contato.' }, { status: 500 })
      }

      const conversation = await findOrCreateConversation(
        ownerAccountId,
        ownerUserId,
        contactOutcome.contact.id,
        connectionId,
      )
      if (!conversation) {
        return NextResponse.json({ error: 'Falha ao iniciar conversa.' }, { status: 500 })
      }
      conversationId = conversation.id as string
    }

    const { data: conversation, error: convFetchError } = await db
      .from('conversations')
      .select('id, account_id, contact_id, unread_count, contact:contacts(id, name, phone, email)')
      .eq('id', conversationId)
      .eq('account_id', ownerAccountId)
      .maybeSingle()

    if (convFetchError || !conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })
    }

    const contact = conversation.contact as unknown as ContactRef | null

    // Persist email on the contact when supplied on the first message and not yet stored.
    if (!existingConversationId && email && contact?.id) {
      const contactEmail = (contact as unknown as { email?: string | null }).email
      if (!contactEmail) {
        db.from('contacts')
          .update({ email, updated_at: new Date().toISOString() })
          .eq('id', contact.id)
          .then(null, () => null)
      }
    }

    // Follow-up authz: the phone supplied must match the conversation's
    // own contact — stops someone guessing/sharing a conversation_id
    // from posting into a stranger's thread. Uses phonesMatch (trunk-
    // prefix tolerant), the same definition of "same number" that
    // findOrCreateContact/findExistingContact already use to resolve
    // this very contact — a strict digit-for-digit comparison here
    // would reject a legitimate visitor whenever the contact was
    // originally resolved via that fuzzy match (e.g. an existing
    // contact found by last-8-digit suffix, stored in a different
    // format than what this request's phone normalizes to).
    if (existingConversationId) {
      if (!contact?.phone || !phonesMatch(contact.phone, phone)) {
        return NextResponse.json(
          { error: 'Não foi possível validar sua identidade nesta conversa.' },
          { status: 403 },
        )
      }
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'customer')
      .gte('created_at', oneHourAgo)

    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: 'Muitas mensagens em pouco tempo. Tente novamente em alguns minutos.' },
        { status: 429 },
      )
    }

    const isFirstMessage = !existingConversationId

    const { error: insertErr } = await db.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'customer',
      content_type: 'text',
      content_text: message,
      status: 'delivered',
    })
    if (insertErr) {
      console.error('[site-widget] insert inbound message failed:', insertErr.message)
      return NextResponse.json({ error: 'Falha ao registrar mensagem.' }, { status: 500 })
    }

    await db
      .from('conversations')
      .update({
        last_message_text: buildLastMessagePreview('text', message),
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    // Reuses the exact same trigger vocabulary the WhatsApp channels
    // dispatch — this is what gives the site widget "lead lands in the
    // Pipeline" for free IF the account has a create_deal automation
    // on new_contact_created active (it does, from Fase 4's "Boas-
    // vindas + negociação para novo contato"). No widget-specific
    // deal-creation code on purpose — see file header.
    const triggers: ('new_contact_created' | 'first_inbound_message' | 'new_message_received')[] = isFirstMessage
      ? ['new_contact_created', 'first_inbound_message']
      : ['new_message_received']
    for (const triggerType of triggers) {
      runAutomationsForTrigger({
        accountId: ownerAccountId,
        triggerType,
        contactId: conversation.contact_id as string,
        context: { message_text: message, conversation_id: conversationId },
      }).catch((err) => console.error('[site-widget] automations dispatch failed:', err))
    }

    // AI reply — best-effort. A failure here must not undo the
    // contact/conversation/message already persisted above, so it
    // falls back to a generic acknowledgement instead of an error.
    let replyText = FALLBACK_REPLY
    let availableSchedulingSlots: { startISO: string; endISO: string; label: string }[] = []
    let hasSlotMarker = false
    const SLOT_READY_MARKER = '[AGENDAR]'
    const aiSettings = await getAccountAiSettings(ownerAccountId)
    if (aiSettings) {
      // All independent lookups run concurrently (history, KB, RAG, scheduling).
      const [{ data: history }, knowledgeBase, relevantChunks, schedulingCtx] = await Promise.all([
        db
          .from('messages')
          .select('sender_type, content_type, content_text')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),
        getAccountKnowledgeBase(ownerAccountId),
        searchRelevantChunks(ownerAccountId, aiSettings.apiKey, message),
        getSchedulingContext({ accountId: ownerAccountId }),
      ])

      const visitorName = contact?.name || name || 'Visitante'
      const transcript = (history ?? [])
        .slice(-30)
        .map((m) => {
          const who = m.sender_type === 'customer' ? visitorName : 'Atendente'
          const text = m.content_text?.trim() || `[${m.content_type}]`
          return `${who}: ${text}`
        })
        .join('\n')

      availableSchedulingSlots = schedulingCtx.slots
      const knowledgeBlock = buildKnowledgeBasePromptBlock(knowledgeBase)
      const ragBlock = buildRagPromptBlock(relevantChunks)
      const schedulingBlock = schedulingCtx.promptBlock ?? ''

      const instructions = [
        'Você se chama WAVI, a assistente virtual da equipe WAVON. Nunca se refira a si mesmo como "bot", "robô" ou "IA".',
        'Um visitante está conversando com você pelo widget de chat do site. Responda em português do Brasil, de forma simpática, breve e profissional.',
        'Ao se apresentar pela primeira vez, use: "Sou a WAVI, assistente virtual da equipe."',
        'Se a pergunta exigir um humano, diga que a equipe vai continuar o atendimento pelo WhatsApp informado.',
        knowledgeBlock ? `Use as informações abaixo sobre a empresa para responder com precisão:\n\n${knowledgeBlock}` : null,
        ragBlock ? `Use os trechos de documentos abaixo, se forem relevantes para a pergunta do visitante:\n\n${ragBlock}` : null,
        schedulingBlock || null,
        aiSettings.customSystemPrompt
          ? `Instruções específicas desta empresa: ${aiSettings.customSystemPrompt}`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n')

      try {
        const result = await createOpenAIResponse({
          apiKey: aiSettings.apiKey,
          model: aiSettings.model,
          instructions,
          input: transcript,
        })
        if (result.text.trim()) replyText = result.text.trim()
        // Detect [AGENDAR] marker — set by the AI only when all 5 mandatory fields
        // have been collected and it is about to present the available slots.
        // Strip it before storing or returning so the user never sees it.
        if (replyText.includes(SLOT_READY_MARKER)) {
          hasSlotMarker = true
          replyText = replyText.replace(SLOT_READY_MARKER, '').trim()
        }
        await logAiUsage({
          accountId: ownerAccountId,
          feature: 'site_widget_reply',
          conversationId,
          model: aiSettings.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          status: 'success',
        })
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : 'Falha ao gerar resposta da IA'
        console.error('[site-widget] AI reply failed:', errMessage)
        await logAiUsage({
          accountId: ownerAccountId,
          feature: 'site_widget_reply',
          conversationId,
          model: aiSettings.model,
          status: 'error',
          errorMessage: errMessage,
        })
      }
    }

    await db.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'bot',
      content_type: 'text',
      content_text: replyText,
      status: 'sent',
    })
    await db
      .from('conversations')
      .update({
        last_message_text: buildLastMessagePreview('text', replyText),
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    // Return slots only when the AI confirmed all 5 mandatory fields were collected
    // by including [AGENDAR] in its response (stripped above before storage/return).
    const schedulingSlots =
      hasSlotMarker && availableSchedulingSlots.length > 0
        ? availableSchedulingSlots
        : undefined

    return NextResponse.json({
      conversation_id: conversationId,
      reply: replyText,
      ...(schedulingSlots ? { scheduling_slots: schedulingSlots } : {}),
    })
  } catch (error) {
    console.error('Error in /api/public/site-widget/message POST:', error)
    return NextResponse.json({ error: 'Falha ao enviar mensagem. Tente novamente.' }, { status: 500 })
  }
}
