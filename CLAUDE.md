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
- WhatsApp: **APENAS Meta Business Cloud API**. Nunca Evolution API, Z-API ou ReplyAgent.
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

## Pendências abertas
Nenhuma pendência de infraestrutura aberta no momento (DNS de webmail/cpanel confirmado funcionando em 22/06/2026 — ver seção de infraestrutura acima).

Pendência funcional não-bloqueante: prevenir placeholders `pending` duplicados do mesmo tipo em `account_connections` (ver seção "Fase 1" acima).

## Decisões e restrições que seguem valendo
- Nunca trocar os nameservers do domínio `wavon.com.br` para a Vercel — DNS fica na HostGator.
- Preservar registros de e-mail/serviços da HostGator (mail, webmail, cpanel, whm).
- Não copiar literalmente a documentação do template de origem; não expor detalhes sensíveis de infraestrutura/deploy/secrets no conteúdo público.
- WhatsApp: apenas Meta Business Cloud API.
- Fase 2 (enforcement de acesso por trial/subscription) ainda não foi iniciada — não avançar sem aprovação explícita.
