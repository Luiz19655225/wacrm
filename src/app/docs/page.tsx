import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Documentação",
  description:
    "Documentação do WAVON: CRM com WhatsApp, automação de atendimento, atendimento híbrido e agente de IA para equipes que vendem e atendem pelo WhatsApp.",
};

const SECTIONS = [
  {
    href: "/docs/visao-geral",
    title: "Visão geral",
    description: "Entenda como o WAVON funciona e como o atendimento híbrido é organizado.",
  },
  {
    href: "/docs/primeiros-passos",
    title: "Primeiros passos",
    description: "Veja por onde começar, como acessar o sistema e como montar sua operação inicial.",
  },
  {
    href: "/docs/inbox",
    title: "Inbox",
    description: "Aprenda a centralizar conversas e operar o atendimento do WhatsApp em equipe.",
  },
  {
    href: "/docs/contatos",
    title: "Contatos",
    description: "Organize seus leads, dados de clientes, tags e histórico.",
  },
  {
    href: "/docs/negociacoes",
    title: "Negociações",
    description: "Acompanhe oportunidades, funis e etapas comerciais dentro do CRM.",
  },
  {
    href: "/docs/modelos",
    title: "Modelos",
    description: "Use mensagens aprovadas para contatos fora da janela de atendimento.",
  },
  {
    href: "/docs/disparos",
    title: "Disparos",
    description: "Envie campanhas e comunicações em massa com segmentação e acompanhamento.",
  },
  {
    href: "/docs/automacoes",
    title: "Automações",
    description: "Crie regras de resposta, distribuição, follow-up e operação por horário.",
  },
  {
    href: "/docs/fluxos",
    title: "Fluxos",
    description: "Estruture o pré-atendimento com perguntas, opções, triagem e handoff.",
  },
  {
    href: "/docs/atendimento-hibrido",
    title: "Atendimento híbrido",
    description: "Veja como combinar IA, automação e equipe humana dentro do WAVON.",
  },
  {
    href: "/docs/agente-de-ia",
    title: "Agente de IA",
    description:
      "Entenda o posicionamento do agente de IA do WAVON, sua função no pré-atendimento e sua integração com o CRM.",
  },
  {
    href: "/docs/configuracoes",
    title: "Configurações",
    description: "Ajuste aparência, WhatsApp, modelos, tags, moeda e preferências da conta.",
  },
  {
    href: "/docs/equipe",
    title: "Equipe",
    description: "Gerencie membros, acessos e papéis.",
  },
  {
    href: "/docs/faq",
    title: "FAQ",
    description: "Tire dúvidas rápidas sobre uso, operação e implantação.",
  },
];

const GETTING_STARTED_ORDER = [
  { href: "/docs/visao-geral", label: "Visão geral" },
  { href: "/docs/primeiros-passos", label: "Primeiros passos" },
  { href: "/docs/inbox", label: "Inbox" },
  { href: "/docs/contatos", label: "Contatos" },
  { href: "/docs/negociacoes", label: "Negociações" },
  { href: "/docs/automacoes", label: "Automações" },
  { href: "/docs/fluxos", label: "Fluxos" },
  { href: "/docs/atendimento-hibrido", label: "Atendimento híbrido" },
];

const NEXT_STEPS = [
  { href: "/docs/visao-geral", label: "Visão geral" },
  { href: "/docs/primeiros-passos", label: "Primeiros passos" },
  { href: "/docs/inbox", label: "Inbox" },
  { href: "/docs/fluxos", label: "Fluxos" },
  { href: "/docs/automacoes", label: "Automações" },
  { href: "/docs/atendimento-hibrido", label: "Atendimento híbrido" },
];

export default function DocsIndexPage() {
  return (
    <DocsArticle>
      <h1>Documentação do WAVON</h1>
      <p>Bem-vindo à documentação do WAVON.</p>
      <p>
        O WAVON é uma plataforma de atendimento e gestão comercial para empresas que usam o
        WhatsApp como canal principal de relacionamento com clientes. Ele reúne atendimento,
        contatos, negociações, automações e operação da equipe em um único ambiente.
      </p>
      <p>
        Aqui você vai aprender como organizar sua operação, estruturar o pré-atendimento,
        transferir conversas para o time humano no momento certo e registrar tudo no CRM.
      </p>

      <h2>O que você encontra nesta documentação</h2>
      <ul className="!list-none !pl-0">
        {SECTIONS.map((section) => (
          <li key={section.href} className="mb-4">
            <Link href={section.href} className="font-semibold text-foreground hover:text-primary">
              {section.title}
            </Link>
            <p className="mt-0.5 mb-0">{section.description}</p>
          </li>
        ))}
      </ul>

      <h2>Para quem o WAVON foi feito</h2>
      <p>
        O WAVON foi pensado para empresas que atendem, qualificam e vendem pelo WhatsApp, e que
        precisam de mais controle sobre:
      </p>
      <ul>
        <li>quem está atendendo</li>
        <li>em que etapa o lead está</li>
        <li>quando transferir para o time</li>
        <li>como não perder oportunidades fora do horário</li>
        <li>como manter histórico e operação organizados</li>
      </ul>

      <h2>Como usar esta documentação</h2>
      <p>Se você está começando agora, recomendamos esta ordem:</p>
      <ol>
        {GETTING_STARTED_ORDER.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ol>

      <h2>Base funcional do WAVON</h2>
      <p>
        O WAVON já nasce com uma base funcional estruturada, com módulos como Inbox, Contatos,
        Negociações, Modelos, Disparos, Automações, Fluxos, Configurações e Equipe. Esses recursos
        são organizados em torno de uma operação comercial com atendimento híbrido, posicionamento
        próprio e documentação em português.
      </p>

      <h2>O que torna o WAVON uma plataforma própria</h2>
      <p>
        A documentação não é apresentada como manual de um template genérico. Ela é organizada
        como uma plataforma própria, com foco em:
      </p>
      <ul>
        <li>atendimento pelo WhatsApp</li>
        <li>operação comercial</li>
        <li>pré-atendimento com IA</li>
        <li>transferência para humano</li>
        <li>registro no CRM</li>
        <li>follow-up e continuidade do relacionamento</li>
      </ul>

      <h2>Próximo passo recomendado</h2>
      <p>Se esta é sua primeira vez no WAVON, siga para:</p>
      <ul>
        {NEXT_STEPS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="font-semibold">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <DocsPager currentHref="/docs" />
    </DocsArticle>
  );
}
