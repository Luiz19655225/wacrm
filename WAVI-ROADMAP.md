# WAVI — Roadmap Completo

> **Versão:** 1.0 — 28/06/2026  
> **Contexto:** Módulo de IA autônoma do WAVON CRM. Leia em conjunto com `CLAUDE.md` e `PROGRESSO.md`.

---

## 1. Visão Geral

### O que é a WAVI

WAVI é o agente de inteligência artificial do WAVON. Não é um chatbot de regras — é um agente que raciocina, age e aprende, com acesso a ferramentas reais do CRM: agenda, pipeline, base de conhecimento, WhatsApp, Google Calendar e Outlook.

A WAVI existe em dois modos:

| Modo | Descrição |
|------|-----------|
| **Copilot** | Assiste o atendente humano (sugere respostas, resume conversas, classifica leads) |
| **Autônomo** | Executa o atendimento completo sem intervenção humana, dentro de limites configuráveis |

### Objetivos

- Reduzir o tempo de resposta de leads de horas para segundos
- Eliminar tarefas repetitivas dos atendentes (agendamento, triagem, follow-up)
- Manter qualidade e consistência em todo atendimento, 24h por dia
- Gerar dados estruturados (estágio no funil, intenção, urgência) automaticamente

### Princípios

1. **Nunca simula o que não sabe** — escala para humano em vez de inventar
2. **Contexto sempre presente** — memória de curto e longo prazo por contato
3. **Auditável** — cada ação da WAVI gera um log imutável
4. **Configurável por conta** — cada empresa define os limites do agente
5. **Seguro por padrão** — LGPD, controle de acesso, sem ação irreversível sem confirmação

### Diferenciais competitivos

- Integrado nativamente ao CRM: não é uma ferramenta externa conectada por webhook
- Base de conhecimento RAG por empresa: responde com os dados reais da empresa, não com generalidades
- Memória de contato persistente: sabe o histórico completo de cada lead
- Agendamento real via Google Calendar e Outlook: confirma horário disponível antes de oferecer
- Multi-agente: cada empresa pode configurar agentes especializados (comercial, suporte, agenda)

### Como se integra ao WAVON

```
WAVON CRM
├── Inbox            → WAVI Copilot (sugerir, resumir, classificar)
├── Agenda           → WAVI Agente de Agenda
├── Pipeline         → WAVI Agente Comercial
├── Site Widget      → WAVI Atendimento Público (já existe, Fase 7.3)
├── WhatsApp         → WAVI Atendimento Inbound (Fase 9.4)
├── Analytics /ia    → Métricas de uso da WAVI
└── Configurações    → Painel WAVI (prompts, ferramentas, limites, agentes)
```

---

## 2. Visão de Produto

### Problemas que resolve

| Problema | Impacto sem WAVI | Com WAVI |
|----------|-----------------|----------|
| Lead entra às 23h no WhatsApp | Resposta no dia seguinte | Resposta em segundos |
| Atendente esquece de agendar follow-up | Lead esfria | WAVI agenda automaticamente |
| FAQ repetida 50x por dia | Tempo desperdiçado | WAVI responde com base de conhecimento |
| Lead não qualificado chega ao closer | Energia perdida | WAVI qualifica e pontua antes |
| Histórico do lead não consultado | Atendimento genérico | WAVI sabe tudo sobre o contato |

### Público-alvo

- **Empresas B2C com alto volume de leads**: clínicas, imobiliárias, escolas, academias
- **Equipes de vendas pequenas** (1-10 atendentes) que precisam de cobertura fora do horário
- **Negócios orientados a agendamento**: consultas, reuniões, visitas técnicas

### Casos de uso

1. **Qualificação automática de leads WhatsApp** — WAVI recebe, classifica, pontua, encaminha
2. **Agendamento autônomo** — Lead pede horário → WAVI verifica disponibilidade → confirma no calendário
3. **Atendimento no site 24h** — Widget público com WAVI como atendente (já existe)
4. **Follow-up automático** — WAVI envia mensagem de follow-up X dias após última interação
5. **Triagem de suporte** — Diferencia urgente de rotina, responde o rotineiro, escala o urgente
6. **Renovação e upsell** — WAVI identifica oportunidades de venda no histórico e notifica atendente

### Jornada do usuário

```
Lead envia mensagem no WhatsApp
→ Evolution API recebe e envia para WAVON
→ WAVI avalia: é atendimento autônomo ativado para esta conta?
  → Não: cai no Inbox normal (comportamento atual)
  → Sim: WAVI assume
    → Busca memória do contato
    → Busca contexto RAG relevante
    → Raciocina: qual ferramenta usar?
    → Executa (responde / agenda / qualifica / escala)
    → Loga tudo em ai_usage_logs + conversation
→ Atendente vê resumo no Inbox (sempre pode intervir)
```

### Benefícios por fase

| Fase | Benefício principal |
|------|---------------------|
| 9.0 Copilot | Atendentes respondem 40% mais rápido |
| 9.1 Workflows | Follow-ups nunca esquecidos |
| 9.4 Agente Autônomo | 60-80% das conversas resolvidas sem humano |
| 10.0 Multiempresa | Receita escalável sem crescer equipe de suporte |

---

## 3. Arquitetura Geral

### Diagrama de fluxo

```
┌─────────────────────────────────────────────────────────┐
│                     CANAIS DE ENTRADA                   │
│   WhatsApp (Evolution)  │  Site Widget  │  API Direta   │
└──────────────┬──────────┴───────┬───────┴───────┬───────┘
               │                  │               │
               ▼                  ▼               ▼
┌─────────────────────────────────────────────────────────┐
│                    WAVI ORCHESTRATOR                    │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Memória   │  │    Planner   │  │   Executor    │  │
│  │  (curto +   │  │  (raciocina  │  │  (chama       │  │
│  │  longo pz)  │  │   e decide)  │  │  ferramentas) │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │
           ┌───────────────┼────────────────────┐
           ▼               ▼                    ▼
    ┌─────────────┐  ┌──────────────┐   ┌───────────────┐
    │    TOOLS    │  │     RAG      │   │   ESCALAÇÃO   │
    │             │  │              │   │               │
    │ • CRM       │  │ • PDFs       │   │ • Inbox human │
    │ • Agenda    │  │ • FAQs       │   │ • Notificação │
    │ • Pipeline  │  │ • Políticas  │   │ • Handoff msg │
    │ • WhatsApp  │  │ • Produtos   │   └───────────────┘
    │ • GCal      │  │ • Contratos  │
    │ • Outlook   │  └──────────────┘
    │ • Billing   │
    │ • Analytics │
    └──────┬──────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│                      SUPABASE                           │
│   contacts  │  deals  │  calendar_appointments  │       │
│   messages  │  ai_usage_logs  │  wavi_memory  │  ...   │
└─────────────────────────────────────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │   RESPOSTA  │
    │ ao contato  │
    └─────────────┘
```

### Stack técnica

| Camada | Tecnologia |
|--------|-----------|
| Orquestrador | OpenAI Responses API (function calling) |
| Embeddings | `text-embedding-3-small` (já em uso) |
| Vector store | pgvector no Supabase (já em uso) |
| Memória | Supabase (`wavi_memory`, `wavi_contact_context`) |
| Tools | Server-side functions chamadas pelo orquestrador |
| Canais | Evolution API (WhatsApp), Site Widget (já existe) |
| Logs | `ai_usage_logs` + `wavi_action_logs` (novo) |

---

## 4. Memória

### Curto prazo (dentro da conversa)

- Histórico completo da conversa atual (já existe em `messages`)
- Contexto da sessão: intenção detectada, fase no funil, ferramentas já usadas
- Mantido em memória de estado durante a execução do agente (não persiste entre sessões)

### Longo prazo (entre conversas)

**Tabela `wavi_contact_memory`**

```sql
id, account_id, contact_id, memory_type, content, embedding, created_at, updated_at
```

Tipos de memória por contato:
- `fact` — Fato confirmado: "Tem interesse em plano anual", "Já cliente desde 2024"
- `preference` — Preferência: "Prefere ser contactado pela manhã", "Não gosta de ligações"
- `decision` — Decisão registrada: "Recusou proposta de R$500 em 05/2026"
- `summary` — Resumo automático gerado a cada N conversas

