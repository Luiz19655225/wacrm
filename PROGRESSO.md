# WAVON CRM — Progresso

Checklist rápido de status por fase. Detalhes completos (decisões, bugs encontrados, achados técnicos) ficam no `CLAUDE.md` — este arquivo é só o resumo de "o que está pronto".

## Fase 1 — Planos, trial, billing (fundação) e conexões multicanal
✅ Concluída e em produção (commit `57a030d`)

## Fase 2 — Billing real (Asaas)
✅ Concluída e validada em produção (commit `754ce90`)
- Subscription ativa: `sub_6gffstr5l42r53od` (plano Pro)
- Pendência não-bloqueante: webhook Asaas não assina `SUBSCRIPTION_CANCELED`

## Fase 3 — WhatsApp via Evolution API
✅ Concluída e validada em produção (commits `c2b2b34`, `e7e0571`, `dc3ff49`, `79936d8`)

- [x] QR Code / pareamento
- [x] Webhook recebendo eventos da Evolution
- [x] `contacts`/`conversations`/`messages` sendo criados e gravados corretamente
- [x] Inbox exibindo histórico e abrindo conversas normalmente
- [x] Envio de mensagens do WAVON → WhatsApp (outbound) — testado e confirmado real
- [x] Mídias inbound (imagem, áudio, vídeo, documento, sticker) — baixadas e exibidas de verdade, não mais placeholder
- [x] CRM automático: contato novo → negociação criada no Pipeline (via automação)

Pendências não-bloqueantes:
- [ ] Remover logs temporários de diagnóstico em `evolution-webhook-processor.ts` (`// TEMP DIAGNOSTIC LOG`)
- [ ] Mensagens de grupo (`@g.us`) criam um "contato" por grupo, não por remetente real

## Fase 4 — MVP operacional (tradução, UX do Inbox, Respostas rápidas, automação comercial)
✅ Concluída e validada em produção (commit `0fd282a`)
- [x] Tradução residual (`/join/[token]` e outras páginas fora do route group `(dashboard)`)
- [x] UX do Inbox (preview de mídia amigável, fallback visual)
- [x] Respostas rápidas — migration `031_quick_replies.sql` aplicada, atalho "/" no Inbox funcionando, painel de gestão em Configurações
- [x] Automação comercial — `send_message` despachando por `connection_id` (Meta ou Evolution)

## Fase 5 — Assistente IA (OpenAI) + Atendente no site
✅ Concluída e validada em produção (commit `5afb9d5`)
- [x] Migration `032_ai_assistant.sql` aplicada
- [x] Cada conta usa sua própria chave OpenAI (criptografada, nunca exposta ao navegador)
- [x] Integração via Responses API (não a Assistants API legada)
- [x] Modelo padrão configurável (`gpt-4o-mini` por padrão)
- [x] Inbox: "Sugerir resposta" (nunca envia automaticamente), "Resumir conversa", "Classificar lead"
- [x] Widget IA no site público — conversas chegando ao Inbox normal, lead criado no Pipeline automaticamente
- [x] `SITE_WIDGET_ACCOUNT_ID` configurada na Vercel

## Fase 6 — IA treinável por empresa (Base de Conhecimento)
✅ Concluída e validada em produção (commit `f0ffb93`)
- [x] Migration `033_ai_knowledge_base.sql` aplicada
- [x] Configurações → IA → Perfil da Empresa, Produtos, FAQ, Objetivos, Regras
- [x] Base de Conhecimento carregada automaticamente em todo prompt (Inbox + widget do site), na ordem Perfil + Produtos + FAQ + Objetivos + Regras + Histórico
- [x] Prompt do assistente simplificado — campo "Instruções personalizadas" passou a cuidar só do comportamento da IA, não de fatos (que vêm da Base de Conhecimento)

## Fase 7 — Base de Conhecimento Inteligente (RAG)
✅ Implementada, auditada e **validada de ponta a ponta em produção real** (commits `805044c`, `9cadcf2`, `ef81777`)

