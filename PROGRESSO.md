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
✅ Implementada (commit pendente) — migration `035` ainda **não aplicada** em produção

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
- [ ] Aplicar migration `035` em produção (manual, SQL Editor) e validar com teste real (upload → progresso granular na UI → exclusão)

## Status geral
Plataforma operacional em produção (`www.wavon.com.br`): CRM, Inbox, Pipeline, Contatos, Negociações, Automações, Respostas Rápidas, WhatsApp via Evolution, IA via OpenAI com Base de Conhecimento própria por conta + Documentos (RAG, validado em produção real; estabilização da Fase 7.1 implementada, aguardando aplicação da migration `035`), Widget IA no site. Todas as migrations até `034` aplicadas (`035` pendente).

## Próximo a planejar
- Enforcement real de billing por `access_status` (bloquear CRM/automações) — fase própria, não iniciar sem aprovação explícita.
