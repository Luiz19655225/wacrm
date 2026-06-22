export interface DocsNavItem {
  href: string;
  label: string;
}

export interface DocsNavGroup {
  title: string;
  items: DocsNavItem[];
}

// Single source of truth for the docs nav — both the sidebar (client,
// for active-state highlighting) and DocsPager (server, prev/next
// links) read from this. Kept in a plain module (no "use client") so
// server components can import it directly; docs-sidebar.tsx re-exports
// it for backwards-compat callers that import from there.
export const DOCS_NAV: DocsNavGroup[] = [
  {
    title: "Primeiros passos",
    items: [
      { href: "/docs/visao-geral", label: "Visão geral" },
      { href: "/docs/primeiros-passos", label: "Primeiros passos" },
    ],
  },
  {
    title: "Atendimento",
    items: [
      { href: "/docs/inbox", label: "Inbox" },
      { href: "/docs/contatos", label: "Contatos" },
      { href: "/docs/negociacoes", label: "Negociações" },
      { href: "/docs/atendimento-hibrido", label: "Atendimento híbrido" },
      { href: "/docs/agente-de-ia", label: "Agente de IA" },
    ],
  },
  {
    title: "Comunicação",
    items: [
      { href: "/docs/modelos", label: "Modelos" },
      { href: "/docs/disparos", label: "Disparos" },
    ],
  },
  {
    title: "Automação",
    items: [
      { href: "/docs/automacoes", label: "Automações" },
      { href: "/docs/fluxos", label: "Fluxos" },
    ],
  },
  {
    title: "Conta",
    items: [
      { href: "/docs/configuracoes", label: "Configurações" },
      { href: "/docs/equipe", label: "Equipe" },
    ],
  },
  {
    title: "Ajuda",
    items: [{ href: "/docs/faq", label: "FAQ" }],
  },
];