- [x] Migration `034` aplicada em produção — extensão `vector`, tabelas `ai_documents`/`ai_document_chunks`, índice HNSW, função `match_ai_document_chunks()`, bucket privado `ai-knowledge-documents`
- [x] Serviço RAG desacoplado (`src/lib/ai/rag/`) — `extractText`, `chunkText` (testado), `generateEmbeddings`, `storeChunks`, `searchRelevantChunks`, `buildRagPromptBlock`, `processDocument`; reutilizável por qualquer feature futura, não só o Inbox
- [x] `createOpenAIEmbeddings()` centralizada em `openai-client.ts` (`text-embedding-3-small`)
- [x] Upload (`POST /api/ai/knowledge-documents`, admin-only, processamento síncrono) + exclusão (`DELETE .../[id]`)
- [x] Aba "Documentos" em Configurações → IA
- [x] Integração no prompt: Perfil + Produtos + FAQ + Objetivos + Regras + **Documentos relevantes** + Instruções personalizadas + Histórico — só em `suggestReply` (Inbox) e no widget do site
- [x] `npm run typecheck`/`lint`/`build` limpos; testes de `chunkText` (6/6)
- [x] Auditoria técnica final — corrigidos: rejeição de `.doc`/`.ppt`/`.xls` (formato não suportado pelo `officeparser`), paralelização das buscas de IA (latência), defesa em profundidade no `DELETE`
- [x] **Teste real end-to-end em produção**: documento TXT com fato exclusivo ("código secreto do WAVON é 987654") → upload → status `ready` → pergunta no Widget → IA respondeu corretamente citando o documento
- [x] Bug encontrado e corrigido durante a validação: 403 falso-positivo na 2ª mensagem de uma conversa do Widget (checagem de identidade usava comparação estrita de telefone, inconsistente com a comparação tolerante usada para resolver o contato) — corrigido com `phonesMatch`, mesma função já usada no resto do projeto

## Fase 7.1 — Estabilização do RAG
✅ Concluída e validada em produção (commit `2badeb5`)

- [x] Migration `035_ai_rag_observability.sql` (aditiva): novos status transitórios (`extracting`/`embedding`/`indexing`), metadados (`char_count`, `page_count`, `embedding_model`, `embedding_tokens`, `processing_duration_ms`, `content_hash`), `ai_usage_logs` ganha `rag_document_ingest`/`rag_search` + `duration_ms`
- [x] Progresso real sem fila: upload responde rápido (status `extracting`) e continua via `after()` do Next.js (verificado seguro neste ambiente Vercel/Fluid Compute antes de implementar); UI faz polling a ~1s só durante estados transitórios, parando imediatamente em `ready`/`error`
- [x] Duplicidade detectada por hash SHA-256, mas nunca bloqueada pelo sistema — `409` + diálogo "usar existente" ou "enviar mesmo assim" (`force: true`), decisão sempre da empresa
- [x] Observabilidade: `logRagEvent` (JSON estruturado, greppável no `vercel logs`) em cada etapa da pipeline + busca; `ai_usage_logs` agora registra `rag_document_ingest`/`rag_search` com duração — resolve a lacuna encontrada na validação da Fase 7 ("não dava pra confirmar pelos logs se o RAG rodou")
- [x] Mensagens de erro específicas por causa (extração, embeddings — com distinção de falha temporária 429/5xx vs. permanente, indexação)
- [x] Metadados do documento exibidos na UI (tamanho, data, páginas, caracteres, chunks, modelo de embedding) sem consultas extras
- [x] Exclusão verificada (confirma remoção do Storage antes de remover a linha, loga resultado)
- [x] Performance revisada (chunking e busca já dentro da faixa recomendada) — nenhum valor alterado
- [x] Custo OpenAI rastreável (`embedding_tokens` por documento, `duration_ms` por chamada) — base para cobrança futura, nenhuma cobrança implementada
- [x] Testes novos: `duplicate-check.test.ts`, `file-type.test.ts`, `extract-text.test.ts` (mock de `officeparser`); `npm run typecheck`/`lint`/`build` limpos; módulo RAG 17/17 testes passando
- [x] Migration `035` aplicada em produção (manual, SQL Editor) e validada em produção real (teste "Produto X custa R$500" → progresso granular na UI → resposta correta da IA com observabilidade completa)

## Fase 7.2 — Atendimento Fora do Horário + Agendamento Inteligente
⏳ Implementada — aguardando ações manuais (Azure App + migration `036` + Vercel env vars) para deploy

