@AGENTS.md

# WAVON CRM — Estado do projeto

## Localização e infraestrutura
- Pasta: `C:\Users\Luiz\Wavon CRM`
- Repo: `https://github.com/Luiz19655225/wacrm.git`, branch `main`
- Deploy: Vercel, projeto `wavon`, team `abracreds-projects`
- Domínio de produção: `https://www.wavon.com.br`
- Stack: Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4 + Supabase, componentes shadcn-like sobre `@base-ui/react`
- DNS do domínio fica na **HostGator** — nunca trocar os nameservers para a Vercel. Preservar registros de e-mail/serviços da HostGator (mail, webmail, cpanel, whm).
- E-mail e painéis HostGator confirmados funcionando (22/06/2026): `comercial@wavon.com.br` já testado, `cpanel.wavon.com.br` e `webmail.wavon.com.br` no ar — sem conflito com o site em produção na Vercel.
- WhatsApp: **Evolution API** (decisão revertida em 23/06/2026 — ver seção "Decisões e restrições" abaixo; a regra antiga "apenas Meta Business Cloud API" não vale mais).
- Nunca expor o nome de origem/template do projeto ("WACRM") em conteúdo público ou visível ao usuário final — só pode aparecer em código/infraestrutura interna.

## Seção /docs — estado atual (22/06/2026)
Todas as 15 páginas da documentação estão com conteúdo real e publicadas em produção. Não há mais páginas em stub.

- `/docs`, `/docs/visao-geral`, `/docs/primeiros-passos`, `/docs/atendimento-hibrido`, `/docs/agente-de-ia`, `/docs/faq` — publicadas no commit `841f18e`.
- `/docs/inbox`, `/docs/contatos`, `/docs/negociacoes`, `/docs/modelos`, `/docs/disparos`, `/docs/automacoes`, `/docs/fluxos`, `/docs/configuracoes`, `/docs/equipe` — publicadas no commit `5da2fdd`.
- Metadata (`title`/`description`) própria em cada página.
- Sidebar responsiva: estática a partir de `md:` (768px); abaixo disso, drawer mobile (`src/components/docs/docs-mobile-nav.tsx` + `docs-nav-links.tsx`).
- Paginação anterior/próximo (`docs-pager.tsx`) é calculada automaticamente a partir da ordem de `DOCS_NAV` em `src/components/docs/docs-nav-items.ts` — ao adicionar uma página nova, basta inserir o item no grupo certo dessa lista; não precisa editar o pager.
- Estilo de conteúdo (`docs-prose`, em `src/app/globals.css`) é compartilhado por todas as páginas via `<DocsArticle>` — qualquer página nova herda a mesma tipografia automaticamente.
- Deploy de produção mais recente: `dpl_GL3uDcJrAasNYVzhbWQ25Eh1VkVq`, smoke check HTTP 200 em todas as 15 rotas no domínio de produção.

## Home comercial (/) — estado atual (22/06/2026)
- Header e hero reformulados: hairline em gradiente no header, headline/subtítulo novos, CTAs em gradiente de marca (`#2f5fff` → `#8b5cf6`), mockup do Inbox/atendimento híbrido construído em código (`src/components/marketing/product-mockup.tsx`, sem screenshot real) substituindo o grid de ícones antigo.
- Componentes: `src/components/marketing/marketing-nav.tsx`, `hero.tsx`, `product-mockup.tsx` (novo), utilitário `.shadow-wavon-glow` em `src/app/globals.css`.
- Publicado no commit `b48ac35`, deploy `dpl_3QBju29wE4P4wENKLjRLrSmmqeUL`.
- Seções abaixo da dobra (Recursos, Como funciona, Demo) e o Footer não foram tocados nesta rodada.

## Fase 1 — Planos, trial, billing e conexões multicanal — estado atual (22/06/2026)
Fundação aditiva para planos, trial de 30 dias, billing (Asaas) e conexões multicanal (QR Code/Evolution + Meta API/Meta), aprovada e em produção. Nenhuma funcionalidade existente (`whatsapp_config`, CRM, docs, middleware) foi alterada.

- **Banco**: migrations `024_billing_plans` a `028_account_connections` aplicadas no Supabase — tabelas `plans`, `account_subscriptions`, `billing_events`, `usage_counters`, `account_connections`. Todas com RLS via `is_account_member()`, seguindo o padrão já usado no resto do projeto.
- **Seed**: `supabase/seed/plans_seed.sql` carregado — planos `start` (R$197), `pro` (R$397), `scale` (R$797), todos `is_active = true`.
- **Trigger `handle_new_user()`**: recriado (mudança mínima, aditiva) para gerar `account_subscriptions` com trial real de 30 dias em todo signup novo (`trial_status='active'`, `subscription_status='trialing'`, `access_status='trial'`). Validado em produção com signup real.
- **Backfill**: contas pré-existentes ficaram grandfathered como `not_applicable` / `active` / `active` (sem trial) — preservado e validado.
- **Sem enforcement ainda**: nada nega acesso com base em `access_status`/trial — isso é Fase 2.
- **App**: painel "Plan & billing" em `/settings` (`src/components/settings/billing-panel.tsx`); rotas `/api/billing/plans`, `/api/billing/subscription`, `/api/billing/webhook`, `/api/channels/connections`. Placeholders de conexão QR Code/Meta API gravando corretamente em `account_connections`, validado em produção.
- Publicado no commit `57a030d`, deploy `dpl_Eadk7YzQGRroVhsGWqXa59w6tZon`, smoke check OK (`/`, `/docs` 200; `/settings` 307 sem sessão; `/api/billing/plans` e `/api/channels/connections` 401 sem auth — comportamento esperado).
- **Melhoria futura registrada (não-bloqueante)**: os botões "Add QR Code connection" / "Add Meta API connection" hoje permitem múltiplos placeholders `pending` do mesmo tipo na mesma conta — tratar como melhoria de UX/API numa rodada futura (ex.: desabilitar botão ou upsert quando já existir um `pending` do mesmo tipo).

## Fase 2 — Billing real (Asaas), webhook real e enforcement leve — histórico de implementação (23/06/2026)
Publicada no commit `754ce90` (push em 23/06/2026). **Status final: concluída e validada em produção** — ver seção "Fase 2 — estado final" mais abaixo para o resultado consolidado. Esta seção é o histórico detalhado de implementação/achados; o `ENCRYPTION_KEY` mencionado abaixo já foi corrigido na Vercel pelo usuário.

- **Banco**: migration `029_account_subscriptions_billing_contact.sql` (3 colunas novas em `account_subscriptions`: `billing_name`, `billing_document_encrypted`, `billing_phone_encrypted` — AES-256-GCM via `src/lib/whatsapp/encryption.ts`). **Aplicada no Supabase em 23/06/2026** (rodada manualmente pelo usuário no SQL editor) e confirmada (leitura/escrita testada).
- **Asaas real**: `src/lib/billing/asaas-client.ts` ganhou `updateAsaasSubscription()` e `findAsaasCustomerByExternalReference()`. `POST /api/billing/subscription` agora cria/reaproveita customer e cria ou atualiza (upgrade/downgrade, sem rateio) a subscription no Asaas quando `ASAAS_API_KEY` está configurada; sem a chave, comportamento idêntico à Fase 1 (só grava `plan_code`). Exige CPF/CNPJ (responde `400 MISSING_BILLING_INFO`) antes de ativar um plano pago — coletado via diálogo no painel.
- **Webhook real**: `src/lib/billing/webhook-processor.ts` (novo) + `/api/billing/webhook` reescritos. Cobre `payment_confirmed`/`payment_received` (ativa, converte trial), `payment_overdue` (past_due + `grace_ends_at` = +5 dias), `subscription_canceled` (cancela), `payment_deleted`/`payment_refunded` (só log, sem mudar status — decisão de produto). Idempotência corrigida: eventos `failed`/`pending` são reprocessados num retry do Asaas (Fase 1 só deduplicava, nunca reprocessava). **Testado de ponta a ponta com conta descartável real** (signup → webhooks simulados via curl → limpeza) — todos os cenários acima validados.
- **Enforcement**: só visual nesta fase (banner global em `src/components/billing/access-status-banner.tsx`, montado em `dashboard-shell.tsx`). Nenhuma rota de CRM/automações/whatsapp bloqueia nada. `describeAccessStatus()` em `src/lib/billing/status.ts` é a função pura reutilizável para uma fase futura de bloqueio real.
- **Dedup de connections**: `POST /api/channels/connections` agora reaproveita um `pending` existente do mesmo tipo em vez de duplicar (resolve a pendência aberta da Fase 1).
- **Painel**: `billing-panel.tsx` revisado — status mais claro, "Connected to Asaas: Yes/No", diálogo de CPF/CNPJ/telefone, botões de conexão desabilitados quando já há um `pending`.
- **Achado e corrigido (não era bug da Fase 2)**: `ENCRYPTION_KEY` local estava com o valor placeholder do `.env.local.example` (nunca configurada de fato — 25 caracteres, não 64 hex). Gerada uma chave real local em 23/06/2026 e confirmado o ciclo completo encrypt/decrypt das colunas `billing_document_encrypted`/`billing_phone_encrypted` com conta de teste descartável.
- **Achado e corrigido — `ASAAS_API_KEY` não estava sendo lida**: chaves do Asaas começam com `$` (ex.: `$aact_...`), e o carregador de `.env` do Next.js (`@next/env`, baseado em `dotenv-expand`) interpreta `$algumacoisa` como referência a outra variável, zerando o valor. Corrigido escapando para `\$aact_...` no `.env.local` (sem nunca expor o valor no terminal/chat). Também corrigido `ASAAS_API_URL`, que estava com a URL do dashboard do Asaas em vez da URL base da API (`https://sandbox.asaas.com/api/v3`). **Se isso for configurar no Vercel (produção), a mesma regra de escape do `$` vale para a env var lá também.**
- **Bloco 1/3 testado de ponta a ponta no Asaas sandbox real** (23/06/2026), com conta de teste descartável (signup real → ativação de plano via API → upgrade → limpeza): customer real criado (`cus_...`), subscription real criada (`sub_...`, `status: ACTIVE`, `externalReference` = account_id correto), valor R$397 (plano pro) confirmado no Asaas. Upgrade para `scale` testado: **mesmo customer e mesma subscription reaproveitados** (sem duplicar), valor atualizado para R$797 sem rateio, exatamente como desenhado.
- **Achado e corrigido — `nextDueDate` do Asaas (`POST /subscriptions`, ciclo MONTHLY) sempre soma 1 mês à data enviada**, independente do `billingType` (testado com BOLETO, PIX e UNDEFINED — todos iguais) e independente de quão distante a data já estava (testado com +2 dias, +3 meses e +6 meses — sempre +1 mês exato em todos). Confirmado com testes diretos contra a API sandbox em 23/06/2026. A doc oficial (`docs.asaas.com/docs/criando-uma-assinatura`) documenta uma janela de pré-geração de cobranças de 40 dias antes do vencimento, o que é consistente com o Asaas ter lógica não-trivial de ciclo em torno do primeiro vencimento, mas não descreve exatamente esse comportamento — então o achado empírico (sempre +1 mês) é a referência usada aqui.
  - **Correção aplicada** em `src/app/api/billing/subscription/route.ts` (função `oneMonthBefore`): ao criar uma subscription nova, enviamos a data desejada **menos 1 mês**; o Asaas soma de volta e o `nextDueDate` retornado bate exatamente com o fim do trial. Só afeta a criação — `updateAsaasSubscription` (upgrade/downgrade) não toca `nextDueDate`, confirmado também por teste.
  - **Revalidado com conta de teste real após a correção**: trial termina `2026-07-23`, `next_due_date` persistido = `2026-07-23` (antes da correção: `2026-08-23`, 1 mês errado).
  - **TODO marcado no código**: revalidar esse comportamento contra o Asaas de produção (não só sandbox) antes de ir ao ar — não há garantia de que produção replique exatamente o mesmo deslocamento.