### Memória por organização

**Tabela `wavi_account_context`**

Contexto compartilhado entre todos os agentes da conta:
- Informações da empresa (complementa o perfil em `ai_settings`)
- Produto principal atual (pode mudar por temporada)
- Objeções mais comuns e respostas aprovadas
- Políticas de desconto, prazo, garantia

### Resumos automáticos

- Gerado após cada conversa encerrada (via `after()` do Next.js)
- Comprime o histórico da conversa em 3-5 bullet points factuais
- Armazenado em `wavi_contact_memory` com `memory_type = 'summary'`
- Incluído automaticamente no prompt das próximas conversas com o mesmo contato

### Contexto persistente no prompt

Ordem de inclusão no prompt a cada turno:
1. Perfil da conta (RAG knowledge base)
2. Memória do contato (fatos + preferências + última decisão + resumo)
3. Histórico recente da conversa atual (últimas N mensagens)
4. Contexto de ferramentas disponíveis
5. Instruções do agente específico

---

## 5. Ferramentas (Tools)

Cada tool é uma função TypeScript chamada pelo orquestrador via function calling da OpenAI. O retorno é sempre um objeto estruturado que o orquestrador pode raciocinar sobre.

### `crm_get_contact`
- **Descrição:** Busca dados completos de um contato pelo ID ou telefone
- **Input:** `{ contact_id?: string, phone?: string }`
- **Output:** `{ name, phone, email, tags, stage, lastInteraction, openDeals[] }`
- **Uso:** WAVI precisa saber com quem está falando antes de responder

### `crm_update_contact`
- **Descrição:** Atualiza campos do contato (tags, notas, estágio)
- **Input:** `{ contact_id, fields: { tags?, notes?, custom_field? } }`
- **Output:** `{ success, updated_fields }`
- **Requer confirmação:** Não (baixo risco)

### `agenda_check_availability`
- **Descrição:** Retorna slots disponíveis no próximo período
- **Input:** `{ days_ahead: number, duration_minutes: number }`
- **Output:** `{ slots: [{ date, time, label }] }` (máximo 3 slots)
- **Uso:** Antes de oferecer horário, verificar se está disponível de verdade

### `agenda_book_appointment`
- **Descrição:** Cria compromisso no calendário e no CRM
- **Input:** `{ contact_id, slot_datetime, reason, notes? }`
- **Output:** `{ appointment_id, calendar_event_id, confirmation_message }`
- **Requer confirmação:** Sim (ação com efeito real)

### `agenda_cancel_appointment`
- **Descrição:** Cancela compromisso existente
- **Input:** `{ appointment_id, reason }`
- **Output:** `{ success, cancelled_at }`
- **Requer confirmação:** Sim

### `pipeline_create_deal`
- **Descrição:** Cria negociação no pipeline para o contato
- **Input:** `{ contact_id, stage_id, value?, notes? }`
- **Output:** `{ deal_id, stage_name }`
- **Uso:** Quando WAVI qualifica um lead como oportunidade real

### `pipeline_move_deal`
- **Descrição:** Move negociação para outro estágio
- **Input:** `{ deal_id, stage_id, reason? }`
- **Output:** `{ success, new_stage }`

### `pipeline_get_deal`
- **Descrição:** Retorna dados da negociação ativa do contato
- **Input:** `{ contact_id }`
- **Output:** `{ deal_id, stage, value, created_at, notes }`

### `whatsapp_send_message`
- **Descrição:** Envia mensagem de texto pelo WhatsApp
- **Input:** `{ conversation_id, text }`
- **Output:** `{ message_id, sent_at }`
- **Requer confirmação:** Não (é o fluxo normal de resposta)

### `whatsapp_send_media`
- **Descrição:** Envia arquivo, imagem ou documento
- **Input:** `{ conversation_id, type, url, caption? }`
- **Output:** `{ message_id }`
- **Requer confirmação:** Sim (envio de arquivo)

### `knowledge_search`
- **Descrição:** Busca na base de conhecimento da empresa (RAG)
- **Input:** `{ query, top_k?: number }`
- **Output:** `{ chunks: [{ content, source, relevance_score }] }`
- **Uso:** Responder perguntas sobre produtos, políticas, preços

### `memory_save_fact`
- **Descrição:** Salva um fato sobre o contato na memória de longo prazo
- **Input:** `{ contact_id, type, content }`
- **Output:** `{ memory_id }`

### `memory_get_contact`
- **Descrição:** Recupera memória acumulada de um contato
- **Input:** `{ contact_id }`
- **Output:** `{ facts[], preferences[], decisions[], last_summary }`

### `billing_get_status`
- **Descrição:** Retorna status financeiro do contato (cliente ativo, inadimplente, etc.)
- **Input:** `{ contact_id }`
- **Output:** `{ status, plan, next_due_date, amount_due? }`
- **Uso:** Agente de suporte saber se cliente está em dia antes de liberar acesso

### `analytics_get_contact_summary`
- **Descrição:** Retorna métricas de engajamento do contato (conversas, compromissos, deals)
- **Input:** `{ contact_id, days?: number }`
- **Output:** `{ conversations_count, appointments_count, last_contact_at, engagement_score }`

### `escalate_to_human`
- **Descrição:** Transfere a conversa para um atendente humano
- **Input:** `{ conversation_id, reason, priority: 'normal'|'urgent', summary }`
- **Output:** `{ ticket_id, assigned_to?, eta_minutes? }`
- **Uso:** Quando WAVI não sabe responder, cliente pediu humano, ou situação de risco

---

## 6. RAG (Base de Conhecimento)

### Estado atual (já construído — Fases 6 e 7)

- Upload de PDFs e TXTs via painel `Configurações → IA → Documentos`
- Extração de texto via `officeparser`
- Chunking em fragmentos de ~500 tokens com sobreposição de 50 tokens
- Embeddings via `text-embedding-3-small` (OpenAI)
- Armazenamento no pgvector (Supabase) com índice HNSW
- Busca semântica por similaridade coseno
- Detecção de duplicatas por hash SHA-256

### Expansão planejada

**Formatos adicionais:**

| Formato | Status | Observação |
|---------|--------|-----------|
| PDF | ✅ Já existe | |
| TXT | ✅ Já existe | |
| DOCX / Word | Fase 9.3 | Via `officeparser` (suporte parcial já existe) |
| XLSX / Excel | Fase 9.3 | Converter tabelas em texto estruturado |
| MD (Markdown) | Fase 9.3 | Direto — split por cabeçalho |
| URL (scraping) | Fase 10.0 | Crawler básico para página de produto |
| FAQ estruturada | Fase 9.3 | UI dedicada: campo Pergunta + Resposta |
| Política de texto | Fase 9.3 | Template: nome da política + conteúdo |

**Versionamento de documentos:**

```sql
-- Adicionar a ai_documents
version        integer NOT NULL DEFAULT 1
replaced_by    uuid REFERENCES ai_documents(id)
is_current     boolean NOT NULL DEFAULT true
```

Quando um novo documento substitui um existente (mesmo `content_hash` diferente):
1. Marca o antigo com `is_current = false, replaced_by = novo_id`
2. Remove chunks do antigo do índice vetorial
3. Processa e indexa o novo
4. Mantém histórico para auditoria

**Permissões por agente:**

Cada agente pode ter acesso apenas a um subconjunto de documentos:
```sql
-- Nova tabela
wavi_agent_document_access (agent_id, document_id, granted_at)
```

Caso não exista restrição: agente acessa todos os documentos da conta.

**Busca melhorada:**

- **Rerank:** após busca vetorial, reordenar por relevância híbrida (vetorial + BM25)
- **Citação:** cada chunk retornado inclui `source_document` e `page_number` para o agente citar a fonte
- **Fallback:** se score de relevância < 0.6, WAVI não usa o chunk e prefere admitir que não sabe

---

## 7. Agentes

Cada agente é uma instância da WAVI com prompt específico, ferramentas autorizadas e limites de autonomia próprios. Múltiplos agentes podem coexistir na mesma conta.

### Agente: Atendimento (`wavi_agent_type = 'atendimento'`)

**Função:** Primeiro contato, qualificação inicial, triagem de intenção