- [x] Migration `036_calendar_scheduling.sql` (criada, **AINDA NÃO APLICADA** — aplicar manualmente no SQL Editor): tabelas `calendar_settings`, `business_hours`, `calendar_appointments`; RLS em todas (leitura: qualquer membro; escrita: admin/owner); índices adequados
- [x] Abstração `CalendarProvider` — `src/lib/calendar/types.ts`: interface `CalendarProvider`, `TimeSlot`, `BusyInterval`, `ResolvedCalendarSettings`, `BusinessHoursConfig`, `BusinessHoursStatus`; o restante do sistema nunca toca diretamente no provider
- [x] Outlook Calendar via Microsoft Graph API — `src/lib/calendar/providers/outlook/`: `oauth.ts` (authorization code flow, authority `consumers`), `client.ts` (HTTP cru, sem SDK), `adapter.ts` (`OutlookCalendarAdapter implements CalendarProvider`)
- [x] OAuth flow seguro — state param = `encrypt(accountId)` (AES-256-GCM, mesmo `encrypt()` já em uso no projeto); callback decripta sem precisar de session store server-side; redirect pós-conexão para `/settings?tab=agenda&connected=1`
- [x] Registro no Azure App necessário (manual — `consumers` authority, escopos `offline_access Calendars.ReadWrite User.Read`, redirect URI `https://www.wavon.com.br/api/calendar/oauth/callback`)
- [x] Horário comercial DST-safe — `src/lib/calendar/business-hours.ts`: `getLocalParts()`/`localToUTC()` via `Intl.DateTimeFormat` (resolve o problema de fuso horário sem precisar da Temporal API), `checkBusinessHours()`, `computeAvailableSlots()`, `formatSlotLabel()` em pt-BR
- [x] Disponibilidade inteligente: busy intervals do Microsoft Graph → sobreposição com horário comercial → slots livres de N minutos → máximo 3 oferecidos à IA
- [x] `getSchedulingContext()` — `src/lib/ai/scheduling-assistant.ts`: paralelo com RAG e Base de Conhecimento; nunca lança erro (degrada para `{isOpen: true, promptBlock: null}` em qualquer falha); injetado no Inbox (`suggestReply`) e no Widget do site
- [x] Quando fora do horário: IA recebe bloco de instruções com horário local atual, quando abre e slots disponíveis — continua respondendo normalmente (nunca só "estamos fechados"), detecta intenção comercial, oferece máximo 3 slots em pt-BR
- [x] Configurações → Agenda: nova seção (`CalendarDays` icon, grupo workspace) com 2 abas — "Conexão" (OAuth + preferências: fuso/duração) e "Horário comercial" (grade 7 dias com checkboxes + seletores de hora)
- [x] Inbox → botão "Agendar": abre dialog com slots disponíveis → seleciona slot → `POST /api/calendar/appointments` → cria evento no Outlook → grava em `calendar_appointments` → registra mensagem no Inbox ("📅 Agendamento confirmado") → atualiza nota do deal no CRM
- [x] Online meeting: Teams (`isOnlineMeeting: true`, `onlineMeetingProvider: 'teamsForBusiness'`) solicitado, com fallback gracioso para contas pessoais (sem exceção se o `joinUrl` não vier)
- [x] Observabilidade: `src/lib/calendar/logger.ts` com `CalendarLogEvent` enum (OAuth, tokens, disponibilidade, agendamento, CRM) e `logCalendarEvent()` → JSON estruturado, mesmo padrão do `logRagEvent`
- [x] `npm run typecheck`/`lint`/`build` limpos (0 erros, 0 warnings novos)

Pendências (ações manuais necessárias antes do deploy):
- [ ] Registrar Azure App em portal.azure.com: tipo "Contas pessoais da Microsoft apenas" (`consumers`), escopos `offline_access Calendars.ReadWrite User.Read`, URI de redirecionamento `https://www.wavon.com.br/api/calendar/oauth/callback`. Anotar `CLIENT_ID` e `CLIENT_SECRET`.
- [ ] Configurar na Vercel: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL=https://www.wavon.com.br`
- [ ] Aplicar migration `036_calendar_scheduling.sql` no SQL Editor do Supabase
- [ ] Commit, push e deploy da Fase 7.2
- [ ] Validar em produção: Configurações → Agenda → conectar Outlook → configurar horário comercial → testar resposta da IA fora do horário → testar agendamento pelo Inbox

## Fase 7.3 — Agendamento Inteligente 2.0 + WAVI
✅ Concluída e validada em produção (commits `b57694a`, `0b5debd`, `453b534`)

