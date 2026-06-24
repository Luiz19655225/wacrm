import type {
  AutomationStepConfig,
  AutomationStepType,
  AutomationTriggerConfig,
  AutomationTriggerType,
} from '@/types'

export type TemplateSlug =
  | 'welcome_message'
  | 'out_of_office'
  | 'lead_qualifier'
  | 'follow_up_reminder'
  | 'new_contact_to_pipeline'

export interface TemplateStepSeed {
  step_type: AutomationStepType
  step_config: AutomationStepConfig
  branch?: 'yes' | 'no' | null
  /** Index (within this seed list) of the Condition parent, if nested. */
  parent_index?: number | null
}

export interface AutomationTemplateDefinition {
  slug: TemplateSlug
  name: string
  description: string
  trigger_type: AutomationTriggerType
  trigger_config: AutomationTriggerConfig
  steps: TemplateStepSeed[]
}

export const AUTOMATION_TEMPLATES: Record<TemplateSlug, AutomationTemplateDefinition> = {
  welcome_message: {
    slug: 'welcome_message',
    name: 'Mensagem de boas-vindas',
    description: 'Responde automaticamente a novos contatos com uma saudação.',
    // first_inbound_message (added in PR #33) catches both brand-new
    // contacts AND manually-added/imported contacts on their first-ever
    // reply, which is what a user setting up a "welcome" automation
    // almost always wants. new_contact_created would miss the
    // manually-imported case.
    trigger_type: 'first_inbound_message',
    trigger_config: {},
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text: "Oi! 👋 Obrigado por entrar em contato. Já te respondemos em breve.",
        },
      },
      {
        step_type: 'add_tag',
        step_config: { tag_id: '' },
      },
    ],
  },
  out_of_office: {
    slug: 'out_of_office',
    name: 'Fora do horário',
    description: 'Responde automaticamente fora do horário de atendimento.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'condition',
        step_config: {
          subject: 'time_of_day',
          operand: '18:00-09:00',
        },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Obrigado pela sua mensagem! Nossa equipe está fora do horário de atendimento (9h–18h) e vai responder o mais rápido possível amanhã.",
        },
        parent_index: 0,
        branch: 'yes',
      },
    ],
  },
  lead_qualifier: {
    slug: 'lead_qualifier',
    name: 'Qualificador de leads',
    description: 'Faz perguntas de qualificação para filtrar leads recebidos.',
    trigger_type: 'keyword_match',
    trigger_config: {
      keywords: ['preço', 'orçamento', 'comprar'],
      match_type: 'contains',
    },
    steps: [
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Ótimo — vamos te ajudar com o orçamento! Uma pergunta rápida: quantas licenças/usuários você está buscando?",
        },
      },
      {
        step_type: 'wait',
        step_config: { amount: 10, unit: 'minutes' },
      },
      {
        step_type: 'assign_conversation',
        step_config: { mode: 'round_robin' },
      },
    ],
  },
  follow_up_reminder: {
    slug: 'follow_up_reminder',
    name: 'Lembrete de acompanhamento',
    description: 'Envia um lembrete se o contato não responder em 24 horas.',
    trigger_type: 'new_message_received',
    trigger_config: {},
    steps: [
      {
        step_type: 'wait',
        step_config: { amount: 1, unit: 'days' },
      },
      {
        step_type: 'send_message',
        step_config: {
          text:
            "Voltando aqui — você ainda tem alguma dúvida? Estamos à disposição para ajudar!",
        },
      },
    ],
  },
  // Closes the "contacts são criados mas o Pipeline fica vazio" gap —
  // every new WhatsApp contact lands as a deal in the chosen pipeline
  // stage, AND gets an immediate welcome reply (the simplest possible
  // proof that WAVON automates the first interaction). pipeline_id/
  // stage_id are seeded empty (same convention as welcome_message's
  // tag_id) — the user picks the real pipeline + stage in the builder
  // before activating, since those ids are account-specific and a
  // template can't know them in advance.
  // Enabling/disabling this is just toggling the automation itself
  // (is_active), reusing existing infra instead of a separate setting.
  // Only one step_type per slug fires `send_message` on
  // new_contact_created — pairing it with welcome_message (which fires
  // on first_inbound_message instead) would double-send if both are
  // active, so this is deliberately the one template that owns both
  // actions rather than two templates layered together.
  new_contact_to_pipeline: {
    slug: 'new_contact_to_pipeline',
    name: 'Boas-vindas + negociação para novo contato',
    description:
      'Sempre que um contato novo chegar pelo WhatsApp, cria automaticamente uma negociação no funil escolhido e envia uma mensagem de boas-vindas.',
    trigger_type: 'new_contact_created',
    trigger_config: {},
    steps: [
      {
        step_type: 'create_deal',
        step_config: { pipeline_id: '', stage_id: '', title: 'Novo lead', value: 0 },
      },
      {
        step_type: 'send_message',
        step_config: {
          text: 'Olá, tudo bem? Recebemos sua mensagem e já vamos te atender por aqui.',
        },
      },
    ],
  },
}

export function getTemplate(slug: string): AutomationTemplateDefinition | null {
  return AUTOMATION_TEMPLATES[slug as TemplateSlug] ?? null
}
