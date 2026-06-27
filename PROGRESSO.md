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
✅ Concluída e validada em produção (commits `708d485`, `91cc29e`)

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

Pendência de próxima sessão (antes da Fase 8.1):
- [ ] Commitar multi-calendário: remover logs DIAG de `adapter.ts`, then `git add src/lib/calendar/providers/google/client.ts src/lib/calendar/providers/google/adapter.ts && git commit`
- [ ] Push + deploy após o commit

Pendências não-bloqueantes:
- Banner "Payment overdue" no Sandbox Asaas — comportamento esperado (assinatura de sandbox vencida, não é bug de código)
- Outlook Calendar: implementado mas sem credenciais Azure

## Fase 8.1 — Refinamento da Agenda (próxima sessão — aguardando aprovação)

**NÃO iniciar sem aprovação explícita do usuário.**

Prioridades aprovadas no encerramento de 26/06/2026:

1. Sincronização automática ao abrir `/agenda` (sem precisar clicar "Sincronizar")
2. Ocultar banner "Payment overdue" quando ambiente Sandbox
3. Painel lateral de compromissos mais completo
4. Badge de origem do evento: Google / Outlook / Local
5. Destacar dia atual e quantidade de eventos no calendário mensal
6. UX geral do calendário (navegação, hover states)
7. Filtros por usuário, origem e status
8. Botão "Novo compromisso" na Agenda
9. Criar compromisso diretamente no WAVON, sincronizando automaticamente com Google Calendar
10. Timezone dinâmico por conta (usando `calendar_settings.timezone`)

## Status geral
Plataforma operacional em produção (`www.wavon.com.br`): CRM, Inbox, Pipeline, Contatos, Negociações, Automações, Respostas Rápidas, WhatsApp via Evolution, IA via OpenAI com Base de Conhecimento própria por conta + Documentos (RAG) + Widget IA no site + **Agenda nativa com Google Calendar**. Todas as migrations até `037` aplicadas em produção.

## Próximo a planejar
- Fase 8.1 (refinamento da Agenda) — aguardando aprovação explícita.
- Enforcement real de billing por `access_status` (bloquear CRM/automações) — fase própria, não iniciar sem aprovação explícita.