**Ferramentas autorizadas:**
- `crm_get_contact`, `crm_update_contact` (tags/notes apenas)
- `knowledge_search`
- `memory_save_fact`, `memory_get_contact`
- `whatsapp_send_message`
- `escalate_to_human`

**Limites:**
- Não pode criar ou cancelar compromissos
- Não pode alterar estágio do pipeline
- Pode qualificar (tag) mas não pode converter automaticamente

**Prompt base:**
> Você é WAVI, a atendente da {empresa}. Responda de forma simpática, objetiva e profissional. Seu papel é entender o que o contato precisa e, se puder, resolver. Se não puder, encaminhe para um atendente.

---

### Agente: Comercial (`wavi_agent_type = 'comercial'`)

**Função:** Qualificação aprofundada, apresentação de proposta, follow-up

**Ferramentas autorizadas:** Tudo do Atendimento +
- `pipeline_create_deal`, `pipeline_move_deal`, `pipeline_get_deal`
- `agenda_check_availability`, `agenda_book_appointment`

**Limites:**
- Não pode enviar propostas com desconto acima do configurado
- Não pode fechar negócio sem confirmação humana (para planos > R$X)

---

### Agente: Agenda (`wavi_agent_type = 'agenda'`)

**Função:** Agendamento, reagendamento, lembretes, confirmações

**Ferramentas autorizadas:**
- `crm_get_contact`
- `agenda_check_availability`, `agenda_book_appointment`, `agenda_cancel_appointment`
- `whatsapp_send_message`
- `knowledge_search` (políticas de cancelamento, etc.)

**Limites:**
- Não pode cancelar sem perguntar ao contato
- Não pode criar compromisso com menos de X horas de antecedência (configurável)

---

### Agente: Financeiro (`wavi_agent_type = 'financeiro'`)

**Função:** Cobranças, inadimplência, renovações, upgrades

**Ferramentas autorizadas:**
- `crm_get_contact`, `billing_get_status`
- `whatsapp_send_message`
- `knowledge_search`
- `escalate_to_human` (para negociação de dívida)

**Limites:**
- Não pode prometer desconto ou parcelamento
- Deve escalar para humano qualquer negociação de valor

---

### Agente: Suporte (`wavi_agent_type = 'suporte'`)

**Função:** Dúvidas técnicas, problemas de acesso, guias de uso

**Ferramentas autorizadas:**
- `crm_get_contact`, `billing_get_status`
- `knowledge_search`
- `whatsapp_send_message`
- `escalate_to_human`

**Limites:**
- Sem acesso ao pipeline ou agenda
- Classificação de urgência obrigatória antes de escalar

---

### Agente: Analytics (`wavi_agent_type = 'analytics'`)

**Função:** Responde perguntas sobre dados do CRM em linguagem natural

**Ferramentas autorizadas:**
- `analytics_get_contact_summary`
- Tool `analytics_query` (NL → SQL seguro via OpenAI)

**Limites:**
- Somente leitura
- Queries limitadas a dados da própria conta
- Não pode exportar dados em massa

---

### Agente: Supervisor (`wavi_agent_type = 'supervisor'`)

**Função:** Monitora os outros agentes, detecta anomalias, sugere melhorias

**Acesso:** Logs de todos os outros agentes da conta  
**Não interage com contatos diretamente**  
**Output:** Relatório semanal para o administrador da conta

---

## 8. Workflows

### Motor de Workflows (Fase 9.1)

Extensão do motor de automações existente (`src/app/api/automations/engine`) com suporte a:

**Tipos de evento (gatilhos):**

| Evento | Descrição |
|--------|-----------|
| `contact.created` | Novo contato adicionado ao CRM |
| `message.received` | Nova mensagem recebida de contato |
| `message.keyword` | Mensagem contém palavra-chave específica |
| `appointment.created` | Novo compromisso criado |
| `appointment.status_changed` | Status mudou (pending→confirmed, etc.) |
| `deal.stage_changed` | Deal movido de estágio |
| `deal.created` | Novo deal criado |
| `contact.inactive_for` | Contato sem interação por N dias |
| `schedule.cron` | Agenda recorrente (diário, semanal) |
| `wavi.escalated` | WAVI escalou para humano |
| `webhook.external` | Evento recebido de sistema externo |

**Tipos de ação:**

| Ação | Descrição |
|------|-----------|
| `wavi.send_message` | WAVI envia mensagem via WhatsApp |
| `wavi.run_agent` | Executa agente WAVI em modo autônomo |
| `crm.update_contact` | Atualiza campo do contato |
| `crm.add_tag` | Adiciona tag ao contato |
| `pipeline.move_deal` | Move deal de estágio |
| `agenda.book_appointment` | Agenda compromisso |
| `notification.send` | Notifica atendente humano |
| `wait.duration` | Aguarda N horas/dias antes do próximo passo |
| `wait.until` | Aguarda até data/hora específica |
| `condition.branch` | Bifurcação condicional (if/else) |
| `loop.for_each` | Executa ação para cada item de uma lista |
| `webhook.call` | Chama endpoint externo (Zapier, Make, etc.) |

**Exemplo de workflow — Follow-up de lead frio:**

```
GATILHO: contact.inactive_for (7 dias)
  ↓
CONDIÇÃO: deal.stage == 'Proposta enviada'
  → Sim:
      AÇÃO: wait.duration (2h)  -- não enviar imediatamente
      AÇÃO: wavi.send_message ("Oi {nome}, conseguiu dar uma olhada na proposta?")
      AÇÃO: wait.duration (3 dias)
      CONDIÇÃO: message.received (resposta nos últimos 3 dias)
        → Não: notification.send (atendente: "Lead {nome} não respondeu follow-up")
        → Sim: wavi.run_agent (agente: comercial)
  → Não: encerrar
```

**Logs de execução:**

Cada execução de workflow gera registro em `workflow_runs`:
```
id, workflow_id, contact_id, started_at, status, steps_executed, error_at, completed_at
```

Cada passo gera registro em `workflow_step_logs`:
```
id, run_id, step_type, step_input, step_output, executed_at, duration_ms
```

---

## 9. Copilot

Funcionalidades assistivas dentro do Inbox — a WAVI sugere, o atendente decide.

### Sugestões de resposta (já existe — Fase 5)

- Botão "Sugerir resposta" no compositor do Inbox
- Usa RAG + histórico da conversa + contexto do deal
- Atendente pode editar antes de enviar
- **Melhorias planejadas (Fase 9.0):**
  - Tom configurável (formal, amigável, técnico)
  - Comprimento configurável (curta / detalhada)
  - Sugestão proativa (sem clicar, aparece ao lado do compositor)

### Resumos (já existe — Fase 5)

- Botão "Resumir conversa" no Inbox
- **Melhorias planejadas:**
  - Resumo automático ao abrir conversa longa (>20 mensagens)
  - Exportar resumo como nota no deal
  - Detectar e destacar compromissos mencionados na conversa

### Classificação de lead (já existe — Fase 5)

- Botão "Classificar lead" atribui tag de qualidade
- **Melhorias planejadas:**
  - Score numérico (0-100) em vez de tag apenas
  - Atualização automática a cada nova mensagem
  - Destaque visual no Inbox (prioridade alta em vermelho)

### Insights de conversas (Fase 9.0)

Nova seção no painel lateral do Inbox:
- **Intenção detectada:** "Quer agendar consulta" / "Comparando preços" / "Suporte"
- **Próxima ação sugerida:** "Oferecer slot para quarta-feira" / "Enviar proposta"
- **Alertas:** "Mencionou concorrente X" / "Sinalizou urgência" / "Pediu desconto"
- **Sentimento:** Positivo / Neutro / Negativo (por mensagem)

### Priorização do Inbox (Fase 9.0)

- Score de prioridade automático por conversa
- Ordenação do Inbox por prioridade (não só por mais recente)
- Critérios: urgência detectada, valor do deal, tempo sem resposta, histórico do contato

---

## 10. Agente Autônomo

### O que pode executar sozinho (sem confirmação humana)

