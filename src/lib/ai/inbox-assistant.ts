import { createOpenAIResponse } from './openai-client'
import { getAccountAiSettings, logAiUsage } from './ai-settings'
import { getAccountKnowledgeBase, buildKnowledgeBasePromptBlock } from './knowledge-base'

// ------------------------------------------------------------
// Inbox AI features: suggest reply, summarize, classify lead.
// The human always stays in control — suggestReply only returns text
// for the composer; nothing here ever calls the WhatsApp send path.
// ------------------------------------------------------------

export interface TranscriptMessage {
  sender_type: string
  content_type: string
  content_text?: string | null
}

const MAX_TRANSCRIPT_MESSAGES = 30

function buildTranscript(messages: TranscriptMessage[], contactName?: string | null): string {
  const recent = messages.slice(-MAX_TRANSCRIPT_MESSAGES)
  return recent
    .map((m) => {
      const who = m.sender_type === 'customer' ? contactName || 'Cliente' : 'Atendente'
      const text = m.content_text?.trim() || `[${m.content_type}]`
      return `${who}: ${text}`
    })
    .join('\n')
}

// Order matches the product spec: Perfil + Produtos + FAQ + Objetivos
// + Regras (the knowledge base) before the free-form customSystemPrompt,
// before the task-specific instructions each caller appends. The
// conversation transcript itself (Histórico) is passed separately as
// `input`, always last.
function baseInstructions(customSystemPrompt: string | null, knowledgeBlock: string): string {
  return [
    'Você é um assistente de atendimento ao cliente via WhatsApp para uma empresa brasileira que usa o CRM WAVON.',
    'Responda sempre em português do Brasil, de forma natural, cordial e objetiva.',
    knowledgeBlock ? `Use as informações abaixo sobre a empresa para responder com precisão:\n\n${knowledgeBlock}` : null,
    customSystemPrompt ? `Instruções específicas desta empresa: ${customSystemPrompt}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}

interface AssistantArgs {
  accountId: string
  conversationId: string
  messages: TranscriptMessage[]
  contactName?: string | null
}

type AssistantResult<T> = { ok: true; data: T } | { ok: false; error: string }

const NOT_CONFIGURED_ERROR =
  'IA não configurada para esta conta. Configure em Configurações → IA / OpenAI.'

export async function suggestReply(
  args: AssistantArgs,
): Promise<AssistantResult<{ suggestion: string }>> {
  const settings = await getAccountAiSettings(args.accountId)
  if (!settings) return { ok: false, error: NOT_CONFIGURED_ERROR }

  const knowledgeBlock = buildKnowledgeBasePromptBlock(await getAccountKnowledgeBase(args.accountId))
  const transcript = buildTranscript(args.messages, args.contactName)
  const instructions = `${baseInstructions(settings.customSystemPrompt, knowledgeBlock)}\n\nSua tarefa: sugerir a PRÓXIMA mensagem que o atendente deve enviar ao cliente, considerando a conversa abaixo. Responda APENAS com o texto da mensagem sugerida — sem aspas, sem rótulos, sem explicações.`

  try {
    const result = await createOpenAIResponse({
      apiKey: settings.apiKey,
      model: settings.model,
      instructions,
      input: transcript || 'A conversa ainda não tem mensagens.',
    })
    await logAiUsage({
      accountId: args.accountId,
      feature: 'suggest_reply',
      conversationId: args.conversationId,
      model: settings.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      status: 'success',
    })
    return { ok: true, data: { suggestion: result.text.trim() } }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao gerar sugestão'
    await logAiUsage({
      accountId: args.accountId,
      feature: 'suggest_reply',
      conversationId: args.conversationId,
      model: settings.model,
      status: 'error',
      errorMessage: message,
    })
    return { ok: false, error: message }
  }
}

export interface ConversationSummary {
  intent: string
  keyPoints: string
  pending: string
  nextAction: string
  raw: string
}

function parseSummary(raw: string): ConversationSummary {
  const grab = (label: string) => {
    const re = new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)(?=\\n[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][^:\\n]{2,40}:|$)`, 'i')
    const match = raw.match(re)
    return match?.[1]?.trim() || ''
  }
  return {
    intent: grab('Intenção do cliente') || grab('Intencao do cliente'),
    keyPoints: grab('Pontos principais'),
    pending: grab('Pendência atual') || grab('Pendencia atual'),
    nextAction: grab('Próxima ação sugerida') || grab('Proxima acao sugerida'),
    raw,
  }
}

