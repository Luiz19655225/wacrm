import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Fluxos",
  description:
    "Como estruturar conversas guiadas no WAVON com fluxos: triagem, menus, coleta de dados e transferência organizada para atendimento humano.",
};

const FLOW_COMPONENTS = [
  "menus de opções",
  "botões e listas",
  "perguntas para coleta de dados",
  "condições que ramificam a conversa",
  "aplicação automática de tags",
  "etapa de transferência para humano",
];

const USE_CASES = [
  "triagem inicial por assunto",
  "FAQ guiado com respostas para dúvidas comuns",
  "captura de dados de um lead novo",
  "direcionamento para vendas, suporte ou pós-venda",
  "atendimento inicial fora do horário comercial",
];

const PRE_SERVICE_ROLE = [
  "organizar o início da conversa antes de um humano participar",
  "coletar informações relevantes para o atendimento",
  "qualificar o motivo do contato",
  "reduzir o tempo até a primeira resposta",
];

const HANDOFF_POINTS = [
  "o fluxo identifica que o assunto exige um humano",
  "o cliente solicita falar com um atendente",
  "uma condição específica é atendida",
];

const DESIGN_PRACTICES = [
  "manter menus curtos e objetivos",
  "evitar muitas ramificações em um único fluxo",
  "sempre prever uma saída para falar com um humano",
  "testar o fluxo do ponto de vista de quem está conversando",
  "revisar o fluxo periodicamente conforme a operação muda",
];

const NEXT_STEPS = [
  { href: "/docs/automacoes", label: "Automações" },
  { href: "/docs/atendimento-hibrido", label: "Atendimento híbrido" },
  { href: "/docs/agente-de-ia", label: "Agente de IA" },
  { href: "/docs/inbox", label: "Inbox" },
];

export default function FluxosDocsPage() {
  return (
    <DocsArticle>
      <h1>Fluxos</h1>
      <p>Fluxos são a base do pré-atendimento guiado no WAVON.</p>
      <p>
        Eles permitem estruturar uma conversa em etapas, com menus, perguntas e regras de
        direcionamento, em vez de depender de uma resposta livre e improvisada no primeiro contato
        com o cliente.
      </p>

      <h2>O que compõe um fluxo</h2>
      <p>Um fluxo pode combinar diferentes elementos para conduzir a conversa, como:</p>
      <ul>
        {FLOW_COMPONENTS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Esses elementos podem ser combinados para criar uma jornada de conversa adequada ao tipo de atendimento que a empresa precisa oferecer.</p>

      <h2>Casos de uso comuns</h2>
      <p>Fluxos são usados, com frequência, para:</p>
      <ul>
        {USE_CASES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>O papel dos fluxos no pré-atendimento</h2>
      <p>No pré-atendimento, antes de a conversa chegar a um humano, os fluxos ajudam a:</p>
      <ul>
        {PRE_SERVICE_ROLE.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Esse trabalho inicial é o que sustenta o modelo de{" "}
        <Link href="/docs/atendimento-hibrido">atendimento híbrido</Link> do WAVON: o fluxo organiza
        a entrada da conversa, e a equipe assume com mais contexto.
      </p>

      <h2>Transferência para humano</h2>
      <p>Todo fluxo bem desenhado prevê o momento de transferir a conversa para um atendente. Isso costuma acontecer quando:</p>
      <ul>
        {HANDOFF_POINTS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Quando a transferência acontece, a conversa segue visível na <Link href="/docs/inbox">Inbox</Link>,
        já com o histórico e os dados coletados durante o fluxo, sem que o cliente precise repetir
        informações.
      </p>

      <h2>Boas práticas na construção de fluxos</h2>
      <p>Para que um fluxo funcione bem na prática, vale a pena:</p>
      <ul>
        {DESIGN_PRACTICES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Próximo passo recomendado</h2>
      <p>Depois desta página, siga para:</p>
      <ul>
        {NEXT_STEPS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="font-semibold">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <DocsPager currentHref="/docs/fluxos" />
    </DocsArticle>
  );
}
