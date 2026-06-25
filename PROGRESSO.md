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
✅ Implementada (commit pendente nesta sessão) — pendência imediata: aplicar a migration `034_ai_rag_documents.sql` no Supabase

- [x] Migration `034` — extensão `vector`, tabelas `ai_documents`/`ai_document_chunks`, índice HNSW, função `match_ai_document_chunks()`, bucket privado `ai-knowledge-documents`
- [x] Serviço RAG desacoplado (`src/lib/ai/rag/`) — `extractText`, `chunkText` (testado), `generateEmbeddings`, `storeChunks`, `searchRelevantChunks`, `buildRagPromptBlock`, `processDocument`; reutilizável por qualquer feature futura, não só o Inbox
- [x] `createOpenAIEmbeddings()` centralizada em `openai-client.ts` (`text-embedding-3-small`)
- [x] Upload (`POST /api/ai/knowledge-documents`, admin-only, processamento síncrono) + exclusão (`DELETE .../[id]`)
- [x] Aba "Documentos" em Configurações → IA
- [x] Integração no prompt: Perfil + Produtos + FAQ + Objetivos + Regras + **Documentos relevantes** + Instruções personalizadas + Histórico — só em `suggestReply` (Inbox) e no widget do site
- [x] `npm run typecheck`/`lint`/`build` limpos; testes de `chunkText` (6/6)
- [ ] Validação end-to-end com chave OpenAI real (upload real → embeddings → resposta citando o documento) — depende do usuário, mesma limitação das Fases 5/6
- [ ] Aplicar `034_ai_rag_documents.sql` no SQL Editor do Supabase

## Status geral
Plataforma operacional em produção (`www.wavon.com.br`): CRM, Inbox, Pipeline, Contatos, Negociações, Automações, Respostas Rápidas, WhatsApp via Evolution, IA via OpenAI com Base de Conhecimento própria por conta + Documentos (RAG), Widget IA no site. Migrations até `033` aplicadas; `034` pronta, aguardando aplicação manual.

## Próximo a planejar
- Validar Fase 7 em produção com chave OpenAI real, depois aplicar `034` (ver acima).
- Enforcement real de billing por `access_status` (bloquear CRM/automações) — fase própria, não iniciar sem aprovação explícita.