| Ação | Condição |
|------|----------|
| Responder perguntas da base de conhecimento | Sempre |
| Enviar mensagem de boas-vindas | Primeiro contato |
| Qualificar e tagear lead | Sempre |
| Verificar disponibilidade de horário | Sempre |
| Confirmar presença em compromisso | Sempre |
| Salvar fatos na memória do contato | Sempre |
| Criar deal no pipeline | Se configurado pela conta |
| Agendar compromisso | Se configurado pela conta |
| Enviar follow-up programado | Se habilitado no workflow |

### O que requer confirmação humana (por padrão)

| Ação | Por quê |
|------|---------|
| Cancelar compromisso | Impacto no calendário e no relacionamento |
| Enviar proposta comercial | Conteúdo e valor devem ser revisados |
| Escalar para outro agente | Mudança de contexto relevante |
| Negociar condições (desconto, prazo) | Decisão comercial |
| Fechar deal | Conversão final é do humano |
| Enviar arquivo | Risco de conteúdo inadequado |

### Configuração por conta

Cada conta configura no painel WAVI:

```
[x] Modo autônomo ativado
[ ] Agendar compromissos sem confirmação
[x] Criar deals automaticamente
[ ] Enviar propostas
[x] Escalar automaticamente após 3 perguntas sem resposta
Tempo máximo de resposta: [30] segundos
Horário de autonomia: [08:00] até [18:00]
Fora do horário: [  ] Autônomo  [x] Apenas resposta padrão
```

### Limites de segurança invioláveis

Independente de configuração:
- WAVI **nunca** envia dados pessoais do contato para terceiros
- WAVI **nunca** faz transferências financeiras
- WAVI **nunca** exclui registros do CRM
- WAVI **sempre** escala se o contato pedir explicitamente um humano
- WAVI **sempre** loga cada ação com timestamp e raciocínio

### Protocolo de handoff (transferência para humano)

Quando WAVI escala:
1. WAVI envia mensagem ao contato: "Um atendente irá continuar nossa conversa em breve."
2. WAVI gera resumo da conversa e salva como nota interna
3. Inbox marca conversa como "Escalada pela WAVI" com badge visual
4. Atendente recebe notificação com contexto completo
5. WAVI silencia — não responde mais nesta sessão (até reset manual)

---

## 11. Segurança

### Permissões por função

| Função | Pode configurar WAVI | Pode ver logs | Pode intervir em conversa | Pode desativar |
|--------|---------------------|---------------|--------------------------|----------------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Member | ❌ | Próprias | ✅ | ❌ |

### LGPD

- Todo dado processado pela WAVI é da própria conta (sem compartilhamento com terceiros)
- Chave OpenAI é da conta (`openai_key_encrypted`) — dados não usados para treino (API não coleta)
- `wavi_contact_memory`: dados podem ser apagados por solicitação (`DELETE WHERE contact_id = X`)
- Exportação de memória disponível em formato JSON (portabilidade)
- Retenção configurável: memórias com > N meses sem atualização são arquivadas automaticamente

### Auditoria

**Tabela `wavi_action_logs`** (nova, imutável — sem UPDATE/DELETE):

```sql
id             uuid PRIMARY KEY DEFAULT gen_random_uuid()
account_id     uuid NOT NULL
agent_type     text NOT NULL
conversation_id uuid
contact_id     uuid
action         text NOT NULL  -- tool chamada ou decisão tomada
input_summary  text           -- resumo do input (não os dados brutos)
output_summary text           -- resumo do output
reasoning      text           -- raciocínio do agente (chain-of-thought)
tokens_used    integer
duration_ms    integer
created_at     timestamptz NOT NULL DEFAULT now()
```

RLS: somente leitura para members, leitura/escrita apenas para service_role.

### Controle por organização

- Cada conta tem sua própria configuração de WAVI independente
- Um agente não pode acessar dados de outra conta (RLS + accountId explícito em todas as queries admin)
- Chave OpenAI da conta — se conta for suspensa, WAVI dessa conta para imediatamente

---

## 12. Banco de Dados

### Novas tabelas por fase

#### Fase 9.0 — Copilot