- **Bug encontrado e corrigido na correção acima — `oneMonthBefore` caía no passado em qualquer conta real**: o cálculo `(fim do trial) − 1 mês` só funciona se o plano for ativado no mesmo dia do signup (testado e validado assim). Na conta real do usuário (`772a66f6-...`, signup 22/06, trial até 22/07), ativar um plano em 23/06 gerou `nextDueDate: "2026-06-22"` — já no passado — e a Asaas rejeitou com `invalid_nextDueDate` / "Não é permitido data de vencimento inferior a hoje." Causa: subtrair exatamente 1 mês do fim do trial (30 dias) sempre regride para ~a data do início do trial, que é passado assim que qualquer tempo passa desde o signup.
  - **Correção**: nova função `resolveAsaasFirstDueDate()` em `src/app/api/billing/subscription/route.ts` — aplica `oneMonthBefore`, mas nunca envia data ≤ hoje; se cair em hoje ou antes, usa amanhã como piso seguro (margem de 1 dia contra fuso/clock-skew, já que a Asaas valida "hoje" no fuso dela). Quando o piso é acionado, a cobrança real cai ~1 mês a partir de agora em vez de exatamente no fim do trial — trade-off aceito explicitamente (a alternativa é a Asaas rejeitar a requisição).
  - **Revalidado com a conta real** (não só conta de teste criada no mesmo dia): antes da correção, cálculo enviaria `2026-06-22` (passado, rejeitado); depois da correção, envia `2026-06-24` (amanhã), a Asaas aceita e devolve `nextDueDate: "2026-07-24"` (2 dias depois do ideal `2026-07-22`, não mais 1 mês de erro). Subscription real criada e persistida na conta real (`asaas_subscription_id: sub_841olqnsvdiralg6`, sandbox).
- Painel "Plan & billing" foi navegado pelo próprio usuário durante os testes (visto nos logs do dev server) — revisão visual ainda não confirmada explicitamente por ele.
- **Achado em produção real (logs da Vercel) — `ENCRYPTION_KEY` inválida em produção causou `RangeError: Invalid key length`**: depois do primeiro deploy real (commit `754ce90`), o usuário tentou ativar um plano em produção. Logs (`vercel logs --query "billing/subscription" --status-code 502 -x`) mostraram dois erros em sequência: (1) `ASAAS_API_URL` mal configurada na Vercel continha literalmente o texto `ASAAS_API_URL=...` colado no valor — corrigido pelo usuário direto na Vercel; (2) depois do redeploy, novo erro: `ENCRYPTION_KEY` na Vercel não tem 64 hex chars (mesma classe de bug do `.env.local` local, nunca replicado lá) — `encrypt(billingDocument)` quebrava com `ERR_CRYPTO_INVALID_KEYLEN`. Gerada nova chave (64 hex) para o usuário colar na Vercel — **ainda não aplicada lá, aguardando o usuário**.
  - **Bug estrutural revelado e corrigido**: o `encrypt()` rodava dentro do mesmo `UPDATE` que persistia `asaas_subscription_id`. Uma falha de criptografia ali descartava o vínculo com uma subscription real já criada na Asaas — um retry teria criado uma segunda, órfã. Verificado no sandbox (`GET /subscriptions?externalReference=...`) que isso não chegou a acontecer (só 1 subscription existia), mas a lacuna era real.
  - **Correção**: `src/app/api/billing/subscription/route.ts` agora persiste `plan_code`/`asaas_customer_id`/`asaas_subscription_id`/`next_due_date` num `UPDATE` separado, **antes** de criptografar/salvar CPF-CNPJ/telefone num segundo `UPDATE` isolado. Se a criptografia falhar agora, o vínculo com a Asaas já está salvo — erro passa a ser `500` específico ("billing contact info couldn't be encrypted"), não mais `502` genérico.
  - **Revalidado localmente simulando a falha real**: com `ENCRYPTION_KEY` propositalmente inválida, `POST /api/billing/subscription` criou customer+subscription reais no sandbox, persistiu `plan_code`/`asaas_customer_id`/`asaas_subscription_id`/`next_due_date` corretamente, e só falhou (500, mensagem específica) no passo de criptografia — `billing_name`/`billing_document_encrypted` ficaram `null`, como esperado. Um retry (ainda com a chave quebrada) reaproveitou o mesmo customer/subscription (sem duplicar) e só atualizou `plan_code`. Restaurada a chave válida, novo retry concluiu com sucesso total (200, CPF/CNPJ criptografado e salvo).
- **Achado e corrigido — duplicatas em `account_connections`**: usuário reportou múltiplos placeholders `pending` visíveis em Channel connections. Investigado: os 5 registros existentes (3 `QR_CODE` + 2 `META_API`) eram **antigos, criados em 22/06 às 23:15–23:17 (Fase 1)**, antes da dedup existir — não eram duplicatas novas. No processo, encontrei um bug real na dedup: usava `.maybeSingle()`, que **lança erro** quando já há 2+ linhas pendentes do mesmo tipo (em vez de reaproveitar uma) — então, na conta real, clicar em "Add QR Code connection" agora daria 500 em vez de funcionar. Corrigido em `src/app/api/channels/connections/route.ts` para `order(created_at).limit(1)` (reaproveita a mais antiga, tolera duplicatas pré-existentes). Limpeza de dados aplicada no Supabase real (com aprovação do usuário): removidas as 3 linhas duplicadas, mantida 1 `QR_CODE` + 1 `META_API` pending — estado real da conta hoje.

## Fase 2 — Billing Asaas — estado final (23/06/2026)
**CONCLUÍDA e validada em produção (sandbox Asaas).** Fluxo completo testado de ponta a ponta com a conta real do usuário (`772a66f6-d7ed-4d6e-89cd-368f5e90912c`): customer (`cus_000008252290`) → subscription → cobrança → pagamento confirmado → webhook recebido e processado → `account_subscriptions` atualizada → trial convertido → plano Pro ativado.

- **Subscription ativa atual**: `sub_6gffstr5l42r53od` (plano Pro, R$397/mês, `nextDueDate: 2026-07-24`). Esta é a 2ª subscription real criada — a 1ª (`sub_841olqnsvdiralg6`) foi cancelada por engano numa limpeza manual do sandbox (junto com 9 subscriptions órfãs de teste que também foram removidas, intencionalmente). Recriada manualmente via API (mesmo customer, mesmo plano, mesmo `externalReference`) e `account_subscriptions` repontada para o novo `asaas_subscription_id` — sem alterar `subscription_status`/`access_status` (já estavam corretos) nem nenhuma outra conta.
- **Achado registrado, ainda não corrigido**: os eventos assinados no webhook da Asaas (`WAVON Billing`) são `PAYMENT_RESTORED`, `PAYMENT_OVERDUE`, `PAYMENT_CONFIRMED`, `PAYMENT_DELETED`, `PAYMENT_RECEIVED` — falta `SUBSCRIPTION_CANCELED`. Se uma subscription for cancelada na Asaas, o sistema não é avisado e `account_subscriptions` não reflete isso automaticamente (foi exatamente o que gerou a divergência corrigida acima). Vale adicionar esse evento à configuração do webhook numa rodada futura.
- Sandbox limpo ao final: 1 única subscription ativa (a real), sem órfãs, `penalizedRequestsCount: 3` (não cresceu após a limpeza), webhook seguindo `enabled`/sem interrupção.
- Enforcement real (bloquear CRM/automações por `access_status`) continua sendo Fase 3 — não iniciar sem aprovação explícita.

