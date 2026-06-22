import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Visão geral",
  description:
    "Entenda como o WAVON funciona como CRM com WhatsApp, com automação de atendimento e atendimento híbrido entre agente de IA e equipe humana.",
};

const MODULES = [
  { href: "/docs/inbox", title: "Inbox", description: "Centraliza as conversas da equipe em um só lugar, com histórico, status e visão do contato." },
  { href: "/docs/contatos", title: "Contatos", description: "Organiza leads e clientes com dados, tags, empresa e histórico." },
  { href: "/docs/negociacoes", title: "Negociações", description: "Acompanha oportunidades em funis e etapas comerciais." },
  { href: "/docs/modelos", title: "Modelos", description: "Permite trabalhar com mensagens aprovadas para uso fora da janela de 24 horas." },
  { href: "/docs/disparos", title: "Disparos", description: "Permite enviar campanhas com segmentação e rastreamento por destinatário." },
  { href: "/docs/automacoes", title: "Automações", description: "Executa regras automáticas com gatilhos, condições, espera, distribuição e follow-up." },
  { href: "/docs/fluxos", title: "Fluxos", description: "Estrutura conversas guiadas com menus, respostas, coleta de dados e handoff." },
  { href: "/docs/configuracoes", title: "Configurações", description: "Centraliza ajustes da conta, conexão do WhatsApp, templates, tags, aparência e equipe." },
  { href: "/docs/equipe", title: "Equipe", description: "Gerencia membros, papéis e permissões da operação." },
];

const NEXT_STEPS = [
  { href: "/docs/primeiros-passos", label: "Primeiros passos" },
  { href: "/docs/inbox", label: "Inbox" },
  { href: "/docs/automacoes", label: "Automações" },
  { href: "/docs/fluxos", label: "Fluxos" },
  { href: "/docs/atendimento-hibrido", label: "Atendimento híbrido" },
];

export default function VisaoGeralPage() {
  return (
    <DocsArticle>
      <h1>Visão geral do WAVON</h1>
      <p>
        O WAVON é um CRM com WhatsApp criado para empresas que precisam atender melhor, organizar
        o time comercial e estruturar o relacionamento com leads e clientes em um único sistema.
      </p>
      <p>
        Mais do que uma caixa de entrada, o WAVON reúne atendimento, contatos, negociações,
        mensagens, automações e operação de equipe em uma única plataforma.
      </p>

      <h2>A proposta do WAVON</h2>
      <p>O objetivo do WAVON é transformar o WhatsApp em um canal organizado de atendimento e vendas.</p>
      <p>Na prática, isso significa:</p>
      <ul>
        <li>receber leads de anúncios, site e WhatsApp</li>
        <li>fazer o primeiro atendimento de forma estruturada</li>
        <li>qualificar o contato</li>
        <li>direcionar para humano quando necessário</li>
        <li>registrar tudo no CRM</li>
        <li>manter follow-up e histórico sem depender de planilhas</li>
      </ul>

      <h2>Como o WAVON funciona</h2>
      <p>O funcionamento do WAVON pode ser entendido em 4 camadas.</p>

      <h3>1. Entrada de leads</h3>
      <p>Os leads chegam por anúncios, site, campanhas ou contato direto pelo WhatsApp.</p>

      <h3>2. Pré-atendimento</h3>
      <p>
        O primeiro contato pode ser organizado com fluxos, automações e lógica de triagem para
        coletar informações, responder perguntas iniciais e preparar a conversa.
      </p>

      <h3>3. Atendimento humano</h3>
      <p>
        No horário comercial, a conversa pode ser direcionada para a equipe. Fora dele, o cliente
        pode receber orientação inicial e agendamento de retorno.
      </p>

      <h3>4. Registro e operação</h3>
      <p>Tudo fica salvo no CRM: contatos, histórico, conversas, tags, negociações e próximas ações.</p>

      <h2>Atendimento híbrido: IA + humano</h2>
      <p>O modelo operacional do WAVON foi desenhado para um atendimento híbrido.</p>
      <p>
        Isso significa que parte da jornada pode ser automatizada para ganhar velocidade e
        padronização, enquanto a equipe humana assume nos momentos de análise, venda, fechamento
        ou relacionamento.
      </p>
      <p>
        A base atual do sistema já oferece recursos para isso por meio de fluxos guiados e
        automações com condições, tags, coleta de dados, handoff para humano e etapas com espera.
      </p>

      <h2>Sobre o agente de IA no WAVON</h2>
      <p>
        Sobre essa base de fluxos e automações, a camada de agente de IA do WAVON é construída com
        foco em:
      </p>
      <ul>
        <li>pré-atendimento</li>
        <li>qualificação automática</li>
        <li>direcionamento por contexto</li>
        <li>handoff para humano</li>
        <li>agendamento fora do horário</li>
        <li>registro no CRM</li>
      </ul>

      <h2>Principais módulos da plataforma</h2>
      {MODULES.map((mod) => (
        <div key={mod.href}>
          <h3>
            <Link href={mod.href}>{mod.title}</Link>
          </h3>
          <p>{mod.description}</p>
        </div>
      ))}

      <h2>Quando o WAVON faz sentido</h2>
      <p>O WAVON faz mais sentido para empresas que:</p>
      <ul>
        <li>recebem muitos leads pelo WhatsApp</li>
        <li>precisam organizar atendimento em equipe</li>
        <li>querem padronizar o primeiro contato</li>
        <li>precisam registrar oportunidades comerciais</li>
        <li>não querem perder leads fora do horário comercial</li>
      </ul>

      <h2>O que o WAVON resolve</h2>
      <p>Com o WAVON, a empresa consegue:</p>
      <ul>
        <li>reduzir perda de leads</li>
        <li>acelerar o primeiro atendimento</li>
        <li>organizar a transição entre automação e humano</li>
        <li>centralizar histórico e dados</li>
        <li>acompanhar negociações com mais clareza</li>
        <li>criar continuidade no follow-up</li>
      </ul>

      <h2>Próximo passo recomendado</h2>
      <p>Se esta é sua primeira vez no sistema, siga para:</p>
      <ul>
        {NEXT_STEPS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="font-semibold">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <DocsPager currentHref="/docs/visao-geral" />
    </DocsArticle>
  );
}