```sql
-- Configuração da WAVI por conta
CREATE TABLE wavi_settings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL UNIQUE REFERENCES accounts(id),
  autonomous_mode   boolean NOT NULL DEFAULT false,
  active_agent_ids  uuid[],                      -- quais agentes estão ativos
  response_timeout  integer NOT NULL DEFAULT 30,  -- segundos
  active_hours_from time,                         -- null = 24h
  active_hours_to   time,
  out_of_hours_mode text NOT NULL DEFAULT 'standard_reply', -- 'standard_reply' | 'autonomous' | 'silent'
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Agentes configurados por conta
CREATE TABLE wavi_agents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid NOT NULL REFERENCES accounts(id),
  agent_type    text NOT NULL, -- 'atendimento' | 'comercial' | 'agenda' | ...
  name          text NOT NULL,
  system_prompt text,           -- customização do prompt base
  tools_enabled text[],         -- lista de tools autorizadas
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

#### Fase 9.3 — Memória

```sql
-- Memória de longo prazo por contato
CREATE TABLE wavi_contact_memory (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL,
  contact_id  uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  memory_type text NOT NULL, -- 'fact' | 'preference' | 'decision' | 'summary'
  content     text NOT NULL,
  embedding   vector(1536),
  source      text,          -- 'conversation_id' que originou a memória
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON wavi_contact_memory(account_id, contact_id);
CREATE INDEX ON wavi_contact_memory USING hnsw (embedding vector_cosine_ops);

-- Contexto por organização (compartilhado entre agentes)
CREATE TABLE wavi_account_context (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES accounts(id),
  context    jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### Fase 9.4 — Agente Autônomo

```sql
-- Logs imutáveis de ações da WAVI
CREATE TABLE wavi_action_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       uuid NOT NULL,
  agent_id         uuid REFERENCES wavi_agents(id),
  conversation_id  uuid,
  contact_id       uuid,
  action           text NOT NULL,
  input_summary    text,
  output_summary   text,
  reasoning        text,
  tokens_used      integer,
  duration_ms      integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON wavi_action_logs(account_id, created_at DESC);
CREATE INDEX ON wavi_action_logs(contact_id, created_at DESC);
```

#### Fase 9.1 — Workflows

```sql
-- Extensão da tabela de automações existente
ALTER TABLE automations ADD COLUMN IF NOT EXISTS workflow_version integer NOT NULL DEFAULT 2;

-- Runs de workflows
CREATE TABLE workflow_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id  uuid NOT NULL REFERENCES automations(id),
  contact_id   uuid REFERENCES contacts(id),
  account_id   uuid NOT NULL,
  status       text NOT NULL DEFAULT 'running', -- 'running' | 'completed' | 'failed' | 'cancelled'
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_at     timestamptz,
  error_msg    text
);

-- Logs por passo
CREATE TABLE workflow_step_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id       uuid NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_type    text NOT NULL,
  step_input   jsonb,
  step_output  jsonb,
  executed_at  timestamptz NOT NULL DEFAULT now(),
  duration_ms  integer
);
```

### RLS em todas as novas tabelas

Padrão do projeto — `is_account_member(account_id)` para SELECT, INSERT, UPDATE. DELETE somente para admin/owner.

---

## 13. APIs

### Padrão de versionamento

Todas as APIs WAVI ficam sob `/api/wavi/*`.  
Versão implícita pelo path (sem `/v1/` por enquanto — adicionar quando houver breaking change).

### Endpoints planejados

#### Configuração

```
GET    /api/wavi/settings              → wavi_settings da conta
PATCH  /api/wavi/settings              → atualizar configurações
GET    /api/wavi/agents                → listar agentes da conta
POST   /api/wavi/agents                → criar agente
PATCH  /api/wavi/agents/[id]           → editar agente
DELETE /api/wavi/agents/[id]           → desativar agente
```

#### Execução

```
POST   /api/wavi/run                   → executar agente em conversa
       body: { conversation_id, agent_id?, message }
       response: { response_text, actions_taken[], memory_saved[] }

POST   /api/wavi/escalate              → forçar escalação para humano
       body: { conversation_id, reason }
```

#### Memória

```
GET    /api/wavi/memory/[contact_id]   → memória de longo prazo de um contato
POST   /api/wavi/memory/[contact_id]   → salvar fato manualmente
DELETE /api/wavi/memory/[contact_id]   → apagar toda memória de um contato (LGPD)
```

#### Logs e observabilidade

```
GET    /api/wavi/logs                  → logs de ações paginados
       query: { contact_id?, agent_id?, from?, to?, page }
       response: { logs[], total, page }

GET    /api/wavi/logs/[contact_id]     → histórico de ações para um contato
```

#### Workflows

```
GET    /api/workflows                  → listar (já existe em /api/automations)
POST   /api/workflows                  → criar workflow
PATCH  /api/workflows/[id]             → editar
DELETE /api/workflows/[id]             → remover
POST   /api/workflows/[id]/activate    → ativar/pausar
GET    /api/workflows/[id]/runs        → histórico de execuções
```

#### Payloads

```typescript
// POST /api/wavi/run
interface WaviRunRequest {
  conversation_id: string
  agent_type?: WaviAgentType     // usa default da conta se omitido
  message: string                // mensagem do contato que disparou
  simulate?: boolean             // dry-run: não envia mensagem de verdade
}

interface WaviRunResponse {
  response_text: string
  actions_taken: WaviAction[]
  memory_saved: WaviMemoryEntry[]
  escalated: boolean
  escalation_reason?: string
  tokens_used: number
  duration_ms: number
}
```

---

## 14. Interface

### Configurações → WAVI (nova aba)

**Subabas:**

**1. Geral**
- Toggle "Modo autônomo"
- Configurar horário de atividade
- Configurar comportamento fora do horário
- Mensagem padrão fora do horário

**2. Agentes**
- Lista de agentes com status ativo/inativo
- Botão "Novo agente" → formulário:
  - Tipo (dropdown)
  - Nome personalizado
  - Prompt customizado (textarea com contagem de tokens)
  - Ferramentas autorizadas (checkboxes)
  - Limites de autonomia
- Preview: testar agente com mensagem de exemplo

**3. Memória**
- Busca por contato → ver memória acumulada
- Deletar memória de contato específico
- Exportar memória (JSON)
- Configurar retenção (N meses)

**4. Logs**
- Tabela paginada de ações da WAVI
- Filtros: data, agente, tipo de ação, contato
- Expandir linha → ver raciocínio completo (chain-of-thought)
- Exportar CSV

### Inbox — painel lateral expandido

**Nova seção "WAVI Insights"** (abaixo do perfil do contato):
- Badge de status: "WAVI ativa nesta conversa" / "Modo humano"
- Intenção detectada (chips coloridos)
- Score de qualificação (barra 0-100)
- Próxima ação sugerida
- Botão "Ativar WAVI" / "Desativar WAVI" por conversa

**Indicador visual de mensagens da WAVI:**
- Avatar WAVI nas mensagens enviadas autonomamente (distinto do avatar do atendente)
- Tooltip: "Enviado pela WAVI · [ação tomada]"

### Analytics /analytics — aba IA (melhorias)

**Adições na aba IA existente:**
- KPI: "Conversas resolvidas pela WAVI sem intervenção humana" (% de resolução)
- KPI: "Tempo médio de resposta da WAVI" (vs. tempo médio humano)
- Gráfico: Escalações por motivo (pizza)
- Gráfico: Resolução autônoma vs. escalada por agente (barras agrupadas)
- Tabela: Top 10 perguntas mais frequentes → gaps na base de conhecimento

### Workflows — builder visual (Fase 9.1)

- Canvas drag-and-drop (substituir formulário atual de automações)
- Nós: Gatilho, Condição, Ação, Espera, Loop, Fim
- Conexões visuais entre nós
- Painel lateral de configuração por nó
- Modo simulação: testar com contato de exemplo
- Histórico de execuções vinculado ao workflow

---

## 15. Roadmap de Fases

### Fase 9.0 — Copilot Inteligente
**Objetivo:** Tornar o Copilot proativo, não apenas reativo  
**Prazo estimado:** 2-3 sessões

- [ ] Insight automático ao abrir conversa (intenção + score + próxima ação)
- [ ] Sugestão de resposta proativa no Inbox (não precisa clicar)
- [ ] Resumo automático para conversas > 20 mensagens
- [ ] Score de qualificação numérico (0-100) substituindo tag
- [ ] Priorização do Inbox por score de urgência

**Migrations:** `040_wavi_settings.sql`, `041_wavi_agents.sql`

---

### Fase 9.1 — Workflows Avançados
**Objetivo:** Motor de workflow completo com builder visual  
**Prazo estimado:** 3-4 sessões

- [ ] Motor de workflow v2 com suporte a wait/branch/loop
- [ ] Builder visual de workflows (canvas)
- [ ] Eventos adicionais: `contact.inactive_for`, `deal.stage_changed`, `schedule.cron`
- [ ] Ação `wavi.run_agent` nos workflows
- [ ] Logs de execução por passo
- [ ] Templates pré-configurados (follow-up, boas-vindas, reengajamento)

**Migrations:** `042_workflow_runs.sql`, `043_workflow_step_logs.sql`

---

### Fase 9.2 — Campanhas Inteligentes
**Objetivo:** Disparos segmentados com personalização por IA  
**Prazo estimado:** 2 sessões

- [ ] Segmentação por score WAVI, tags, estágio no pipeline
- [ ] Personalização de mensagem com variáveis da memória do contato
- [ ] A/B test de mensagens (2 variantes)
- [ ] Relatório de entrega, abertura e resposta
- [ ] WAVI como respondedor automático às respostas das campanhas

---

### Fase 9.3 — Knowledge Base Avançada
**Objetivo:** RAG mais rico, mais formatos, com versionamento  
**Prazo estimado:** 2 sessões

- [ ] Suporte a DOCX, XLSX, Markdown
- [ ] FAQ estruturada (UI dedicada: pergunta + resposta)
- [ ] Versionamento de documentos
- [ ] Permissões por agente
- [ ] Rerank pós-busca vetorial
- [ ] Citação de fonte nas respostas da WAVI
- [ ] Detecção de gap: perguntas sem resposta na base

**Migrations:** `044_rag_versioning.sql`, `045_agent_document_access.sql`

---

### Fase 9.4 — Agente Conversacional Autônomo
**Objetivo:** WAVI assume atendimento completo no WhatsApp inbound  
**Prazo estimado:** 4-5 sessões

- [ ] Orquestrador com function calling (OpenAI Responses API)
- [ ] Todas as tools implementadas (ver seção 5)
- [ ] Memória de longo prazo por contato
- [ ] Protocolo de handoff para humano
- [ ] `wavi_action_logs` com raciocínio completo
- [ ] Painel de configuração em Configurações → WAVI
- [ ] Insights no Inbox (painel WAVI)
- [ ] Logs e auditoria completos

**Migrations:** `046_wavi_contact_memory.sql`, `047_wavi_action_logs.sql`, `048_wavi_account_context.sql`

---

### Fase 9.5 — Portal do Cliente
**Objetivo:** O contato acessa dados próprios via link seguro  
**Prazo estimado:** 2-3 sessões

- [ ] Link pessoal gerado por conta (`wavon.com.br/cliente/[token]`)
- [ ] Contato vê: próximos compromissos, histórico, documentos compartilhados
- [ ] Auto-agendamento pelo portal (sem precisar do WhatsApp)
- [ ] Confirmação de presença pelo portal
- [ ] Chat embarcado (widget WAVI dentro do portal)

---

### Fase 10.0 — Multiempresa (Multi-tenant WAVI)
**Objetivo:** Revenda de WAVI como produto independente  
**Prazo estimado:** 6-8 sessões

- [ ] Cada empresa tem conta WAVON independente
- [ ] Reseller dashboard: gerenciar múltiplas contas
- [ ] White-label: marca própria do reseller
- [ ] Billing por conta (Asaas multi-tenant)
- [ ] Isolamento total de dados entre contas
- [ ] Scraping de URL para RAG automático (página de produto da empresa)

---

### Fase 10.5 — Marketplace de Skills
**Objetivo:** Agentes especializados instaláveis  
**Prazo estimado:** 4-5 sessões

- [ ] Skill = agente pré-configurado com prompt + tools + workflow pronto
- [ ] Catálogo: "Clínica Médica", "Imobiliária", "Academia", "E-commerce"
- [ ] Instalação com 1 clique: configura agente + workflows + templates de mensagem
- [ ] Skills customizadas: empresa cria e publica no marketplace
- [ ] Receita compartilhada: criador recebe % das instalações pagas

---

### Fase 11.0 — Ecossistema WAVON
**Objetivo:** Plataforma aberta com API pública  
**Prazo estimado:** 8-10 sessões

- [ ] API pública documentada (`api.wavon.com.br/v1/`)
- [ ] OAuth para apps de terceiros acessarem dados da conta
- [ ] Webhooks configuráveis (qualquer evento → endpoint externo)
- [ ] SDK TypeScript/Python oficial
- [ ] Integrações nativas: Shopify, HubSpot, RD Station, Pipedrive
- [ ] WAVI como API: empresas incorporam WAVI em seus próprios produtos

---

## 16. Critérios de Qualidade

Para cada fase, antes do commit, na ordem:

1. **`npm run typecheck`** — 0 erros TypeScript
2. **`npm run lint`** — 0 erros novos (warnings pré-existentes tolerados)
3. **`npm run build`** — build Next.js limpo, sem rotas ausentes
4. **`npm run validate:agenda`** (Playwright) — 100% dos testes existentes passando
5. **Testes novos** — cobertura dos novos fluxos da fase
6. **Browser assistido** — validação manual dos fluxos críticos em produção real
7. **Validação em produção** — smoke check em `www.wavon.com.br` após deploy
8. **Documentação** — `CLAUDE.md`, `PROGRESSO.md` e `WAVI-ROADMAP.md` atualizados

### Critérios específicos por tipo de feature

**Agente autônomo:**
- [ ] Testar cenário feliz: pergunta simples → resposta correta
- [ ] Testar escalação: pergunta fora do escopo → handoff para humano
- [ ] Testar limite de autonomia: ação bloqueada → mensagem de recusa
- [ ] Testar memória: segunda conversa reconhece fato da primeira
- [ ] Testar RAG: resposta cita fonte da base de conhecimento

**Workflows:**
- [ ] Testar execução completa de um workflow end-to-end
- [ ] Testar condição falsa: bifurcação vai para ramo correto
- [ ] Testar espera: ação executada apenas após o delay
- [ ] Testar falha: erro em um passo não derruba os anteriores

**APIs:**
- [ ] Retornar 401 sem autenticação
- [ ] Retornar 403 para conta errada
- [ ] Retornar 400 para payload inválido
- [ ] Rate limiting: não deve aceitar mais de 10 req/s por conta

---

## 17. Backlog

### Funcionalidades futuras

- **Voz:** transcrição automática de áudios recebidos (Whisper) antes de passar para WAVI
- **Vídeo:** análise de vídeos enviados pelo contato
- **WAVI Proativa:** WAVI inicia conversa baseada em evento (ex: vencimento próximo)
- **WAVI de Onboarding:** guia o novo usuário do WAVON pelo produto no primeiro acesso
- **Tradução automática:** detectar idioma do contato e responder no mesmo idioma
- **Multi-LLM:** suporte a Anthropic Claude, Gemini como alternativa ao OpenAI
- **Edge WAVI:** versão mais leve para resposta imediata (< 500ms) com modelo menor
- **WAVI em Grupos WhatsApp:** participar de grupos como membro silencioso que responde quando mencionado

### Melhorias

- **Streaming de resposta:** WAVI começa a digitar enquanto raciocina (WebSocket no Inbox)
- **Explicabilidade:** atendente pode ver "por que a WAVI respondeu isso" em cada mensagem
- **Feedback loop:** atendente corrige resposta da WAVI → melhora o próximo turno
- **Teste A/B de prompts:** comparar dois prompts com tráfego real
- **Cache de embeddings:** cache de 24h para queries RAG idênticas
- **Compressão de contexto:** resumir contexto automaticamente quando token count > 80% do limite

### Integrações planejadas

| Integração | Uso |
|-----------|-----|
| Google Sheets | Exportar dados do CRM / importar leads |
| Notion | Base de conhecimento alternativa ao RAG |
| Cal.com | Agendamento público (alternativa ao calendário próprio) |
| Stripe | Billing alternativo ao Asaas (mercado internacional) |
| Intercom | Migração de histórico de conversas |
| Typeform | Formulário de qualificação → CRM automaticamente |

---

## 18. Sistema de Skills (Plugin System)

### O que é uma Skill

Uma Skill é um agente WAVI pré-configurado e empacotado para um segmento específico. Ela encapsula tudo que a WAVI precisa para atuar naquele domínio: prompt especializado, base de conhecimento própria, memória própria, ferramentas autorizadas e permissões de autonomia.

Pensar em Skills como "plugins de mercado vertical" — a empresa instala a Skill do seu segmento e a WAVI já sabe como se comportar, sem configuração manual.

### Diferença entre Agente e Skill

| | Agente | Skill |
|--|--------|-------|
| Configurado por | O próprio usuário da conta | Criado por especialistas no segmento |
| Escopo | Função (atendimento, comercial, agenda...) | Domínio de negócio (jurídico, clínica, imobiliária...) |
| Portabilidade | Exclusivo da conta | Instalável em qualquer conta |
| Atualização | Manual (pelo usuário) | Gerenciada pela WAVON ou parceiro |
| Monetização | Sem custo extra | Pode ser gratuita ou paga |

### Arquitetura de uma Skill

```
Skill
├── manifest.json          → id, name, version, segment, author, price
├── prompt.md              → system prompt especializado do segmento
├── knowledge/             → base de conhecimento RAG pré-carregada
│   ├── glossary.txt       → termos técnicos do domínio
│   ├── faq.json           → perguntas e respostas comuns do segmento
│   └── policies.md        → políticas e protocolos típicos
├── tools.json             → quais tools WAVI pode usar neste segmento
├── memory_schema.json     → quais tipos de fato salvar na memória (campos extras)
└── workflows/             → automações pré-configuradas (templates)
    ├── welcome.json
    └── follow_up.json
```

### Tabelas de banco — Fase 10.5

```sql
-- Catálogo de Skills disponíveis
CREATE TABLE wavi_skills (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,        -- 'juridico', 'clinica', 'imobiliaria'
  name         text NOT NULL,
  segment      text NOT NULL,
  description  text,
  author       text NOT NULL DEFAULT 'WAVON',
  version      text NOT NULL DEFAULT '1.0',
  price_brl    numeric(10,2) NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  manifest     jsonb NOT NULL DEFAULT '{}', -- prompt, tools, memory_schema
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Skills instaladas por conta
CREATE TABLE account_skills (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   uuid NOT NULL REFERENCES accounts(id),
  skill_id     uuid NOT NULL REFERENCES wavi_skills(id),
  installed_at timestamptz NOT NULL DEFAULT now(),
  installed_by uuid REFERENCES auth.users(id),
  is_active    boolean NOT NULL DEFAULT true,
  config       jsonb NOT NULL DEFAULT '{}', -- customizações da conta sobre a skill
  UNIQUE (account_id, skill_id)
);
```

### Skills planejadas

| Skill | Segmento | Prompt especializado | Ferramentas extras |
|-------|----------|---------------------|-------------------|
| `clinica` | Clínicas médicas e odontológicas | Linguagem clínica, LGPD de saúde, protocolo de triagem | `agenda_book_appointment` obrigatório |
| `juridico` | Escritórios de advocacia | Linguagem técnica jurídica, NÃO dá aconselhamento | Apenas `escalate_to_human` |
| `contabilidade` | Escritórios contábeis | DRE, balancete, obrigações fiscais | `knowledge_search` (legislação) |
| `imobiliaria` | Corretoras e imobiliárias | Ficha do imóvel, simulação de financiamento | `agenda_check_availability` |
| `academia` | Academias e studios | Planos, aulas experimentais, renovação | `billing_get_status` |
| `seguros` | Corretoras de seguros | Tipos de apólice, sinistro, renovação | `escalate_to_human` prioritário |
| `abracred` | Regularização de crédito | Negativação, renegociação, Score Serasa | `crm_update_contact` (tags de perfil) |
| `nabzon` | Marketing de afiliados | Recomendação de ferramentas, comissões | `knowledge_search` (catálogo) |
| `ecommerce` | Lojas virtuais | Pedido, rastreio, devolução | `webhook.call` (API da loja) |
| `saas` | Empresas de software | Planos, trial, onboarding, suporte técnico | `billing_get_status` |

### RAG próprio por Skill

Cada Skill pode carregar sua própria base de conhecimento ao ser instalada:
- Documentos pré-carregados no bucket `ai-knowledge-documents` com tag `skill_id`
- Busca vetorial filtra por `account_id + skill_id` quando o agente ativo é da Skill
- A conta pode adicionar seus próprios documentos sobre a Skill (ex: tabela de preços própria)
- Precedência: documentos da conta > documentos da Skill > prompt base da Skill

### Memória própria por Skill

`memory_schema.json` define campos extras a serem extraídos e salvos por contato:

```json
{
  "skill": "clinica",
  "extra_facts": [
    { "key": "especialidade_interesse", "label": "Especialidade de interesse", "type": "text" },
    { "key": "convenio", "label": "Convênio médico", "type": "text" },
    { "key": "urgencia", "label": "É urgência?", "type": "boolean" }
  ]
}
```

### Permissões por Skill

Cada Skill define quais tools são permitidas por padrão. O administrador da conta pode restringir ainda mais, mas não pode ampliar além do que a Skill declara:

```json
{
  "tools_allowed": ["crm_get_contact", "knowledge_search", "escalate_to_human"],
  "tools_blocked_forever": ["pipeline_create_deal"],
  "autonomous_actions": ["whatsapp_send_message"],
  "requires_confirmation": ["agenda_book_appointment"]
}
```

### Marketplace de Skills (Fase 10.5)

- Catálogo navegável em Configurações → WAVI → Marketplace
- Instalação com 1 clique (cria agente + carrega RAG + configura workflows pré-definidos)
- Preview da Skill: descrição, segmento, tools incluídas, avaliações de outras empresas
- Skills gratuitas: mantidas pela WAVON
- Skills pagas: parceiros criam e publicam, recebem % de cada instalação ativa
- Skills personalizadas: empresa cria para uso interno ou para vender no marketplace

---

## 19. Arquitetura de Integrações e MCPs

### Princípios gerais

1. **Sem coupling direto**: a WAVI nunca chama uma integração diretamente. Toda integração é acessada via um `IntegrationAdapter`, que expõe uma interface padronizada independente de provider.
2. **Auditoria por padrão**: todo request a um sistema externo gera um log em `integration_request_logs`.
3. **Falha gracioso**: timeout ou erro de integração nunca derruba a resposta da WAVI — ela retorna o melhor resultado disponível.
4. **Zero secret no código**: chaves e tokens ficam em variáveis de ambiente (Vercel) ou criptografadas no banco (AES-256-GCM), nunca em código.

### Interface padrão de um IntegrationAdapter

```typescript
interface IntegrationAdapter<TConfig, TRequest, TResponse> {
  readonly name: string
  readonly version: string

  // Autenticação
  isConfigured(accountId: string): Promise<boolean>
  refreshToken(accountId: string): Promise<void>        // se aplicável

  // Operação
  request(accountId: string, payload: TRequest): Promise<TResponse>

  // Saúde
  healthCheck(accountId: string): Promise<{ ok: boolean; latencyMs: number }>
}
```

### Padrões obrigatórios

#### Autenticação e refresh de tokens

Toda integração com OAuth (Google, Microsoft, etc.) usa o padrão:
1. Tokens salvos criptografados no banco (`access_token_encrypted`, `refresh_token_encrypted`)
2. Antes de cada request, verificar `expires_at`; se dentro de 5 minutos, renovar
3. Se refresh falhar, logar `token_refresh_failed` e retornar erro específico (não erro genérico)
4. Nunca expor token em log, response body ou error message

```typescript
async function getValidToken(accountId: string): Promise<string> {
  const record = await loadTokens(accountId)
  if (!record) throw new IntegrationNotConfiguredError()
  if (isExpiringSoon(record.expiresAt)) {
    await refreshAndSave(accountId, record.refreshToken)
    return loadTokens(accountId).then(r => decrypt(r!.accessToken))
  }
  return decrypt(record.accessToken)
}
```

#### Retry com backoff exponencial

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  opts = { maxAttempts: 3, baseDelayMs: 500 }
): Promise<T> {
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === opts.maxAttempts || !isRetryable(err)) throw err
      await sleep(opts.baseDelayMs * 2 ** (attempt - 1))
    }
  }
  throw new Error('unreachable')
}