## Fase 3 — Evolution API (WhatsApp) — ~95% concluída e validada em produção (23/06/2026)
Infra no ar, inbound (recebimento) validado de ponta a ponta em produção real. Falta apenas outbound (envio) e mídias para fechar 100%.

- **Racional da decisão**: Evolution API como **ponte rápida** para validar WhatsApp, Inbox e atendimento real. Meta Cloud API não foi descartada, fica para fase futura; `whatsapp_config` (a conexão Meta real, em produção) não foi tocada.
- **Banco**: migration `030_evolution_connections.sql` — `conversations.connection_id` (nullable, FK), UNIQUE parcial em `account_connections(provider, external_id)`, UNIQUE parcial em `messages(conversation_id, message_id)`. 100% aditivo. **Aplicada manualmente no Supabase pelo usuário e validada.**
- **Infraestrutura provisionada e validada**: Evolution API + Redis online no Railway (Postgres próprio, separado do Supabase do projeto); `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_TOKEN` configurados na Vercel (produção); deploy de produção concluído e publicado em `www.wavon.com.br`.
- **Achado de arquitetura durante a implementação**: já existia um `ChannelAdapter` (`src/lib/channels/types.ts` + `registry.ts` + `meta-adapter.ts` + `evolution-adapter.ts`) da Fase 1, com `evolutionAdapter` como stub que só lançava erro — não apareceu na exploração inicial do plano. Corrigido para seguir esse padrão: `src/lib/whatsapp/evolution-api.ts` é o cliente HTTP cru (papel idêntico a `meta-api.ts`), e `evolution-adapter.ts` foi implementado de verdade por cima dele. Toda rota chama `getChannelAdapter(provider)`, nunca o cliente Evolution direto.
- **Extraído** (refactor mecânico, sem mudar comportamento Meta): `findOrCreateContact`/`findOrCreateConversation` saíram de `whatsapp/webhook/route.ts` para `src/lib/whatsapp/conversation-pipeline.ts`, com `connectionId` como parâmetro explícito (`null` no caminho Meta, preservando o comportamento de hoje byte a byte). Também criado `src/lib/whatsapp/admin-client.ts` (client admin compartilhado, mesmo padrão de `src/lib/billing/admin-client.ts`), substituindo o singleton privado que existia dentro do webhook do Meta.
- **Novos arquivos**: `src/lib/whatsapp/evolution-api.ts`, `src/lib/whatsapp/evolution-webhook-processor.ts`, `src/app/api/webhooks/evolution/route.ts`, `src/app/api/channels/connections/[id]/connect/route.ts`, `src/app/api/channels/connections/[id]/route.ts` (DELETE), `src/components/settings/channel-connections-panel.tsx`.
- **UI**: o card "Channel connections" foi extraído de `billing-panel.tsx` para `channel-connections-panel.tsx` (decisão explícita do usuário, para nunca precisar tocar em código de billing por causa de WhatsApp). Mostra QR code, faz polling no `GET /api/channels/connections` existente, botão de desconectar.
- **Bugs encontrados e corrigidos no teste real em produção (23/06/2026)**:
  1. `/api/webhooks/evolution` respondia `200` antes de esperar o processamento (`processEvolutionWebhookEvent(...).catch(...)` sem `await`) — a Vercel podia encerrar a função no meio da cadeia, criando `contact`/`conversation` mas nunca chegando a gravar a `message`. Corrigido: agora dá `await` no processamento antes do `return 200`, que passou a ser o último statement do handler.
  2. Erro reproduzível `insert message failed: TypeError: fetch failed` — causa real: o índice único `(conversation_id, message_id)` da migration 030 é **parcial** (`WHERE message_id IS NOT NULL`), e `.upsert({onConflict})` do Supabase não consegue casar com um índice parcial (Postgres exige repetir o `WHERE` no próprio `ON CONFLICT`, o que o client não expõe). Corrigido: trocado por `insert()` simples + checagem de violação de unicidade (`isUniqueViolation`, 23505), mesmo padrão já usado em `findOrCreateContact`.
  3. Nome de contato exibindo identificador bruto do WhatsApp (`255504030892138@lid`) em vez de um nome legível — Baileys reporta `pushName` como o próprio JID/`@lid` quando a privacidade "linked ID" do WhatsApp esconde o nome real. Corrigido com `resolveContactDisplayName()`: só usa `pushName` se ele não for ele mesmo um JID/lid; senão cai para `"Grupo <id>"` (grupos) ou o telefone puro.
  4. Banner "WhatsApp is not connected" no Inbox falso-negativo mesmo com a Evolution conectada — `inbox/page.tsx` só checava `whatsapp_config` (Meta). Corrigido: agora também checa `account_connections` (`provider='EVOLUTION'`, `connection_status='connected'`).
  - Commits: `c2b2b34` (implementação Fase 3) + `e7e0571` (correções acima), ambos em produção (`dpl_9s6KSGibzCsrivq6rCvWRaJmib5J`).
- **Validado em produção real**: QR Code → conexão → `account_connections.connection_status='connected'` → mensagem real recebida no WhatsApp conectado → `contacts` criado → `conversations` criada com `connection_id` correto → `messages` gravada → conversa abre no Inbox com histórico visível. Evidência: conversas "Luiz Abrahao-Abracred", "Caçador De Liquidação" e "Flavio Strate Finance" exibindo mensagens/histórico real na interface.
- **Logs temporários de diagnóstico ainda no código** (`evolution-webhook-processor.ts`, marcados `// TEMP DIAGNOSTIC LOG`) — adicionados para validar o fluxo de ingestão; remover numa rodada futura depois de mais alguns dias de operação estável.
- **Gap conhecido, não implementado ainda**: download/decrypt de mídia inbound da Evolution (Baileys) — mensagens de mídia chegam como placeholder textual (`[image]` etc.) ou `[Unsupported message type]`, não com o arquivo real; UI mostra "Image unavailable". Texto funciona de ponta a ponta. Também não há endpoint de reconciliação ativa (`fetchConnectionState`/`getStatus` do adapter existem, mas nada os expõe ainda) para o caso do webhook de conexão atrasar. Mensagens de grupo (`@g.us`) criam um "contato" por grupo, não por remetente real — não há atribuição por pessoa dentro do grupo.
- **Ainda não testado**: envio de mensagens do WAVON para o WhatsApp (outbound, `send/route.ts` → `sendViaEvolution`). Só o caminho de recebimento (inbound) foi validado nesta sessão.
- **Typecheck e lint limpos** (`npm run typecheck`, `npm run build`) em todas as rodadas desta fase.

## Fase 4 — MVP operacional (24/06/2026, parte 3)
Continuação da Fase 3 fechada (mídia inbound + CRM automático + outbound, todos validados — ver "Marco mais recente" na memória do projeto). Comando do usuário: "Agora não mexer em infraestrutura crítica sem necessidade" — todas as mudanças desta rodada foram aditivas (1 tabela nova, nenhuma alteração em conexões/billing/DNS). Commit `0fd282a`, deploy `dpl_MvftFB3mW2otp9nbdwEizEMrCMnR`, publicado em `www.wavon.com.br`.

1. **Tradução residual** — sweep completo do app além do `/pipelines` (que já estava 100% pt-BR em código; só os *dados* de 2 pipelines/stages antigos em inglês precisaram de UPDATE direto no banco, sem migration). Achado real: `/join/[token]` (página de aceitar convite de equipe) estava **inteira em inglês** — não fazia parte do sweep anterior porque vive fora do route group `(dashboard)`. Traduzida por completo (títulos, toasts, botões, modal de conflito de conta).
2. **UX do Inbox** — auditoria confirmou que renderização de imagem/áudio/vídeo/documento, alinhamento, timestamps, auto-scroll, loading states e tratamento de erro de envio já estavam implementados e robustos (trabalho de rodadas anteriores). Dois gaps reais corrigidos:
   - Preview da lista de conversas mostrava o `content_type` cru entre colchetes (`[image]`, `[video]`) quando a mídia não tinha legenda — corrigido com `src/lib/whatsapp/message-preview.ts` (rótulos amigáveis em pt-BR: "📷 Foto", "🎵 Áudio" etc.), aplicado nos 4 pontos que gravam `last_message_text` (webhook Meta, webhook Evolution, envio Meta, envio Evolution).
   - Bolhas de vídeo/áudio no Inbox não tinham fallback visual quando a mídia falhava ao carregar (só a imagem tinha) — adicionado `onError` com o mesmo componente `MediaUnavailable`.
3. **Respostas rápidas (nova funcionalidade)** — o composer do Inbox já mostrava a dica "Digite '/' para respostas rápidas" há tempo, mas a funcionalidade nunca existiu (não confundir com `message_templates`, que são templates HSM aprovados pela Meta e não funcionam em contas Evolution/Baileys). Implementado do zero: tabela `quick_replies` (migration `031_quick_replies.sql`, **ainda precisa ser aplicada manualmente no SQL Editor do Supabase** — mesma rotina das migrations 029/030), painel de gestão em Configurações → "Respostas rápidas" (`quick-replies-manager.tsx`, CRUD completo), e detecção de "/atalho" no campo de mensagem (`message-composer.tsx`) que sugere e insere o texto salvo — funciona com qualquer provedor de WhatsApp porque é texto puro enviado pelo fluxo normal de envio (não passa pelo sistema de templates Meta).
4. **Automação comercial (achado crítico corrigido)** — durante a implementação, descoberto que o passo `send_message` do engine de automações (`src/lib/automations/meta-send.ts`) só sabia enviar via Meta (`whatsapp_config`), e a conta de teste é 100% Evolution — qualquer automação com esse passo falharia silenciosamente. Corrigido com despacho por `connection_id` da conversa (Meta quando `null`, Evolution quando preenchido), espelhando o padrão já usado em `/api/whatsapp/send`. Com o bug corrigido, a automação **"Boas-vindas + negociação para novo contato"** (já ativa em produção desde a Fase 3, criada a partir do template `new_contact_to_pipeline`) ganhou um segundo passo `send_message` com o texto de boas-vindas — fechando o fluxo completo pedido: contato novo → negociação criada no Pipeline → mensagem automática enviada → registrada no histórico (`messages`) → log da automação (`automation_logs`, já existia). Deliberado **não criar uma segunda automação** para isso: o engine roda *todas* as automações ativas que casam com um `trigger_type`, então duas automações com `new_contact_created` ativas ao mesmo tempo criariam 2 negociações duplicadas por contato novo.