- [x] IA sempre ativa para agendamento (não só fora do horário)
- [x] 5 campos obrigatórios antes de qualquer slot (nome, celular, WhatsApp, e-mail, motivo)
- [x] Marcador semântico `[AGENDAR]` — slots nunca aparecem antes dos dados confirmados
- [x] Endpoint público `/api/public/site-widget/schedule`
- [x] Dialog 2 etapas no Inbox (form de dados → seleção de slot)
- [x] Picker inline de horários no Widget
- [x] Google Calendar + Google Meet integrados
- [x] Atendente WAVI (identidade no prompt + UI do widget)
- [x] migrations `036` aplicada em produção

## Fase 8.0 — Agenda WAVON nativa
✅ Concluída e validada em produção (commits `708d485`, `91cc29e`, `11c2faa`)

- [x] Migration `037_agenda_enhancements.sql` aplicada
- [x] `/agenda` com calendário mensal
- [x] Item "Agenda" na sidebar (entre Negociações e Disparos)
- [x] Painel lateral de compromissos
- [x] API de sincronização (`POST /api/calendar/sync`)
- [x] CRUD de compromissos
- [x] Integração com Google Calendar (OAuth, token refresh, criação, Google Meet)
- [x] Sincronização multi-calendário: itera todos os calendários do usuário (filtra `#holiday`/`#contacts`/`#weather`)
- [x] Toast do botão "Sincronizar" com resultado real (eventos inseridos, atualizados, erros de auth)
- [x] Validado com evento de teste "Teste WAVON" (27/06/2026 10:00) — apareceu corretamente na Agenda

## Fase 8.1.1 — Criação de compromissos
✅ Concluída e validada em produção (commits `994267b`, `a99ae0b`)

- [x] Botão "Novo compromisso" na `AgendaHeader`
- [x] `NewAppointmentDialog`: busca de contato existente (debounce 300ms + RLS), modo "Criar novo contato"
- [x] Campos: título, data, hora início, duração, motivo, notas, responsável
- [x] `POST /api/agenda/appointments`: resolve/cria contato no CRM (dedup por telefone), sync Google Calendar não-bloqueante, insere `calendar_appointments` com `origin='Manual'`
- [x] Testes Playwright 9–11 adicionados — **11/11 passando em produção**

## Fase 8.1.2 — Experiência da Agenda
✅ Concluída e validada em produção (commit `8f991b0`)

- [x] Auto-sync silencioso no mount (useRef contra loop/StrictMode)
- [x] Badge de origem nos cards: G (azul) para Google, O (índigo) para Outlook
- [x] Contador de eventos por dia: pill no canto do número
- [x] Destaque do dia atual: ring-1 inset + bg-primary/5
- [x] Hover suave nas células (`hover:bg-muted/15`)
- [x] Painel lateral: duração inline (30 min / 1h / 1h 30min), fallback "Sem contato vinculado", botão "Google Calendar" para eventos GOOGLE
- [x] `getDurationLabel()` e `ORIGIN_BADGE` adicionados a `types.ts`
- [x] Testes Playwright 12–15 adicionados — **15/15 passando em produção**

## Fase 8.1.3 — Organização da Agenda
✅ Concluída e validada em produção (commits `31003d9`, `23ac157`)

- [x] `AgendaFiltersBar`: 3 selects (Responsável, Origem, Status) + botão "Limpar"
- [x] Filtros client-side (sem chamada extra à API)
- [x] Botão "Limpar" só aparece quando há filtro ativo (`data-testid="filter-reset"`)
- [x] Timezone dinâmico: `useEffect` lê `/api/calendar/settings` no mount, fallback `America/Sao_Paulo`
- [x] `src/lib/agenda/stats.ts`: `getAgendaStats()` — base para relatórios futuros
- [x] Fix: `getByText('Ter', { exact: true })` para evitar colisão com text de select options
- [x] Testes Playwright 16–22 adicionados — **22/22 passando em produção**

## Fase 8.1.4 — Comunicação Inteligente da Agenda
✅ Concluída e validada em produção (commits `ff58e57`, `e9e8f46`, `703a96d`) — deploy `dpl_5nwhAq7yHdzrJ5rMGndQHE2SYSCZ`