function isRetryable(err: unknown): boolean {
  // Retryable: 429, 503, network timeout. NOT retryable: 400, 401, 403, 404.
  if (err instanceof HttpError) return [429, 503, 504].includes(err.status)
  if (err instanceof TypeError) return err.message.includes('fetch failed')
  return false
}
```

#### Timeout por integração

| Integração | Timeout padrão | Máximo |
|-----------|---------------|--------|
| Supabase (DB) | 5s | 10s |
| Evolution API | 8s | 15s |
| Google Calendar | 10s | 20s |
| OpenAI / Anthropic / Gemini | 30s | 60s |
| Asaas | 10s | 20s |
| N8N / Make / Zapier | 15s | 30s |
| GitHub / Vercel | 10s | 20s |

#### Cache de resposta

Respostas imutáveis ou de baixa frequência de mudança são cacheadas em memória (Next.js `unstable_cache` ou objeto singleton):

| Dado | TTL sugerido |
|------|-------------|
| Lista de calendários Google | 1 hora |
| Configurações da conta (AI, Calendar) | 5 minutos |
| Planos de billing | 30 minutos |
| Chunks RAG para a mesma query | 24 horas |
| Free/busy do calendário | 5 minutos |

#### Rate limiting por integração

Cada adapter controla o rate limit do provider:

```typescript
// Exemplo: Evolution API — 60 mensagens/minuto por instância
const evolutionRateLimiter = new SlidingWindowRateLimiter({
  maxRequests: 60,
  windowMs: 60_000,
  keyFn: (accountId) => `evolution:${accountId}`,
})
```

Quando o rate limit é atingido:
- Operações críticas (resposta ao cliente): espera até 3s antes de falhar
- Operações de background (sync, log): descarta silenciosamente e agenda retry

#### Auditoria

```sql
CREATE TABLE integration_request_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL,
  integration     text NOT NULL,   -- 'google_calendar', 'evolution', 'openai', ...
  operation       text NOT NULL,   -- 'list_events', 'send_message', 'create_embedding', ...
  status          text NOT NULL,   -- 'success' | 'error' | 'timeout' | 'rate_limited'
  status_code     integer,
  duration_ms     integer,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON integration_request_logs(account_id, integration, created_at DESC);