`npm run typecheck`, `npm run lint` (0 erros, mesmos 19 warnings pré-existentes) e `npm run build` limpos nesta rodada.

**Concluído em 24/06/2026 (encerramento de sessão)**: migration `031_quick_replies.sql` aplicada pelo usuário no SQL Editor do Supabase. "Respostas rápidas" validada em produção: menu corrigido, navegação das abas de Configurações corrigida, atalho "/" no Inbox funcionando. Fase 4 sem pendências.

## Fase 5 — Assistente IA (OpenAI) + Atendente no site (24/06/2026)
Implementação completa (Partes 1, 2, 3-fundação e 4). Regra central: **cada conta usa sua própria chave OpenAI** — não existe chave global do sistema. API usada: **Responses API** (`POST /v1/responses`), explicitamente não a Assistants API (legada). Cliente OpenAI escrito à mão via `fetch` (sem dependência `openai` no `package.json`, seguindo o padrão da casa de clientes manuais como `meta-api.ts`/`evolution-api.ts`).

1. **Banco** — migration `supabase/migrations/032_ai_assistant.sql` (criada, **AINDA NÃO aplicada** — precisa ser rodada manualmente no SQL Editor do Supabase, mesma rotina das migrations 029/030/031): tabelas `ai_settings` (1 linha por conta, chave criptografada AES-256-GCM via `src/lib/whatsapp/encryption.ts` reaproveitado, modelo padrão, status de conexão, colunas reservadas não-aplicadas ainda `monthly_token_limit`/`auto_reply_enabled`/`business_hours_only` para uma fase futura de IA automática) e `ai_usage_logs` (log de cada chamada à IA: feature, tokens, status, erro). `account_connections` ganhou `'SITE_WIDGET'` como `connection_type`/`provider` válido (constraint ampliada, aditiva).
2. **Configuração da IA** — Configurações → "IA / OpenAI" (`src/components/settings/ai-settings-panel.tsx`): salvar/testar/remover chave (mascarada como `sk-...abcd`, nunca exposta de volta ao navegador), escolher modelo (`gpt-4o-mini` padrão, `gpt-4o`, `gpt-4.1-mini`, `gpt-4.1`), prompt customizado opcional. Validação da chave acontece **antes** de salvar (`GET /v1/models`, barato — não gasta tokens de geração).
3. **Assistente IA no Inbox** — 3 botões no cabeçalho da conversa (`message-thread.tsx`): "✨ Sugerir resposta" (preenche o campo de mensagem, **nunca envia automaticamente** — humano revisa e clica enviar), "✨ Resumir" e "🔥 Classificar lead" (Frio/Morno/Quente/Cliente/Perdido + motivo), ambos em um diálogo somente leitura. Rotas: `/api/ai/inbox/{suggest-reply,summarize,classify-lead}`. Falha de IA nunca quebra o Inbox — sempre cai num erro tratado, sem exceção não capturada.
4. **Atendente IA no site público** — widget flutuante (`src/components/site-widget/chat-widget.tsx`, montado globalmente em `layout.tsx`, autoesconde nas rotas autenticadas/dashboard). Primeira mensagem coleta nome+WhatsApp+mensagem → `POST /api/public/site-widget/message` (sem autenticação) cria contato/conversa (origem identificada via `account_connections` tipo `SITE_WIDGET`, `is_primary=false`, reaproveitando `conversations.connection_id` — nenhuma coluna nova de "origem") → reaproveita o engine de automações existente (`runAutomationsForTrigger`) para criar a negociação no Pipeline automaticamente, sem código duplicado de criação de deal → IA responde no widget → tudo aparece no Inbox normal do WAVON. Exige a env var `SITE_WIDGET_ACCOUNT_ID` (conta "dona" do site — não é produto multi-tenant embeddable, é o site institucional da própria WAVON).
5. **Segurança**: chave OpenAI nunca chega ao navegador (só rotas server-side com client de service-role); toda chamada de IA é logada em `ai_usage_logs`; rate limit simples no widget público (30 mensagens/hora por conversa); autenticação leve de follow-up no widget (telefone enviado precisa bater com o da conversa).
6. **Não testado nesta rodada** (sem chave OpenAI real disponível no ambiente de implementação): chamada real à API da OpenAI, uso do widget em navegador real, e a migration `032` em si. `npm run typecheck`, `npm run lint` (0 erros, mesmos 19 warnings pré-existentes) e `npm run build` passaram limpos (todas as rotas novas registradas corretamente).

**Pendência imediata**: aplicar `supabase/migrations/032_ai_assistant.sql` manualmente no SQL Editor do Supabase, e configurar a env var `SITE_WIDGET_ACCOUNT_ID` na Vercel (produção) — sem isso, Parte 1/2 não funcionam (tabela inexistente) e o widget do site responde 503.

`supabase/migrations/032_ai_assistant.sql` foi aplicada manualmente pelo usuário no SQL Editor do Supabase e `SITE_WIDGET_ACCOUNT_ID` (`772a66f6-d7ed-4d6e-89cd-368f5e90912c`, confirmado via consulta direta ao banco) foi configurada na Vercel — ver Fase 6 abaixo para o estado seguinte.

## Fase 6 — IA treinável por empresa (24/06/2026)
Transforma a IA de "só conectada à OpenAI" em uma IA com base de conhecimento própria por conta — 5 novas seções alimentam automaticamente todo prompt enviado à OpenAI (Inbox + widget do site), na ordem: **Perfil + Produtos + FAQ + Objetivos + Regras + Histórico**.

1. **Banco** — migration `supabase/migrations/033_ai_knowledge_base.sql` (criada, **ainda não aplicada** — mesma rotina manual no SQL Editor do Supabase): 5 tabelas novas, todas `account_id` + RLS via `is_account_member()` (leitura: qualquer membro; escrita: `admin`, mesmo nível de sensibilidade do `ai_settings` da Fase 5, pois moldam o que a IA diz em nome da empresa toda):
   - `ai_company_profile` (1 linha por conta): nome, segmento, descrição, público-alvo, tom de voz, diferenciais.
   - `ai_products` (várias linhas): nome, descrição, preço (texto livre).
   - `ai_faqs` (várias linhas): pergunta + resposta.
   - `ai_business_goals` (1 linha por conta): objetivo principal, objetivos secundários, como medir sucesso.
   - `ai_rules` (1 linha por conta): sempre, nunca, quando transferir para um humano.
2. **Montagem do prompt** — `src/lib/ai/knowledge-base.ts` (novo): `getAccountKnowledgeBase()` busca as 5 tabelas em paralelo (nunca lança erro — uma falha em qualquer peça degrada para vazio, não quebra a chamada de IA); `buildKnowledgeBasePromptBlock()` formata em pt-BR, omitindo seções sem conteúdo. Consumida em `src/lib/ai/inbox-assistant.ts` (sugerir resposta / resumir / classificar lead) e em `src/app/api/public/site-widget/message/route.ts` (atendente do site) — ambas já existiam da Fase 5 e só ganharam mais um bloco nas instruções, sem mudar a arquitetura.
3. **Interface** — Configurações → "IA" deixou de ser um único card e ganhou sub-abas (`src/components/settings/ai-section.tsx`, usando o componente `Tabs` do base-ui já existente no projeto): OpenAI (painel da Fase 5, inalterado), Perfil da Empresa, Produtos, FAQ, Objetivos, Regras. Perfil/Objetivos/Regras são formulários de 1 linha por conta (upsert direto via client Supabase, RLS cuida do controle de acesso — mesmo padrão do `ai_settings`); Produtos/FAQ são listas com CRUD completo (criar/editar/excluir via diálogo), espelhando exatamente o padrão já usado em "Respostas rápidas" (`quick-replies-manager.tsx`).
4. **Sem rota de API nova** — diferente da Fase 5 (que precisou de rotas server-side para criptografar a chave OpenAI), as 5 tabelas desta fase não guardam segredo nenhum, então o CRUD é direto do componente para o Supabase (client do usuário, RLS aplica o controle), seguindo a mesma escolha de arquitetura de `quick_replies`.
5. **Não testado nesta rodada** (mesma limitação da Fase 5 — sem chave OpenAI real disponível no ambiente de implementação): não foi possível confirmar visualmente que o conteúdo de cada seção realmente aparece formatado na resposta da IA. `npm run typecheck`, `npm run lint` (0 erros, mesmos 19 warnings pré-existentes) e `npm run build` passaram limpos.