- [x] Migration `038_appointment_communication.sql` aplicada em produção
- [x] Novos status: `confirmed` (Confirmado) e `no_show` (Não compareceu) — com cores e labels próprias
- [x] Tabela `appointment_comm_log`: histórico de comunicação por compromisso
- [x] Colunas novas em `calendar_appointments`: `confirmed_at`, `comm_confirmation_enabled`, `comm_reminder_enabled`, `comm_channel`
- [x] `src/lib/agenda/comm-service.ts`: `logCommEvent()`, `logStatusChange()`, `getCommLog()` — arquitetura pronta para WhatsApp/email futuro
- [x] `GET /api/agenda/appointments` retorna novos campos de comunicação
- [x] `PATCH /api/agenda/appointments/[id]`: aceita campos de comunicação, seta `confirmed_at`, logging não-bloqueante via `void logStatusChange()`
- [x] `GET /api/agenda/appointments/[id]/comm-log`: endpoint de histórico
- [x] `appointment-panel.tsx` reescrito: Confirmar, Não compareceu, Reagendar, Cancelar, Concluído + seção de preferências + seção de histórico
- [x] Testes Playwright 23–27 adicionados — **27/27 passando em produção**

Gotchas registrados (ver `feedback_serverless_webhooks.md`):
- `CREATE POLICY IF NOT EXISTS` não existe no PostgreSQL — usar `DROP POLICY IF EXISTS` + `CREATE POLICY`
- `ADD COLUMN IF NOT EXISTS` com `CHECK` inline em statement multi-coluna causa syntax error no Supabase — separar cada coluna em `ALTER TABLE` individual

## Fase 8.2 — Comunicação Automática via WhatsApp
✅ Concluída e validada em produção (commit `294dc02`) — deploy `dpl_2vEwbf1UYX98LManozbSZcKzFz4F`

- [x] `src/lib/agenda/intent-detector.ts`: detecção de intenção em texto livre (sim/ok/confirmado/cancelar/reagendar) sem LLM — função pura, normalização NFD
- [x] `src/lib/agenda/whatsapp-notifier.ts`: envia mensagem WhatsApp via Evolution API + loga em `appointment_comm_log` + `tryLinkConversation()` non-blocking
- [x] `src/lib/agenda/comm-dispatcher.ts`: orquestrador `Agenda → WhatsApp → (Email/Push futuros)` — rotas nunca chamam notificador diretamente; `DispatchResult.sent: boolean` agrega todos os canais
- [x] `POST /api/agenda/appointments`: `after()` dispara `appointment_created` após INSERT
- [x] `PATCH /api/agenda/appointments/[id]`: `after()` dispara `appointment_cancelled`/`appointment_rescheduled`
- [x] `evolution-webhook-processor.ts`: detecta intenção em replies do cliente → atualiza status do compromisso (janela 72h)
- [x] Testes Playwright 28–34 adicionados — **34/34 passando em produção**

## Fase 8.3 — Lembretes Automáticos via Cron
✅ Concluída, cron ativo e validado em produção (commits `7a1035c`, `271d3db`) — deploy `dpl_Yp5DdQjHiV2k1LFAFbEQwCJUxFcn`

- [x] Migration `039_reminder_sent_columns.sql` aplicada: 3 colunas dedup (`reminder_24h/2h/30min_sent_at`) + função `claim_reminder_appointments` (CTE + `FOR UPDATE SKIP LOCKED` — dedup atômico, padrão job-queue PostgreSQL)
- [x] `GET /api/agenda/reminders/cron`: autenticado por `x-cron-secret: AUTOMATION_CRON_SECRET`; 3 janelas por execução (24h±15min, 2h±15min, 30min±10min); retry em falha (limpa `sent_at = NULL`); cron nunca referencia canais (só `result.sent`)
- [x] `vercel.json = {}` — Vercel Hobby não suporta cron a cada 15 min; cron externo via cron-job.org
- [x] Cron externo configurado no cron-job.org (28/06/2026): `GET https://www.wavon.com.br/api/agenda/reminders/cron` + header `x-cron-secret` — **HTTP 200 OK validado manualmente**
- [x] Testes Playwright 35–38 adicionados — **38/38 passando em produção**
- [ ] Verificar na próxima sessão: 2 jobs identificados no cron-job.org para a mesma URL — confirmar se duplicados e manter apenas 1 (não bloqueante — endpoint tem dedup atômico)

## Fase 8.4 — Observabilidade e Monitoramento
✅ Concluída e validada em produção (commit `7df3382`) — deploy `dpl_7hyzC4bWeFwU8k5sp9aaQWtLACoM`