```

### Mapa de integrações

| Integração | Tipo | Auth | Adapter | Fase |
|-----------|------|------|---------|------|
| **Supabase** | Banco de dados + Storage | Service Role Key | `supabaseAdmin()` (já existe) | ✅ Ativo |
| **Evolution API** | WhatsApp | API Key | `evolution-adapter.ts` (já existe) | ✅ Ativo |
| **Google Workspace** | Calendário + Meet | OAuth2 PKCE | `google/adapter.ts` (já existe) | ✅ Ativo |
| **Microsoft 365** | Calendário + Teams | OAuth2 PKCE | `outlook/adapter.ts` (existe, sem credenciais) | ⏳ Aguardando Azure App |
| **Asaas** | Billing e cobranças | API Key | `asaas-client.ts` (já existe) | ✅ Ativo |
| **OpenAI** | LLM + Embeddings | API Key (por conta) | `openai-client.ts` (já existe) | ✅ Ativo |
| **Anthropic** | LLM alternativo | API Key | `anthropic-client.ts` (planejado) | Fase 10.5 |
| **Gemini** | LLM alternativo | API Key | `gemini-client.ts` (planejado) | Fase 10.5 |
| **OpenRouter** | Multi-LLM gateway | API Key | `openrouter-client.ts` (planejado) | Fase 10.5 |
| **GitHub** | Código-fonte | Token | Vercel GitHub App | ✅ Ativo (CI/CD) |
| **Vercel** | Deploy e observabilidade | Token | Vercel MCP | ✅ Ativo (deploy) |
| **N8N** | Automações externas | Webhook | `n8n-adapter.ts` (planejado) | Fase 9.1 |
| **Make** | Automações externas | Webhook | `make-adapter.ts` (planejado) | Fase 9.1 |
| **Zapier** | Automações externas | Webhook | `zapier-adapter.ts` (planejado) | Fase 9.1 |

### MCPs (Model Context Protocol)

MCPs são servidores que expõem ferramentas e recursos para modelos de IA. A WAVI pode consumir MCPs como fonte de dados e ações no modo agente.

#### Arquitetura WAVI + MCP

```
WAVI Orchestrator
  └─► MCP Client
        ├─► mcp://supabase      → query ao banco, tabelas como recursos
        ├─► mcp://vercel        → logs, deploys, status
        ├─► mcp://calendar      → eventos, disponibilidade
        └─► mcp://wavon-tools   → ferramentas proprietárias da WAVI