**Concluído em 24/06/2026 (encerramento de sessão)**: migration `033_ai_knowledge_base.sql` aplicada pelo usuário no SQL Editor do Supabase. As 5 abas (Perfil/Produtos/FAQ/Objetivos/Regras) estão operacionais. Além disso, o prompt do assistente (campo "Instruções personalizadas" da aba OpenAI) foi simplificado pelo usuário: a base de conhecimento (estas 5 abas) passou a ser a fonte automática de fatos sobre a empresa em todo prompt, e o campo de instruções customizadas ficou reservado só para *comportamento* da IA (tom, formato), não para repetir fatos que já vêm das outras abas. Fase 6 sem pendências.

## Fase 7 — Base de Conhecimento Inteligente / RAG (25/06/2026)
Implementação completa. **Objetivo**: permitir que cada empresa envie documentos (PDF, DOCX, PPTX, XLSX, TXT) para treinar a IA, consultados por busca semântica (RAG) antes de responder ao cliente — **camada adicional** sobre a Fase 6 (Perfil/Produtos/FAQ/Objetivos/Regras), não um substituto.

1. **Banco** — migration `supabase/migrations/034_ai_rag_documents.sql` (criada, **ainda não aplicada** — mesma rotina manual no SQL Editor do Supabase): habilita a extensão `vector` (pgvector); tabela `ai_documents` (1 linha por arquivo: status `processing`/`ready`/`error`, `error_message`, `chunk_count`; `source_type` fixado em `'upload'` por um CHECK, propositalmente preparado para uma fase futura aceitar outras origens — URL/site, Google Drive, OneDrive, Notion, API externa — sem migração quebrada); tabela `ai_document_chunks` (texto + `embedding VECTOR(1536)` + `embedding_model`, sem nenhuma RLS policy — só a service role toca nela); índice HNSW (`vector_cosine_ops`); função SQL `match_ai_document_chunks()` (`SECURITY DEFINER`, filtra por `account_id`). Bucket de Storage novo **privado** `ai-knowledge-documents` (diferente de `chat-media`, que é público) — política de escrita restrita a `admin`/`owner`.
2. **Serviço RAG desacoplado** — `src/lib/ai/rag/` (não pertence ao Inbox; é um serviço genérico que qualquer funcionalidade futura pode consumir — automações, agentes especializados, chat interno, API pública, novos canais como Instagram/Telegram/Messenger/E-mail). Cada responsabilidade em sua própria função: `extractText` (officeparser para PDF/DOCX/PPTX/XLSX; TXT lido direto), `chunkText` (paragraph-aware, ~1800 caracteres + overlap, testado em `chunk-text.test.ts`), `generateEmbeddings` (lotes de 96, delegando o HTTP real para `openai-client.ts`), `storeChunks`, `searchRelevantChunks` (encapsula a função SQL — nenhuma tela/API fora do módulo conhece `match_ai_document_chunks`), `buildRagPromptBlock` (formatação pura), `processDocument` (orquestra a pipeline completa de ingestão). API pública do serviço: `src/lib/ai/rag/index.ts`.
3. **Embeddings centralizados** — `createOpenAIEmbeddings()` adicionada a `src/lib/ai/openai-client.ts` (modelo `text-embedding-3-small`, 1536 dimensões). Nenhuma chamada HTTP à OpenAI existe fora desse arquivo — `rag/embeddings.ts` só decide o tamanho do lote, não faz fetch.
4. **Upload (única rota nova da fase)** — `POST /api/ai/knowledge-documents` (admin/owner apenas; valida tipo/tamanho — limite 15 MB; sobe pro Storage; cria a linha em `ai_documents`; chama `processDocument` de forma **síncrona**, dentro da própria requisição, sem fila/worker) e `DELETE /api/ai/knowledge-documents/[id]` (remove o objeto do Storage + a linha; chunks somem via `ON DELETE CASCADE`). Leitura da lista não precisa de rota — direto client → Supabase, RLS já libera para qualquer membro (mesmo padrão de `ai_products`/`ai_faqs`).
5. **Integração no prompt** — ordem final: **Perfil + Produtos + FAQ + Objetivos + Regras + Documentos relevantes (RAG) + Instruções personalizadas + Histórico**. Só os pontos que respondem diretamente ao cliente buscam RAG: `suggestReply()` (`src/lib/ai/inbox-assistant.ts`, usando a última mensagem do cliente como query) e o widget do site (`src/app/api/public/site-widget/message/route.ts`, usando a mensagem do visitante). `summarizeConversation`/`classifyLead` **não** chamam RAG (ferramentas internas de análise, sem necessidade do custo extra de embedding).
6. **Best-effort e performance** — `searchRelevantChunks` nunca lança erro (falha de embedding, conta sem chave, erro do pgvector → degrada para "sem documentos", igual ao padrão já usado em `getAccountKnowledgeBase`); resultado limitado a 5 trechos e a um total de ~6000 caracteres, mesmo que a conta acumule centenas de documentos no futuro — o prompt não cresce sem controle.
7. **Interface** — nova sub-aba "Documentos" em Configurações → IA (`ai-documents-panel.tsx`), depois de "Regras": lista com status, upload (síncrono — a resposta já vem com o resultado final, sem necessidade de polling), exclusão com confirmação. Escrita visível só para `admin`/`owner` (`canEditSettings`).
8. **Escopo desta fase, deliberadamente** — sem OCR, sem fila/worker, sem processamento assíncrono, sem versionamento de documentos, sem busca híbrida/re-ranking, sem múltiplos modelos de embedding simultâneos. Fica só: Upload → Extração → Chunking → Embeddings → Busca vetorial → Integração na IA.
9. `npm run typecheck`, `npm run lint` (0 erros, mesmos 19 warnings pré-existentes) e `npm run build` passaram limpos; testes unitários novos de `chunkText` (6/6) passando.
10. **Auditoria técnica final (antes do push)** — revisão de RLS/policies, rotas, RAG e performance. Achados corrigidos no commit `9cadcf2`: (a) `application/msword`/`.doc`, `.ppt`, `.xls` eram aceitos pela validação mas o `officeparser` não suporta formatos binários legados (só OOXML) — todo upload desses formatos falharia silenciosamente na extração; removidos de `file-type.ts`, do bucket e do `accept` do input; (b) `suggestReply` e o widget buscavam a base de conhecimento estruturada e o RAG (e, no widget, também o histórico) **sequencialmente** — paralelizado com `Promise.all`; (c) reforço de defesa em profundidade no `DELETE` de documentos (filtro por `account_id` também na query de exclusão, não só na leitura prévia).
11. **Migration `034` aplicada em produção pelo usuário** no SQL Editor do Supabase (mesma rotina manual de sempre) — confirmada via teste funcional real (ver item 12).
12. **Validado em produção real (25/06/2026)** — teste de ponta a ponta com documento real: TXT contendo "O código secreto do WAVON é 987654" enviado pela aba Documentos → status `ready`, chunk + embedding criados → pergunta enviada pelo Widget do site ("Qual é o código secreto do WAVON?") → **IA respondeu corretamente "O código secreto do WAVON é 987654."**, citando o conteúdo do documento. Confirma upload, extração, chunking, embeddings, pgvector/busca semântica e integração com o Widget funcionando de ponta a ponta em produção real.
13. **Bug encontrado e corrigido durante essa validação (não era do RAG)** — a primeira tentativa do teste deu erro 403 "Não foi possível validar sua identidade nesta conversa" na **segunda** mensagem da mesma conversa do Widget, antes de qualquer lógica de IA/RAG rodar (`src/app/api/public/site-widget/message/route.ts`). Causa: a checagem de identidade de mensagens de continuação comparava `normalizePhone(contact.phone)` com igualdade estrita, mas o contato pode ter sido resolvido por `findOrCreateContact`/`findExistingContact` usando a comparação **tolerante** `phonesMatch` (tolerante a prefixo de tronco) — as duas checagens podiam divergir para o mesmo número em formatos diferentes. Corrigido trocando para `phonesMatch` também na checagem de continuação, deixando as duas etapas consistentes sobre o que significa "mesmo número". Commit `ef81777`, validado em produção com o teste do item 12 (a segunda mensagem da conversa de teste retornou 200 e chegou à IA normalmente).

## Fase 7.1 — Estabilização do RAG (25/06/2026) — ✅ CONCLUÍDA e validada em produção (commit `2badeb5`)
Não é funcionalidade nova — consolidação do que a Fase 7 já validou em produção, fechando lacunas encontradas durante aquela validação (sem como confirmar pelos logs se `searchRelevantChunks` rodou; UI só mostrava "Processando" sem detalhe).