export async function summarizeConversation(
  args: AssistantArgs,
): Promise<AssistantResult<ConversationSummary>> {
  const settings = await getAccountAiSettings(args.accountId)
  if (!settings) return { ok: false, error: NOT_CONFIGURED_ERROR }

  const knowledgeBlock = buildKnowledgeBasePromptBlock(await getAccountKnowledgeBase(args.accountId))
  const transcript = buildTranscript(args.messages, args.contactName)
  if (!transcript) return { ok: false, error: 'Esta conversa ainda não tem mensagens para resumir.' }

  const instructions = `${baseInstructions(settings.customSystemPrompt, knowledgeBlock)}\n\nSua tarefa: resumir a conversa abaixo para um atendente que vai assumi-la agora. Responda EXATAMENTE neste formato, com cada rótulo em sua própria linha:\nIntenção do cliente: <texto>\nPontos principais: <texto>\nPendência atual: <texto>\nPróxima ação sugerida: <texto>`

  try {
    const result = await createOpenAIResponse({
      apiKey: settings.apiKey,
      model: settings.model,
      instructions,
      input: transcript,
    })
    await logAiUsage({
      accountId: args.accountId,
      feature: 'summarize',
      conversationId: args.conversationId,
      model: settings.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      status: 'success',
    })
    return { ok: true, data: parseSummary(result.text.trim()) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao gerar resumo'
    await logAiUsage({
      accountId: args.accountId,
      feature: 'summarize',
      conversationId: args.conversationId,
      model: settings.model,
      status: 'error',
      errorMessage: message,
    })
    return { ok: false, error: message }
  }
}

export type LeadClassification = 'Frio' | 'Morno' | 'Quente' | 'Cliente' | 'Perdido'
const VALID_CLASSIFICATIONS: LeadClassification[] = ['Frio', 'Morno', 'Quente', 'Cliente', 'Perdido']

export interface LeadClassificationResult {
  classification: LeadClassification | 'Indefinido'
  reason: string
}

function parseClassification(raw: string): LeadClassificationResult {
  const classMatch = raw.match(/classifica[cç][aã]o\s*:\s*([a-zà-ú]+)/i)
  const reasonMatch = raw.match(/motivo\s*:\s*([\s\S]*)/i)
  const found = classMatch?.[1]
    ? VALID_CLASSIFICATIONS.find(
        (c) => c.toLowerCase() === classMatch[1].trim().toLowerCase(),
      )
    : undefined
  return {
    classification: found || 'Indefinido',
    reason: reasonMatch?.[1]?.trim() || raw.trim(),
  }
}

export async function classifyLead(
  args: AssistantArgs,
): Promise<AssistantResult<LeadClassificationResult>> {
  const settings = await getAccountAiSettings(args.accountId)
  if (!settings) return { ok: false, error: NOT_CONFIGURED_ERROR }

  const knowledgeBlock = buildKnowledgeBasePromptBlock(await getAccountKnowledgeBase(args.accountId))
  const transcript = buildTranscript(args.messages, args.contactName)
  if (!transcript) return { ok: false, error: 'Esta conversa ainda não tem mensagens para classificar.' }

  const instructions = `${baseInstructions(settings.customSystemPrompt, knowledgeBlock)}\n\nSua tarefa: classificar este lead com base na conversa abaixo, usando EXATAMENTE uma destas categorias: Frio, Morno, Quente, Cliente, Perdido.\nResponda EXATAMENTE neste formato:\nClassificação: <categoria>\nMotivo: <explicação breve>`

  try {
    const result = await createOpenAIResponse({
      apiKey: settings.apiKey,
      model: settings.model,
      instructions,
      input: transcript,
    })
    await logAiUsage({
      accountId: args.accountId,
      feature: 'classify_lead',
      conversationId: args.conversationId,
      model: settings.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      status: 'success',
    })
    return { ok: true, data: parseClassification(result.text.trim()) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao classificar o lead'
    await logAiUsage({
      accountId: args.accountId,
      feature: 'classify_lead',
      conversationId: args.conversationId,
      model: settings.model,
      status: 'error',
      errorMessage: message,
    })
    return { ok: false, error: message }
  }
}
