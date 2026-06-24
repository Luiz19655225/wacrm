import { supabaseAdmin } from './admin-client'

// ------------------------------------------------------------
// Fase 6 — per-account "trainable AI" knowledge base. Everything here
// is account-scoped (company profile, products, FAQ, commercial
// goals, hard rules) and gets folded into the system instructions for
// every AI call — Inbox suggest/summarize/classify AND the public
// site widget — alongside the account's own OpenAI key (ai-settings.ts)
// and ahead of the conversation history itself.
//
// Best-effort by design: a missing/partial knowledge base must never
// break an AI feature. Accounts that haven't filled anything in just
// get an empty block (the AI still works with generic instructions).
// ------------------------------------------------------------

export interface CompanyProfile {
  companyName: string | null
  industry: string | null
  description: string | null
  targetAudience: string | null
  toneOfVoice: string | null
  differentiators: string | null
}

export interface Product {
  name: string
  description: string | null
  priceInfo: string | null
}

export interface Faq {
  question: string
  answer: string
}

export interface BusinessGoals {
  primaryGoal: string | null
  secondaryGoals: string | null
  successMetrics: string | null
}

export interface AiRules {
  dos: string | null
  donts: string | null
  escalationRule: string | null
}

export interface KnowledgeBase {
  profile: CompanyProfile | null
  products: Product[]
  faqs: Faq[]
  goals: BusinessGoals | null
  rules: AiRules | null
}

const EMPTY_KNOWLEDGE_BASE: KnowledgeBase = {
  profile: null,
  products: [],
  faqs: [],
  goals: null,
  rules: null,
}

/**
 * Fetches everything an account has configured for the AI knowledge
 * base. Never throws — a query failure for any single piece degrades
 * that piece to empty instead of failing the whole assistant call.
 */
export async function getAccountKnowledgeBase(accountId: string): Promise<KnowledgeBase> {
  const db = supabaseAdmin()

  const [profileRes, productsRes, faqsRes, goalsRes, rulesRes] = await Promise.allSettled([
    db
      .from('ai_company_profile')
      .select('company_name, industry, description, target_audience, tone_of_voice, differentiators')
      .eq('account_id', accountId)
      .maybeSingle(),
    db
      .from('ai_products')
      .select('name, description, price_info')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true }),
    db
      .from('ai_faqs')
      .select('question, answer')
      .eq('account_id', accountId)
      .order('created_at', { ascending: true }),
    db
      .from('ai_business_goals')
      .select('primary_goal, secondary_goals, success_metrics')
      .eq('account_id', accountId)
      .maybeSingle(),
    db
      .from('ai_rules')
      .select('dos, donts, escalation_rule')
      .eq('account_id', accountId)
      .maybeSingle(),
  ])

  const kb: KnowledgeBase = { ...EMPTY_KNOWLEDGE_BASE }

  if (profileRes.status === 'fulfilled' && profileRes.value.data) {
    const row = profileRes.value.data
    kb.profile = {
      companyName: row.company_name,
      industry: row.industry,
      description: row.description,
      targetAudience: row.target_audience,
      toneOfVoice: row.tone_of_voice,
      differentiators: row.differentiators,
    }
  }

  if (productsRes.status === 'fulfilled' && productsRes.value.data) {
    kb.products = productsRes.value.data.map((row) => ({
      name: row.name,
      description: row.description,
      priceInfo: row.price_info,
    }))
  }

  if (faqsRes.status === 'fulfilled' && faqsRes.value.data) {
    kb.faqs = faqsRes.value.data.map((row) => ({
      question: row.question,
      answer: row.answer,
    }))
  }

  if (goalsRes.status === 'fulfilled' && goalsRes.value.data) {
    const row = goalsRes.value.data
    kb.goals = {
      primaryGoal: row.primary_goal,
      secondaryGoals: row.secondary_goals,
      successMetrics: row.success_metrics,
    }
  }

  if (rulesRes.status === 'fulfilled' && rulesRes.value.data) {
    const row = rulesRes.value.data
    kb.rules = {
      dos: row.dos,
      donts: row.donts,
      escalationRule: row.escalation_rule,
    }
  }

  return kb
}

/**
 * Renders the knowledge base as a pt-BR text block to prepend to the
 * AI's system instructions, in the order requested by the product
 * spec: Perfil + Produtos + FAQ + Objetivos + Regras (Histórico is
 * the conversation transcript itself, passed separately as `input`).
 * Sections with no content are omitted entirely so an account that
 * hasn't filled everything in doesn't get a prompt padded with empty
 * headers.
 */
export function buildKnowledgeBasePromptBlock(kb: KnowledgeBase): string {
  const sections: string[] = []

  if (kb.profile) {
    const p = kb.profile
    const lines = [
      p.companyName ? `Nome da empresa: ${p.companyName}` : null,
      p.industry ? `Segmento de atuação: ${p.industry}` : null,
      p.description ? `Sobre a empresa: ${p.description}` : null,
      p.targetAudience ? `Público-alvo: ${p.targetAudience}` : null,
      p.toneOfVoice ? `Tom de voz: ${p.toneOfVoice}` : null,
      p.differentiators ? `Diferenciais: ${p.differentiators}` : null,
    ].filter(Boolean)
    if (lines.length > 0) {
      sections.push(`## Perfil da empresa\n${lines.join('\n')}`)
    }
  }

  if (kb.products.length > 0) {
    const lines = kb.products.map((prod) => {
      const parts = [prod.name]
      if (prod.priceInfo) parts.push(`(${prod.priceInfo})`)
      const desc = prod.description ? ` — ${prod.description}` : ''
      return `- ${parts.join(' ')}${desc}`
    })
    sections.push(`## Produtos e serviços\n${lines.join('\n')}`)
  }

  if (kb.faqs.length > 0) {
    const lines = kb.faqs.map((faq) => `P: ${faq.question}\nR: ${faq.answer}`)
    sections.push(`## Perguntas frequentes\n${lines.join('\n\n')}`)
  }

  if (kb.goals) {
    const g = kb.goals
    const lines = [
      g.primaryGoal ? `Objetivo principal: ${g.primaryGoal}` : null,
      g.secondaryGoals ? `Objetivos secundários: ${g.secondaryGoals}` : null,
      g.successMetrics ? `Como medir sucesso: ${g.successMetrics}` : null,
    ].filter(Boolean)
    if (lines.length > 0) {
      sections.push(`## Objetivos comerciais\n${lines.join('\n')}`)
    }
  }

  if (kb.rules) {
    const r = kb.rules
    const lines = [
      r.dos ? `Sempre: ${r.dos}` : null,
      r.donts ? `Nunca: ${r.donts}` : null,
      r.escalationRule ? `Transferir para um humano quando: ${r.escalationRule}` : null,
    ].filter(Boolean)
    if (lines.length > 0) {
      sections.push(`## Regras da IA\n${lines.join('\n')}`)
    }
  }

  return sections.join('\n\n')
}