1. **Migration `035_ai_rag_observability.sql`** (aditiva, **ainda não aplicada** — mesma rotina manual no SQL Editor): amplia o CHECK de `ai_documents.status` para incluir os 3 novos estados transitórios (`extracting`/`embedding`/`indexing`, mantendo `processing`/`ready`/`error`); novas colunas `char_count`, `page_count`, `embedding_model`, `embedding_tokens`, `processing_duration_ms`, `content_hash` (+ índice); `ai_usage_logs` ganha as features `rag_document_ingest`/`rag_search` e a coluna `duration_ms`.
2. **Progresso real, sem fila** — a rota de upload (`POST /api/ai/knowledge-documents`) agora responde **assim que o documento existe** (status `extracting`) em vez de esperar a pipeline inteira, e usa **`after()` do Next.js** (`next/server`) para continuar o processamento depois da resposta — confirmado como seguro neste ambiente (Vercel Fluid Compute, `after()` estável desde a v15.1.0, mesmo orçamento de tempo de execução de antes, só com a resposta HTTP enviada mais cedo; sem fila/worker novos). `process-document.ts` atualiza o `status` em cada etapa real (`extracting` → `embedding` → `indexing` → `ready`). A UI (`ai-documents-panel.tsx`) consulta a linha a cada ~1s **apenas enquanto o status estiver em um estado transitório**, parando imediatamente ao chegar em `ready`/`error` — sem polling permanente.
3. **Duplicidade é decisão da empresa, não do sistema** — `duplicate-check.ts` calcula um SHA-256 do arquivo (`hashFileContent`) e detecta documentos idênticos já existentes (`findDuplicateDocument`), mas a rota **nunca bloqueia nem reaproveita automaticamente**: responde `409 { duplicate: true, existingDocument }`, e a UI mostra um diálogo com duas escolhas explícitas — "Usar o documento existente" (não faz nada) ou "Enviar mesmo assim" (reenvia com `force: true`, pulando a checagem).
4. **Observabilidade** — `src/lib/ai/rag/logger.ts` (`logRagEvent`) registra, em JSON estruturado no stdout (greppável no `vercel logs`), cada etapa da pipeline (`upload.started/completed/duplicate`, `extract.completed`, `embed.completed`, `index.completed`, `search.completed`, `document.error`, `document.deleted`) — resolve exatamente a lacuna encontrada na validação da Fase 7. `searchRelevantChunks` (RAG na hora de responder) também grava em `ai_usage_logs` (feature `rag_search`, com `duration_ms`) e `processDocument` grava em `rag_document_ingest` — agora é possível confirmar pelo banco/logs se o RAG rodou, sem precisar alterar código para diagnosticar.
5. **Mensagens de erro específicas** — `process-document.ts` diferencia: arquivo sem texto extraível, falha de extração (arquivo corrompido), falha de embeddings (com uma sub-distinção: `OpenAIRequestError` 429/5xx vira "falha temporária, tente novamente", outros erros aparecem com a mensagem real), falha de indexação. Tipo não suportado, vazio, limite de 15 MB e chave OpenAI ausente já existiam desde a Fase 7 e continuam cobertos na própria rota.
6. **Metadados do documento** — `ai_documents` agora guarda e a UI exibe: tamanho do arquivo, data de envio, nº de páginas (quando o formato expõe — PDF; `null` em DOCX/PPTX/XLSX/TXT), nº de caracteres extraídos, nº de chunks, modelo de embedding. Nenhuma consulta extra — tudo vem da própria linha já carregada.
7. **Exclusão verificada** — `DELETE /api/ai/knowledge-documents/[id]` agora confirma explicitamente se a remoção do Storage teve sucesso antes de remover a linha (loga erro se falhar, mas ainda remove a linha — evita documento "fantasma"), e loga o resultado via `logRagEvent('document.deleted', ...)`.
8. **Performance — revisão, sem mudança** — `chunkText` (1800 caracteres / 200 de overlap ≈ 11%) e a busca (5 trechos / 6000 caracteres) já estavam dentro da faixa recomendada para RAG com `text-embedding-3-small` (limite de 8191 tokens); nenhum valor foi alterado nesta fase.
9. **Custo OpenAI rastreável** — `createOpenAIEmbeddings` agora retorna `usage.total_tokens` (antes descartado); `embedding_tokens` fica salvo por documento em `ai_documents`, e `ai_usage_logs.duration_ms` permite calcular tempo médio de processamento — base para um futuro modelo de cobrança, sem nenhuma cobrança implementada ainda.
10. **Testes novos**: `duplicate-check.test.ts` (hash determinístico), `file-type.test.ts` (todos os tipos aceitos + rejeição de formatos legados/inválidos), `extract-text.test.ts` (com `vi.mock('officeparser')` simulando PDF/DOCX/PPTX — `chunk-text.test.ts` já existia). `npm run typecheck`, `npm run lint` (0 erros — mesmos warnings pré-existentes de outras partes do código, nenhum novo) e `npm run build` passaram limpos. `npm run test`: as 14 + 5 falhas pré-existentes em `flows/validate.test.ts` e `dashboard/date-utils.test.ts` (confirmadas via `git stash` como já presentes **antes** desta fase, não relacionadas ao RAG) continuam; todos os testes do módulo RAG passam (17/17 nos 4 arquivos).
11. **Escopo respeitado** — nenhuma funcionalidade nova: sem fila/worker, sem OCR, sem versionamento, sem busca híbrida/re-ranking, sem cobrança real. Arquitetura da Fase 7 preservada integralmente.

## Fase 7.2 — Atendimento Fora do Horário + Agendamento Inteligente (25/06/2026) — ⏳ IMPLEMENTADA, aguardando Azure App + migration `036` + Vercel env vars

Objetivo: quando o cliente manda mensagem fora do horário comercial, a IA não responde só "estamos fechados" — ela continua atendendo normalmente e, quando detecta intenção comercial, oferece até 3 horários disponíveis do calendário. O agente pode confirmar o agendamento diretamente pelo Inbox.

### Arquitetura — abstração CalendarProvider

O restante do sistema nunca toca diretamente no Outlook/Google. Toda interação é via `CalendarProvider` (`src/lib/calendar/types.ts`): `getProviderEmail()`, `getFreeBusyIntervals()`, `createAppointment()`. Primeiro provider implementado: **Microsoft Outlook Calendar via Microsoft Graph API** (HTTP cru, sem SDK, mesmo padrão de `meta-api.ts` e `openai-client.ts`). Registry (`src/lib/calendar/registry.ts`) devolve `null` se não configurado/habilitado — a IA nunca quebra por calendário desconfigurado.

### Banco — migration `036_calendar_scheduling.sql` (AINDA NÃO APLICADA)

Três tabelas:
- `calendar_settings` (1 linha por conta, UNIQUE `account_id`): tokens encriptados AES-256-GCM, `provider_type`, `calendar_email`, `timezone`, `meeting_duration_minutes`, `is_enabled`, `connected_at`
- `business_hours` (7 linhas por conta, UNIQUE `account_id + day_of_week`, dia 0=Dom…6=Sáb): `start_time TIME`, `end_time TIME`, `is_open BOOLEAN`
- `calendar_appointments` (histórico de agendamentos): `conversation_id`, `contact_id`, `external_event_id`, `online_meeting_url`, `status` CHECK (`scheduled`/`cancelled`/`completed`)

RLS em todas as tabelas: leitura qualquer membro, escrita admin/owner. Índices em `conversation_id` e `(account_id, start_at)`.

### OAuth Microsoft — flow seguro

Autoridade: `https://login.microsoftonline.com/consumers/oauth2/v2.0` (contas pessoais Outlook). Escopos: `offline_access Calendars.ReadWrite User.Read`. State param = `encrypt(accountId)` (AES-256-GCM) — decodificado no callback sem session store. Tokens de acesso e refresh salvos criptografados em `calendar_settings.access_token_encrypted`/`refresh_token_encrypted`. Token refresh automático antes de cada chamada ao Graph.

Azure App Registration necessária (manual — portal.azure.com):
- Tipo de conta: "Contas Microsoft pessoais apenas" (`consumers`)
- URI de redirecionamento: `https://www.wavon.com.br/api/calendar/oauth/callback`
- Escopos a liberar: `Calendars.ReadWrite`, `User.Read` (delegado)
- Anotar: `MICROSOFT_CLIENT_ID` e `MICROSOFT_CLIENT_SECRET`

Env vars a configurar na Vercel (produção): `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL=https://www.wavon.com.br`

### Lógica de horário comercial — DST-safe

`getLocalParts(date, timezone)` via `Intl.DateTimeFormat.formatToParts()` — único método disponível no Node.js para conversão DST-safe (Temporal API não disponível). `localToUTC(year, month, day, h, m, timezone)`: cria data UTC naive, lê o horário local que ela produz, ajusta a diferença — garante comportamento correto durante mudanças de horário de verão.

`computeAvailableSlots()`: recebe busy intervals do Graph → calcula interseção com janelas de horário comercial → divide em slots de N minutos → filtra sobrepostos → retorna máximo `maxSlots` (normalmente 3 para o bloco da IA). `formatSlotLabel()` em pt-BR: "Seg, 7 de julho às 14:00".

### Integração na IA (Inbox + Widget)

`getSchedulingContext({accountId})` em `src/lib/ai/scheduling-assistant.ts`: roda em paralelo com RAG e Base de Conhecimento (mesmo `Promise.all` já existente). Nunca lança — qualquer erro retorna `{isOpen: true, promptBlock: null, slots: []}` sem quebrar a resposta da IA.

Quando fora do horário: injeta bloco de instruções com hora local atual, próxima abertura e lista de slots disponíveis com labels em pt-BR. Instruções: continuar atendendo normalmente, detectar interesse comercial, oferecer máximo 3 slots da lista, **não inventar horários**.

### Agendamento pelo Inbox

Novo botão "Agendar" (ícone `CalendarDays`) no cabeçalho da conversa em `message-thread.tsx`. Abre dialog que:
1. Busca `GET /api/calendar/availability?days=7&max=6`
2. Mostra slots formatados em pt-BR
3. Ao selecionar: `POST /api/calendar/appointments` → cria evento no Outlook Graph → salva em `calendar_appointments` → insere mensagem "📅 Agendamento confirmado" no Inbox → atualiza `last_message_text` da conversa → adiciona nota ao deal mais recente do contato no CRM

Teams meeting: solicitado (`isOnlineMeeting: true, onlineMeetingProvider: 'teamsForBusiness'`) com fallback gracioso para contas pessoais (sem exceção se `joinUrl` não vier, `online_meeting_url` fica `null`).

### Observabilidade

`src/lib/calendar/logger.ts` — `CalendarLogEvent` enum: `OAuthStarted/Completed/Error`, `TokenRefreshed/TokenFailed`, `Disconnected`, `BusinessHoursChecked`, `IntentInjected`, `AvailabilityQueried/AvailabilityError`, `AppointmentCreated/AppointmentError`, `CrmNoteAdded`. Logs em JSON estruturado no stdout, mesmo padrão do `logRagEvent`.