- [x] Nova rota `/observabilidade` na sidebar (ícone Activity, entre Agenda e Disparos)
- [x] 3 abas: Agenda (KPIs por período + próximos 24h), Comunicação (comm_log stats), Integrações (GCal + Evolution + Cron)
- [x] `GET /api/observabilidade/agenda?period=today|week|month`
- [x] `GET /api/observabilidade/comunicacao?days=7|14|30`
- [x] `GET /api/observabilidade/integrations`
- [x] Testes Playwright 39–44 adicionados — **44/44 passando em produção**

## Fase 8.5 — Dashboard Executivo
✅ Concluída e validada em produção (commit `8d096da`) — deploy `dpl_8M4sYKcLVtEDhyvdc4ex3doG2Nes`

- [x] Nova rota `/dashboard-executivo` na sidebar (ícone BarChart2, entre Dashboard e Inbox)
- [x] `GET /api/dashboard-exec/resumo`: billing (plano, status), contatos CRM, taxas da Agenda (últimos 30d), pipeline por estágio, volume WhatsApp, saúde das integrações
- [x] `GET /api/dashboard-exec/series?days=7|14|30`: séries temporais diárias de mensagens e compromissos
- [x] 4 KPI cards: plano atual, contatos, compromissos (hoje/semana/mês), mensagens WhatsApp
- [x] 4 cards de taxa da Agenda: confirmação, cancelamento, reagendamento, não compareceu
- [x] 2 bar charts com seletor 7/14/30d (recharts BarChart): mensagens por dia e compromissos por dia
- [x] Pipeline por estágio (horizontal bar chart) + saúde das integrações
- [x] Validado em produção: WAVON Pro, 10 contatos, 100% confirmação, 2.384 msgs/7d
- [x] Testes Playwright 45–51 adicionados — **51/51 passando em produção**

### Correções pós code-review (commit `faf9972`) — deploy `dpl_9bM4faVgqRBPpwVuvR7NCFhnERx3`
- [x] `resumo/route.ts`: `.maybeSingle()` em `account_connections` → `.order(created_at, desc).limit(1)` — evita PGRST116 quando conta tem múltiplas linhas EVOLUTION (reconexão com instance name diferente)
- [x] `series/route.ts`: `from` derivado de `${dates[0]}T00:00:00.000Z` em vez de `now − days*24h` — elimina off-by-one que descartava ~24h de dados silenciosamente por chamada
- [x] `dashboard-exec-page.tsx`: dois `useEffect` separados com `AbortController` próprio — elimina fetch duplo no mount, cancela requisições antigas ao trocar período (7/14/30d) rapidamente

## Fase 8.6 — Analytics Inteligente
✅ Concluída e em deploy (commit `d043699`, deploy `dpl_GMb2BuePapCez6KoxyRuzpVo3GQ1`)

- [x] Nova rota `/analytics` na sidebar (ícone LineChart)
- [x] Filtros globais: Hoje / Ontem / 7d / 30d / 90d / Personalizado
- [x] 6 abas: Comercial, Agenda, Comunicação, Usuários, Clientes, IA
- [x] 6 APIs independentes `/api/analytics/*` com dados reais do Supabase
- [x] Recharts BarCharts + tabelas em todas as abas + exportação CSV por seção
- [x] Lazy loading + AbortController via ref (sem stale responses)
- [x] `src/lib/analytics/date-range.ts` — utilitário compartilhado de séries de datas
- [x] Testes Playwright 52–58 adicionados — **58/58 passando em produção**

## Fase 8.6.1 — Hardening de dados e timezone
✅ Concluída e validada em produção (commit `e8bd0b2`) — deploy `dpl_FZM3JareWrRju61U4vyxHASv4z4E`

- [x] `analytics-filters.tsx`: `toStr()` passou a usar `getFullYear/getMonth/getDate` (hora local) em vez de `toISOString()` (UTC) — corrige preset "Hoje" que resolvia para amanhã depois das 21h no Brasil (UTC-3)
- [x] 6 rotas de analytics: adicionado `.limit(10000)` em queries que precisam de linhas; queries de contagem usam `{ count: 'exact', head: true }` + `.count` (conversas em comunicacao, novos contatos em clientes)
- [x] 58/58 testes Playwright mantidos

## Fase 9.0 — WAVI Copilot (30/06/2026)
✅ Concluída e validada em produção (commit `26dae15`) — deploy `dpl_AsJuqccBvEyR3Qom4aEdUmqdrzFy`

