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

## Pendências abertas
Nenhuma pendência de infraestrutura aberta no momento (DNS de webmail/cpanel confirmado funcionando em 22/06/2026 — ver seção de infraestrutura acima).

## Decisões e restrições que seguem valendo
- Nunca trocar os nameservers do domínio `wavon.com.br` para a Vercel — DNS fica na HostGator.
- Preservar registros de e-mail/serviços da HostGator (mail, webmail, cpanel, whm).
- Não copiar literalmente a documentação do template de origem; não expor detalhes sensíveis de infraestrutura/deploy/secrets no conteúdo público.
- WhatsApp: apenas Meta Business Cloud API.
