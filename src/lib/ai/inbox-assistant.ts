import { createOpenAIResponse } from './openai-client'
import { getAccountAiSettings, logAiUsage } from './ai-settings'
import { getAccountKnowledgeBase, buildKnowledgeBasePromptBlock } from './knowledge-base'
import { searchRelevantChunks, buildRagPromptBlock } from './rag'
import { getSchedulingContext } from './scheduling-assistant'

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
// + Regras (the structured knowledge base) + Documentos relevantes
// (RAG, Fase 7) before the free-form customSystemPrompt, before the
// task-specific instructions each caller appends. The conversation
// transcript itself (Histórico) is passed separately as `input`,
// always last. `ragBlock` defaults to '' — only suggestReply (the
// function that actually answers the customer) fetches it; summarize/
// classify are internal analysis tools and skip the extra embedding
// call.
function baseInstructions(
  customSystemPrompt: string | null,
  knowledgeBlock: string,
  ragBlock: string = '',
  schedulingBlock: string = '',
): string {
  return [
    'Você é um assistente de atendimento ao cliente via WhatsApp para uma empresa brasileira que usa o CRM WAVON.',
    'Responda sempre em português do Brasil, de forma natural, cordial e objetiva.',
    knowledgeBlock ? `Use as informações abaixo sobre a empresa para responder com precisão:\n\n${knowledgeBlock}` : null,
    ragBlock ? `Use os trechos de documentos abaixo, se forem relevantes para a pergunta do cliente:\n\n${ragBlock}` : null,
    schedulingBlock || null,
    customSystemPrompt ? `Instruções específicas desta empresa: ${customSystemPrompt}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function lastCustomerMessage(messages: TranscriptMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_type === 'customer') {
      return messages[i].content_text?.trim() || ''
    }
  }
  return ''
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

  const ragQuery = lastCustomerMessage(args.messages)
  // All independent lookups run concurrently (KB, RAG, scheduling context).
  const [knowledgeBase, relevantChunks, schedulingCtx] = await Promise.all([
    getAccountKnowledgeBase(args.accountId),
    ragQuery ? searchRelevantChunks(args.accountId, settings.apiKey, ragQuery) : Promise.resolve([]),
    getSchedulingContext({ accountId: args.accountId }),
  ])
  const knowledgeBlock = buildKnowledgeBasePromptBlock(knowledgeBase)
  const ragBlock = buildRagPromptBlock(relevantChunks)
  const schedulingBlock = schedulingCtx.promptBlock ?? ''
  const transcript = buildTranscript(args.messages, args.contactName)
  const instructions = `${baseInstructions(settings.customSystemPrompt, knowledgeBlock, ragBlock, schedulingBlock)}\n\nSua tarefa: sugerir a PRÓXIMA mensagem que o atendente deve enviar ao cliente, considerando a conversa abaixo. Responda APENAS com o texto da mensagem sugerida — sem aspas, sem rótulos, sem explicações.`

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

// ─────────────────────────────────────────────────────────────────────────────
// Fase 9.0 — WAVI Copilot: Insights completos de uma conversa em uma chamada
// ─────────────────────────────────────────────────────────────────────────────

export type InsightSentiment = 'Positivo' | 'Neutro' | 'Negativo'
export type InsightScoreLabel = 'Frio' | 'Morno' | 'Quente' | 'Cliente' | 'Perdido' | 'Indefinido'

export interface ConversationInsights {
  intent: string
  score: number               // 0-100
  scoreLabel: InsightScoreLabel
  nextAction: string
  alerts: string[]
  sentiment: InsightSentiment
  stageSuggestion: string | null
  atRisk: boolean
  riskReason: string | null
}

function scoreToLabel(score: number): InsightScoreLabel {
  if (score <= 5) return 'Perdido'
  if (score <= 30) return 'Frio'
  if (score <= 60) return 'Morno'
  if (score <= 85) return 'Quente'
  return 'Cliente'
}

function parseInsights(raw: string): ConversationInsights {
  const grab = (label: string): string => {
    const re = new RegExp(`${label}\\s*:\\s*([^\\n]+)`, 'i')
    return raw.match(re)?.[1]?.trim() ?? ''
  }

  const scoreStr = grab('Score')
  const score = Math.min(100, Math.max(0, parseInt(scoreStr) || 50))

  const alertsRaw = grab('Alertas')
  const alerts = alertsRaw && alertsRaw.toLowerCase() !== 'nenhum'
    ? alertsRaw.split('|').map((a) => a.trim()).filter(Boolean)
    : []

  const stageSuggestionRaw = grab('Sugest[aã]o de est[aá]gio')
  const stageSuggestion = stageSuggestionRaw && stageSuggestionRaw.toLowerCase() !== 'nenhuma'
    ? stageSuggestionRaw
    : null

  const atRiskRaw = grab('Em risco').toLowerCase()
  const atRisk = atRiskRaw === 'sim' || atRiskRaw === 'yes'

  const riskReasonRaw = grab('Motivo do risco')
  const riskReason = atRisk && riskReasonRaw && riskReasonRaw.toLowerCase() !== 'nenhum'
    ? riskReasonRaw
    : null

  const sentimentRaw = grab('Sentimento').toLowerCase()
  const sentiment: InsightSentiment =
    sentimentRaw.includes('positivo') ? 'Positivo'
    : sentimentRaw.includes('negativo') ? 'Negativo'
    : 'Neutro'

  return {
    intent: grab('Inten[cç][aã]o') || 'Não identificada',
    score,
    scoreLabel: scoreToLabel(score),
    nextAction: grab('Pr[oó]xima a[cç][aã]o') || 'Aguardar resposta do cliente',
    alerts,
    sentiment,
    stageSuggestion,
    atRisk,
    riskReason,
  }
}

export async function getConversationInsights(
  args: AssistantArgs,
): Promise<AssistantResult<ConversationInsights>> {
  const settings = await getAccountAiSettings(args.accountId)
  if (!settings) return { ok: false, error: NOT_CONFIGURED_ERROR }

  const transcript = buildTranscript(args.messages, args.contactName)
  if (!transcript) {
    return {
      ok: true,
      data: {
        intent: 'Conversa sem mensagens',
        score: 50,
        scoreLabel: 'Indefinido',
        nextAction: 'Iniciar o contato com o cliente',
        alerts: [],
        sentiment: 'Neutro',
        stageSuggestion: null,
        atRisk: false,
        riskReason: null,
      },
    }
  }

  const knowledgeBlock = buildKnowledgeBasePromptBlock(await getAccountKnowledgeBase(args.accountId))

  const instructions = `${baseInstructions(settings.customSystemPrompt, knowledgeBlock)}

Sua tarefa: analisar a conversa abaixo e gerar um diagnóstico completo do lead para o atendente.

Responda EXATAMENTE neste formato (uma linha por campo, sem explicações extras):
Intenção: <intenção principal detectada — máximo 80 caracteres>
Score: <número de 0 a 100 — onde 0=Perdido, 1-30=Frio, 31-60=Morno, 61-85=Quente, 86-100=Cliente>
Próxima ação: <ação concreta que o atendente deve tomar agora — máximo 100 caracteres>
Sentimento: <Positivo|Neutro|Negativo>
Alertas: <item1|item2|item3 ou NENHUM — ex: mencionou concorrente|pediu desconto|sinalizou urgência>
Sugestão de estágio: <nome do estágio sugerido no pipeline ou NENHUMA>
Em risco: <SIM|NAO>
Motivo do risco: <razão pela qual o lead está em risco ou NENHUM>`

  try {
    const result = await createOpenAIResponse({
      apiKey: settings.apiKey,
      model: settings.model,
      instructions,
      input: transcript,
    })
    await logAiUsage({
      accountId: args.accountId,
      feature: 'wavi_insights',
      conversationId: args.conversationId,
      model: settings.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      status: 'success',
    })
    return { ok: true, data: parseInsights(result.text.trim()) }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao gerar insights'
    await logAiUsage({
      accountId: args.accountId,
      feature: 'wavi_insights',
      conversationId: args.conversationId,
      model: settings.model,
      status: 'error',
      errorMessage: message,
    })
    return { ok: false, error: message }
  }
}