- [x] WAVI-ROADMAP.md: Seções 18 (Plugin System), 19 (Integrações e MCPs) e 20 (Arquitetura Multi-LLM) adicionadas
- [x] `getConversationInsights()` em `src/lib/ai/inbox-assistant.ts` — score 0–100, intenção, próxima ação, alertas, sentimento, sugestão de estágio, detecção de risco (tudo em **uma única chamada IA**)
- [x] `GET /api/ai/inbox/insights` — retorna insights completos para o atendente, com auth, 400/401/404/422 cobrertos
- [x] `src/components/inbox/wavi-insights-panel.tsx` — painel colapsável no sidebar do Inbox: score colorido (Frio=azul, Morno=âmbar, Quente=laranja, Cliente=verde, Perdido=zinc), sentimento badge, próxima ação destacada, alertas, sugestão de estágio, banner de risco
- [x] `contact-sidebar.tsx` — `conversationId` passado como prop; `WaviInsightsPanel` renderizado acima do ScrollArea
- [x] `inbox/page.tsx` — passa `conversationId={activeConversation?.id ?? null}` ao `ContactSidebar`
- [x] Auto-resumo automático em `message-thread.tsx` — banner colapsável "Resumo da WAVI" aparece automaticamente para conversas > 20 mensagens (useRef impede re-disparo)
- [x] `AiFeature` ampliado: `| 'wavi_insights'` adicionado em `ai-settings.ts`
- [x] Migration `040_wavi_copilot.sql` criada (DROP + ADD `ai_usage_logs_feature_check`) — **APLICAR MANUALMENTE no SQL Editor do Supabase**
- [x] Testes Playwright 59–65 adicionados — **65/65 passando em produção**
- [x] Validado em produção: painel WAVI Insights carregou com Score "Frio · 10/100", intenção e sentimento corretos; banner de auto-resumo visível em conversa com muitas mensagens

Pendência obrigatória:
- [ ] **Aplicar `040_wavi_copilot.sql` no SQL Editor do Supabase** — sem isso o log de `ai_usage_logs` com `feature='wavi_insights'` falha silenciosamente (endpoint funciona, mas uso não é rastreado)

## Status geral (30/06/2026)
Plataforma operacional em produção (`www.wavon.com.br`). Migrations `024` a `039` aplicadas. Migration `040` criada, aguardando aplicação manual.

Funcionalidades ativas:
- ✅ CRM (Contatos, Pipeline/Negociações, Automações)
- ✅ Inbox com WhatsApp via Evolution API (inbound + outbound + mídias)
- ✅ Respostas rápidas ("/atalho" no composer)
- ✅ IA via OpenAI (Responses API, chave própria por conta, criptografada)
- ✅ Assistente IA no Inbox: sugerir resposta, resumir, classificar lead
- ✅ **WAVI Copilot no Inbox**: score de lead (0–100), intenção, sentimento, próxima ação, alertas, detecção de risco — painel colapsável no sidebar + auto-resumo para conversas longas
- ✅ Base de Conhecimento: Perfil, Produtos, FAQ, Objetivos, Regras, Documentos (RAG)
- ✅ Widget IA no site público (atendente WAVI + agendamento inteligente)
- ✅ Agenda nativa: calendário mensal, sincronização Google Calendar (multi-calendário), filtros, criação de compromissos, ações de status, comunicação inteligente, histórico de comunicação
- ✅ Comunicação automática via WhatsApp (confirmação + reagendamento + cancelamento)
- ✅ Lembretes automáticos via cron (24h, 2h, 30min — ativo em produção via cron-job.org)
- ✅ Observabilidade e Monitoramento (/observabilidade — Agenda, Comunicação, Integrações)
- ✅ Dashboard Executivo (/dashboard-executivo — KPIs, gráficos, pipeline, integrações)
- ✅ Analytics Inteligente (/analytics — 6 abas, filtros globais, exportação CSV)
- ✅ **65/65 testes Playwright passando em produção**

## Próxima fase
A definir.

Pendências não-bloqueantes:
- **Aplicar `040_wavi_copilot.sql`** no SQL Editor do Supabase (rastreamento de uso do WAVI Insights).
- Enforcement real de billing por `access_status` — fase própria, não iniciar sem aprovação explícita.
- Outlook Calendar: implementado mas sem credenciais Azure (`MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`).
- Logs temporários em `evolution-webhook-processor.ts` (`// TEMP DIAGNOSTIC LOG`) — remover quando estável.