```

#### MCP Server WAVON (planejado — Fase 11.0)

Expõe as ferramentas da WAVI como MCP Server, permitindo que agentes de IA externos (Claude, GPT, etc.) interajam com o CRM:

```
Ferramentas expostas:
- contacts_list, contacts_get, contacts_create, contacts_update
- deals_list, deals_get, deals_create, deals_move_stage
- appointments_list, appointments_get, appointments_book
- messages_list, messages_send
- knowledge_search
```

Auth: OAuth (Sign in with WAVON) ou API Key com escopo definido por conta.

### Fallback entre integrações

```typescript
// Exemplo: fallback do calendário
async function getAvailableSlots(accountId: string): Promise<Slot[]> {
  try {
    const adapter = await getCalendarAdapter(accountId)
    if (adapter) return await adapter.getFreeBusyIntervals(...)
  } catch {
    // Calendário indisponível — retorna slots sem verificação de conflito
    logIntegrationEvent('calendar', 'fallback_triggered')
  }
  return computeSlotsWithoutCalendar(businessHours)
}
```

---

## 20. Arquitetura Multi-LLM

### O que é o Model Router

O Model Router é o componente que decide qual LLM usar em cada chamada da WAVI. A decisão é automática, baseada em políticas configuráveis por conta e por tarefa.

O objetivo é maximizar qualidade × custo × velocidade simultaneamente — não existe um único modelo ótimo para todas as tarefas.

### Políticas de escolha de modelo

#### Por tipo de tarefa

| Tarefa | Modelo recomendado | Justificativa |
|--------|-------------------|---------------|
| Chat / atendimento | GPT-4o-mini / Haiku | Velocidade + custo baixo |
| Sugestão de resposta Inbox | GPT-4o-mini | Qualidade conversacional |
| Resumo de conversa | GPT-4o-mini | Tarefa simples, custo importa |
| Classificação de lead | GPT-4o-mini | Classificação binária/categórica |
| Programação / geração de SQL | GPT-4o / Sonnet | Precisão técnica crítica |
| OCR / análise de imagem | GPT-4o (vision) | Único com visão no stack atual |
| Tradução | GPT-4o-mini | Custo baixo, qualidade suficiente |
| Resumo de documentos longos | Claude Sonnet | Janela de contexto maior |
| Planejamento estratégico | Claude Opus / GPT-4o | Raciocínio complexo |
| Análise de documentos legais | Claude Sonnet | Precisão + contexto longo |
| Geração de conteúdo | GPT-4o / Sonnet | Criatividade + qualidade |
| Embeddings | text-embedding-3-small | Custo/performance já validado |
| Fallback de qualquer tarefa | GPT-4o-mini | Sempre disponível |

#### Por configuração da conta

Cada conta pode definir no painel WAVI → Configurações avançadas:
- Modelo preferido (sobrescreve o padrão por tarefa)
- Modelo de fallback
- Budget mensal máximo (em tokens ou R$)
- Provedores permitidos (ex: "apenas OpenAI")

### Interface do Model Router

```typescript
interface ModelRouterRequest {
  accountId: string
  task: ModelTask
  contextTokens: number        // estimativa de tokens do contexto
  urgency: 'low' | 'normal' | 'high'
  preferredProvider?: 'openai' | 'anthropic' | 'gemini' | 'openrouter'
}

type ModelTask =
  | 'chat'
  | 'suggest_reply'
  | 'summarize'
  | 'classify'
  | 'code_generation'
  | 'ocr'
  | 'translation'
  | 'document_summary'
  | 'planning'
  | 'document_analysis'
  | 'content_generation'
  | 'embedding'

interface ModelRouterResponse {
  provider: 'openai' | 'anthropic' | 'gemini' | 'openrouter'
  model: string
  maxTokens: number
  estimatedCostBrl: number
}

async function selectModel(req: ModelRouterRequest): Promise<ModelRouterResponse>
```

### Fallback em cascata

```
Tentativa 1: modelo ideal para a tarefa
  → falhou? (429, 503, timeout)
Tentativa 2: modelo de fallback configurado pela conta
  → falhou?
Tentativa 3: GPT-4o-mini (sempre disponível, chave OpenAI obrigatória)
  → falhou?
Erro crítico — logar, escalar para humano se for chat
```

### Retry com modelo diferente

Se o modelo ideal falha por limite de contexto (`context_length_exceeded`):
- Truncar o contexto e tentar novamente com o mesmo modelo, OU
- Escalar para um modelo com janela maior (ex: GPT-4o → Claude Sonnet 200k)

### Cache de respostas LLM

Respostas determinísticas (temperature=0) podem ser cacheadas por hash do input:

```typescript
interface LlmCacheEntry {
  inputHash: string           // SHA-256 de (model + instructions + input)
  response: string
  cachedAt: Date
  ttlSeconds: number
  hitCount: number
}
```

TTL por tarefa:
- `classify` → 1 hora (lead não muda rápido)
- `summarize` → 5 minutos (conversa pode crescer)
- `suggest_reply` → sem cache (contexto muda a cada mensagem)
- `embedding` → 24 horas (mesmo texto, mesmo embedding)

### Métricas e observabilidade

```sql
-- Extensão da ai_usage_logs existente (aditiva — sem migration nova)
-- Campos já presentes: feature, model, input_tokens, output_tokens, status
-- Campos a adicionar futuramente:
ALTER TABLE ai_usage_logs
  ADD COLUMN IF NOT EXISTS provider       text,        -- 'openai' | 'anthropic' | 'gemini'
  ADD COLUMN IF NOT EXISTS cost_brl       numeric(10,6),
  ADD COLUMN IF NOT EXISTS cache_hit      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fallback_used  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retry_count    integer NOT NULL DEFAULT 0;
```

Métricas disponíveis no Analytics → IA:
- Custo total por conta/mês por provider
- Taxa de cache hit por tarefa
- Taxa de fallback (indica problemas de disponibilidade)
- Latência média por modelo e tarefa
- Top tarefas por custo
- Modelos mais usados

### Custos estimados (referência — junho 2026)

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|--------|----------------------|------------------------|
| GPT-4o-mini | US$0,15 | US$0,60 |
| GPT-4o | US$2,50 | US$10,00 |
| Claude Haiku 4.5 | US$0,80 | US$4,00 |
| Claude Sonnet 4.6 | US$3,00 | US$15,00 |
| Claude Opus 4.8 | US$15,00 | US$75,00 |
| Gemini Flash 2.0 | US$0,075 | US$0,30 |
| Gemini Pro 2.5 | US$1,25 | US$10,00 |
| text-embedding-3-small | US$0,02 | — |

Estratégia recomendada para WAVON:
- **80% das chamadas**: GPT-4o-mini (velocidade + custo)
- **15% das chamadas**: GPT-4o / Claude Sonnet (tarefas complexas)
- **5% das chamadas**: Claude Opus / GPT-4o (raciocínio estratégico)

### Implementação por fase

| Fase | O que o Model Router faz |
|------|--------------------------|
| Atual (9.0) | Usa modelo configurado pela conta (sem roteamento automático) |
| 9.4 | Roteamento simples por tarefa (chat vs. análise) |
| 10.0 | Roteamento completo com fallback em cascata |
| 10.5 | Otimização por custo/performance com métricas reais |
| 11.0 | Multi-provider com OpenRouter como gateway |

---

*Este documento é vivo. Atualizar ao encerrar cada fase.*