### Novos arquivos (26 arquivos criados/modificados)

Criados: `supabase/migrations/036_calendar_scheduling.sql`, `src/lib/calendar/types.ts`, `src/lib/calendar/admin-client.ts`, `src/lib/calendar/logger.ts`, `src/lib/calendar/calendar-settings.ts`, `src/lib/calendar/business-hours.ts`, `src/lib/calendar/providers/outlook/oauth.ts`, `src/lib/calendar/providers/outlook/client.ts`, `src/lib/calendar/providers/outlook/adapter.ts`, `src/lib/calendar/registry.ts`, `src/lib/calendar/index.ts`, `src/lib/ai/scheduling-assistant.ts`, `src/app/api/calendar/oauth/authorize/route.ts`, `src/app/api/calendar/oauth/callback/route.ts`, `src/app/api/calendar/settings/route.ts`, `src/app/api/settings/business-hours/route.ts`, `src/app/api/calendar/availability/route.ts`, `src/app/api/calendar/appointments/route.ts`, `src/components/settings/calendar-settings-panel.tsx`, `src/components/settings/business-hours-panel.tsx`, `src/components/settings/calendar-section.tsx`.

Modificados: `src/components/settings/settings-sections.ts` (nova seção `agenda`), `src/app/(dashboard)/settings/page.tsx` (`CalendarSection`), `src/lib/ai/inbox-assistant.ts` (`getSchedulingContext` no `Promise.all`), `src/app/api/public/site-widget/message/route.ts` (idem), `src/types/index.ts` (tipos de calendário).

`npm run typecheck`/`lint`/`build` limpos (0 erros, 0 warnings novos). **Código não commitado ainda** — aguardando ações manuais antes do deploy.

### Pendências (ações manuais necessárias antes do deploy)
1. Registrar Azure App em portal.azure.com: tipo `consumers`, URI de redirecionamento `https://www.wavon.com.br/api/calendar/oauth/callback`, escopos `Calendars.ReadWrite` + `User.Read` (delegado). Gerar `CLIENT_ID` e `CLIENT_SECRET`.
2. Configurar na Vercel Dashboard: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL=https://www.wavon.com.br`
3. Aplicar `supabase/migrations/036_calendar_scheduling.sql` no SQL Editor do Supabase
4. Fazer commit + push + deploy (`npx vercel --prod`)
5. Validar em produção: Configurações → Agenda → conectar Outlook → configurar horário comercial → testar IA fora do horário → testar botão "Agendar" no Inbox

## Fase 7.3.1 — Identidade WAVI + Marcador `[AGENDAR]` (26/06/2026) — ✅ CONCLUÍDA

Correção em cima da Fase 7.3. Dois problemas resolvidos na mesma rodada:

1. **Bug: horários aparecendo antes da coleta dos dados** — a detecção via `SCHEDULING_KEYWORDS` disparava `scheduling_slots` na resposta assim que a IA mencionava qualquer palavra de agendamento (ex: "para **agendar** seu **horário**"), mesmo durante a coleta dos campos obrigatórios. Substituído por marcador semântico `[AGENDAR]`: a IA inclui o marcador **somente** na resposta em que apresenta os horários (quando os 5 campos já estão confirmados); o backend detecta, remove o marcador antes de armazenar/retornar (nunca é exibido), e só inclui `scheduling_slots` no JSON se o marcador estava presente; o widget exibe os slots apenas se `scheduling_slots` vier na resposta.

2. **Identidade WAVI** — o atendente do widget se chama WAVI. Aplicado em: bloco "Identidade do Atendente" injetado no prompt da IA (`scheduling-assistant.ts`); instruções do backend (`message/route.ts`) e `FALLBACK_REPLY`; cabeçalho, subtítulo e mensagem de boas-vindas do widget (`chat-widget.tsx`). A IA nunca usa "bot", "robô" ou "IA" para se referir a si mesma.

**Arquivos alterados (3)**: `src/lib/ai/scheduling-assistant.ts` (bloco de identidade WAVI + instrução do marcador `[AGENDAR]` com 6 regras de uso), `src/app/api/public/site-widget/message/route.ts` (WAVI no FALLBACK_REPLY e nas instructions; detecção/remoção de `[AGENDAR]`; `SCHEDULING_KEYWORDS` removido), `src/components/site-widget/chat-widget.tsx` (`SCHEDULING_KEYWORDS`/`containsSchedulingKeyword` removidos; trigger simplificado; cabeçalho/subtítulo/welcome com WAVI).

`npm run typecheck` (0 erros), `npm run lint` (0 erros, 19 warnings pré-existentes) e `npm run build` (compilado com sucesso em 11.2s) limpos.

Commit desta rodada: ver "Histórico de encerramentos" abaixo (entrada 26/06/2026 Fase 7.3.1).

Bug de disponibilidade do slot das 14:00 também corrigido nesta sessão (rodada anterior ao commit desta fase): `sampleIntervalMinutes: 60 → 120` em `scheduling-assistant.ts` e `calendar/availability/route.ts`. Commit `0b5debd`, deploy `dpl_AmeoN6HubtjxKMCh2C12M6WpBYb7`.

---

## Fase 7.3 — Agendamento Inteligente 2.0 (26/06/2026) — ✅ CONCLUÍDA e em produção (commit `b57694a`, deploy `dpl_AQXzE3F7gAhDUgvtFaQVbr2RUMx6`)

Construída sobre a CalendarProvider abstraction da Fase 7.2. Objetivo: tornar o agendamento inteligente **universal** (IA sempre ativa, não só fora do horário) e **seguro** (nunca cria evento sem coleta completa dos 5 campos obrigatórios).

### Mudança central — `scheduling-assistant.ts` (reescrita completa)

- **Antes (Fase 7.2)**: IA só injetava o bloco de agendamento e buscava slots quando fora do horário comercial.
- **Agora (Fase 7.3)**: `buildSchedulingBlock()` substitui `buildOutOfHoursBlock()`. O bloco de instruções é injetado **em todo prompt**, sempre. Slots são buscados do calendário em paralelo com RAG e Base de Conhecimento — independentemente do horário.

### Regra dos 5 campos obrigatórios

A IA nunca oferece horários ou confirma agendamentos antes de coletar: (1) Nome completo, (2) Celular com DDD, (3) WhatsApp (confirma se é diferente do celular), (4) E-mail válido, (5) Motivo do atendimento. A rota `POST /api/calendar/appointments` também aplica essa regra na camada de API — retorna 400 com lista dos campos faltantes se qualquer um estiver ausente.

### Google Calendar (não Outlook)

O Google Calendar já estava completamente implementado desde a Fase 7.2 (`GoogleCalendarAdapter`, OAuth2, `getGoogleFreeBusy`, `createGoogleCalendarEvent` com Google Meet via `conferenceData`) — o CLAUDE.md anterior descrevia o Outlook como "primeiro provider" porque foi escrito durante o planejamento inicial, mas na prática o Google foi concluído primeiro. Outlook permanece implementado mas sem credenciais Azure. Toda a Fase 7.3 usa **Google Calendar com Google Meet**.

### 6 arquivos alterados

1. **`src/lib/ai/scheduling-assistant.ts`** — reescrita: sempre ativo, sempre busca slots, instrução dos 5 campos obrigatórios injetada em todo prompt.
2. **`src/app/api/calendar/appointments/route.ts`** — validação dos 5 campos (`attendee_name`, `attendee_phone`, `attendee_whatsapp`, `attendee_email`, `reason`); título `Atendimento - [Nome]`; descrição rica; atualiza e-mail do contato no CRM; posta confirmação no Inbox; atualiza notas do deal.
3. **`src/app/api/public/site-widget/schedule/route.ts`** — **novo**: endpoint público (sem autenticação) para agendamento pelo Widget. Usa `supabaseAdmin` + `resolveSiteWidgetAccountId()` + `phonesMatch()` (mesmo padrão do `message/route.ts`). Cria evento Google Calendar com Google Meet, persiste em `calendar_appointments`, atualiza contato/deal, posta confirmação no Inbox. Retorna `{ success, appointment_id, title, start_iso, end_iso, online_meeting_url, confirmation }`.
4. **`src/components/inbox/message-thread.tsx`** — dialog em 2 etapas: **etapa 1 (form)** coleta os 5 campos (pré-preenchido com dados do contato) → "Verificar horários" busca `GET /api/calendar/availability`; **etapa 2 (slots)** exibe botões de horário + "← Voltar". `handleCreateAppointment` passa todos os 5 campos + `origin: "Inbox"`.
5. **`src/components/site-widget/chat-widget.tsx`** — reescrita: formulário inicial agora coleta nome + WhatsApp + **e-mail** (3 campos, validação regex); `StoredSession` inclui `email`; resposta com `scheduling_slots` + palavra de agendamento → picker de horários inline; ao selecionar slot → mini-formulário de confirmação (WhatsApp + motivo); `handleConfirmSchedule()` chama `POST /api/public/site-widget/schedule`; altura aumentada de 28rem para 32rem.
6. **`src/app/api/public/site-widget/message/route.ts`** — aceita `email` (persiste no contato na primeira mensagem se não havia); retorna `scheduling_slots` condicionalmente (AI reply contém palavra de agendamento E há slots disponíveis); `availableSchedulingSlots` declarado fora do `if (aiSettings)` para ficar acessível no `return`.

`npm run typecheck`, `npm run lint` (0 erros, 21 warnings — todos pré-existentes) e `npm run build` limpos. Em produção sem pendências.

## Fase 8.0 — Agenda WAVON (26/06/2026) — ✅ CONCLUÍDA e validada em produção

Agenda nativa do WAVON. Google Calendar e Outlook são apenas provedores de sincronização. A tabela `calendar_appointments` é a fonte primária de todos os compromissos.

### Decisões de arquitetura (aprovadas — não alterar sem aprovação explícita)

- **Hierarquia**: WAVON Agenda → Google Calendar → Outlook → Apple/CalDAV (futuro)
- **Status persistidos**: `scheduled` (Pendente UI), `rescheduled` (Reagendado), `cancelled` (Cancelado), `completed` (Concluído). "Confirmado" é UI-only via `confirmed_at TIMESTAMPTZ` (futuro — sem migration de status).
- **Provider**: `GOOGLE | OUTLOOK | LOCAL` (LOCAL = compromisso interno, sem calendário externo)
- **Origin**: `Widget | WhatsApp | Inbox | Manual | Google | Outlook | API`
- **Sync**: `POST /api/calendar/sync?provider=GOOGLE|OUTLOOK|ALL` — janela -30 dias a +365 dias (configurável). Não sobrescreve `status` alterado manualmente (exceto se Google marcar como cancelado).
- **CalendarProvider interface**: método `listEvents(startISO, endISO)` adicionado. Google: implementado. Outlook: stub `return []`.
- **Timezone**: UTC no banco, timezone de `calendar_settings.timezone` para exibição.

### Preparação para funcionalidades futuras (arquitetura apenas — não implementar)

- **Multiusuário**: `assigned_user_id` já presente. Teams/workspaces via filtro por `assigned_user_id` (sem migration extra).
- **Eventos recorrentes**: campos `recurrence_rule TEXT` (RRULE) + `recurrence_parent_id UUID` reservados para migration futura.
- **Timeline do cliente**: JOIN via `contact_id` em `messages/conversations/deals/calendar_appointments` (já indexado).
- **WAVI Insights**: painel inteligente no compromisso usando campos já no modelo (CRM, pipeline, última conversa, tempo sem contato).
- **Hover Card**: dados já em `AppointmentWithContact` (nome, empresa, telefone, pipeline, meet).
- **Dashboard KPIs**: todos computáveis via índice `idx_calendar_appointments_kpi(account_id, status, origin, start_at)`.

### Migration 037 — `037_agenda_enhancements.sql`

Puramente aditiva. Adiciona: `reason TEXT`, `origin TEXT CHECK(...)`, `assigned_user_id UUID → auth.users`, expande `provider_type` (+LOCAL) e `status` (+rescheduled), cria 4 índices (`account_range`, `contact`, `kpi`, `external_id` UNIQUE para upsert de sync).

### Arquivos criados/alterados na Fase 8.0 (todos criados/verificados — typecheck/lint/build limpos)

Criados: `supabase/migrations/037_agenda_enhancements.sql`, `src/lib/agenda/types.ts`, `src/app/api/calendar/sync/route.ts`, `src/app/api/agenda/appointments/route.ts`, `src/app/api/agenda/appointments/[id]/route.ts`, `src/app/(dashboard)/agenda/page.tsx`, `src/components/agenda/agenda-page.tsx`, `src/components/agenda/agenda-header.tsx`, `src/components/agenda/calendar-month-view.tsx`, `src/components/agenda/appointment-card.tsx`, `src/components/agenda/appointment-panel.tsx`.

Alterados: `src/lib/calendar/types.ts` (+ExternalCalendarEvent, +listEvents), `src/lib/calendar/providers/google/client.ts` (+getGoogleCalendarEvents), `src/lib/calendar/providers/google/adapter.ts` (+listEvents), `src/lib/calendar/providers/outlook/adapter.ts` (+listEvents stub), `src/app/api/calendar/appointments/route.ts` (+reason +origin no INSERT), `src/components/layout/sidebar.tsx` (+Agenda entre Negociações e Disparos).

### Nota de arquitetura — sync provider único
`calendar_settings` tem UNIQUE em `account_id` (1 linha por conta), então `/api/calendar/sync` trabalha com o único provider configurado. O param `?provider=GOOGLE|OUTLOOK|ALL` atua como filtro (no-op se não bater). Multi-provider real fica para uma migration futura.

### Conclusão da Fase 8.0 (sessão 26/06/2026 noite)

**Fix 1 — Toast de sincronização**: `src/components/agenda/agenda-page.tsx` — `handleSync()` lê o corpo da resposta e exibe erros/resultados reais em vez de sempre retornar "sucesso". Commit `91cc29e`, deploy `dpl_9deW1HCFfdq14DzV6TkPDcJKyWwY`.

**Fix 2 — Sincronização multi-calendário**: `listGoogleCalendars()` adicionada a `client.ts`; `getGoogleCalendarEvents()` recebe `calendarId` em vez de hardcoded `'primary'`; `adapter.ts` itera todos os calendários não-automáticos (filtra `#holiday`, `#contacts`, `#weather`). **Implantado em produção via Vercel CLI, NÃO commitado no git** — próxima sessão: remover logs DIAG de `adapter.ts`, commitar `client.ts` + `adapter.ts`.

**Causa raiz descoberta**: calendário primário (`luizabrahao09@gmail.com`) estava vazio; "Desafio Fast Dólar Youtube" sem eventos na janela −30/+365 dias. A sincronização funciona — validada com evento de teste "Teste WAVON" (27/06/2026 às 10:00) que apareceu imediatamente na Agenda após clicar "Sincronizar".

**Billing banner "Payment overdue"**: presente no ambiente Sandbox do Asaas — comportamento esperado (assinatura de sandbox com cobrança vencida). Não é bug de código. Sugestão de melhoria registrada para a Fase 8.1: ocultar quando `ASAAS_ENVIRONMENT=sandbox`.

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
9. Criar compromisso diretamente no WAVON sincronizando automaticamente com Google Calendar
10. Timezone dinâmico por conta (usando `calendar_settings.timezone`)

**Ação necessária antes de qualquer item acima**: commitar o Fix 2 do multi-calendário.

## Pendências abertas
Nenhuma pendência de infraestrutura aberta no momento (DNS de webmail/cpanel confirmado funcionando em 22/06/2026 — ver seção de infraestrutura acima).

Fases 2 a 8.0 concluídas e em produção — migrations `024` a `037` aplicadas.

**Pendência de próxima sessão (antes de iniciar a Fase 8.1)**:
- Commitar multi-calendário: remover logs DIAG de `src/lib/calendar/providers/google/adapter.ts`, then `git add` + commit + push + `npx vercel --prod`.

Pendências não-bloqueantes:
- Adicionar `SUBSCRIPTION_INACTIVATED` + `SUBSCRIPTION_DELETED` ao webhook Asaas Sandbox (ação manual no painel Asaas).
- Mensagens de grupo (`@g.us`) da Evolution criam um "contato" por grupo, não por remetente real — sem atribuição por pessoa dentro do grupo.
- Outlook Calendar: implementado mas sem credenciais Azure (`MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`). Configurável por quem criar um Azure App Registration (instruções na Fase 7.2).

## Estado atual da plataforma (26/06/2026)
WAVON em produção (`www.wavon.com.br`) com:
- CRM (Contatos, Pipeline/Negociações, Automações)
- Inbox com WhatsApp via Evolution API (inbound e outbound validados, mídias inbound funcionando)
- Respostas rápidas ("/atalho" no composer)
- IA integrada via OpenAI (Responses API), chave própria por conta, criptografada
- Assistente IA no Inbox: sugerir resposta, resumir conversa, classificar lead
- Base de Conhecimento da IA: Perfil da Empresa, Produtos, FAQ, Objetivos, Regras — carregada automaticamente em todo prompt
- Documentos (RAG): upload de PDF/DOCX/PPTX/XLSX/TXT, busca semântica consultada antes de responder ao cliente (Inbox + widget) — serviço desacoplado (`src/lib/ai/rag/`)
- Widget de atendimento IA no site público (coleta nome + WhatsApp + e-mail), conversas chegando ao Inbox normal
- **Agendamento Inteligente 2.0 (Fase 7.3 + 7.3.1)**: IA sempre ativa para agendamento; coleta obrigatória de 5 campos com marcador semântico `[AGENDAR]` (slots nunca aparecem antes dos dados); Google Calendar com Google Meet; endpoint público `/api/public/site-widget/schedule`; dialog 2 etapas no Inbox; picker inline no Widget; atendente WAVI — tudo em produção
- **Agenda nativa (Fase 8.0)**: `/agenda` com calendário mensal, sincronização Google Calendar (multi-calendário), painel lateral de compromissos, item na sidebar — validado em produção

Todas as migrations até `037` aplicadas em produção.

## Decisões e restrições que seguem valendo
- Nunca trocar os nameservers do domínio `wavon.com.br` para a Vercel — DNS fica na HostGator.
- Preservar registros de e-mail/serviços da HostGator (mail, webmail, cpanel, whm).
- Não copiar literalmente a documentação do template de origem; não expor detalhes sensíveis de infraestrutura/deploy/secrets no conteúdo público.
- **WhatsApp: Evolution API** (decisão revertida em 23/06/2026, substituindo a regra anterior "apenas Meta Business Cloud API" — decisão explícita e intencional do usuário, confirmada após eu apontar o conflito com a regra antiga). Usada como ponte rápida para validar WhatsApp, Inbox e atendimento real; Meta Cloud API fica para uma fase futura. Inbound validado em produção; outbound ainda não testado. Ver seção "Fase 3" acima.
- Fase 2 (billing real Asaas) concluída e validada — ver seção acima.
- Enforcement real (bloquear CRM/automações por `access_status`) é uma fase futura própria (depois da Fase 3), não iniciar sem aprovação explícita.
