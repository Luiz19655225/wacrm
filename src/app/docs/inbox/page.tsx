import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Inbox",
  description:
    "Como a Inbox centraliza as conversas do WhatsApp no WAVON: histórico, contexto do contato, status do atendimento e continuidade entre automação e equipe humana.",
};

const INBOX_CONTAINS = [
  "lista de conversas em andamento",
  "histórico completo de mensagens",
  "dados do contato vinculado",
  "tags aplicadas",
  "status do atendimento",
  "responsável pela conversa",
  "negociações relacionadas",
];

const STATUS_EXAMPLES = [
  "aberta",
  "em andamento",
  "aguardando resposta do cliente",
  "aguardando atendimento humano",
  "resolvida",
];

const TEAM_BENEFITS = [
  "ninguém perde uma conversa por falta de visibilidade",
  "fica claro quem está atendendo cada cliente",
  "o histórico não se perde quando uma conversa muda de mãos",
  "novos atendentes conseguem entender o contexto rapidamente",
];

const HYBRID_ROLE = [
  "fluxos e automações podem iniciar e organizar a conversa",
  "a Inbox mostra o que já foi feito antes do humano assumir",
  "o atendente vê tags, dados coletados e o motivo do contato",
  "a transição é registrada, sem repetir perguntas já respondidas",
];

const BEST_PRACTICES = [
  "defina status claros e use-os de forma consistente",
  "atribua conversas a um responsável sempre que possível",
  "use tags para indicar assunto, etapa ou prioridade",
  "revise conversas paradas antes que o cliente desista",
  "registre negociações quando a conversa virar oportunidade comercial",
];

const NEXT_STEPS = [
  { href: "/docs/contatos", label: "Contatos" },
  { href: "/docs/negociacoes", label: "Negociações" },
  { href: "/docs/atendimento-hibrido", label: "Atendimento híbrido" },
  { href: "/docs/automacoes", label: "Automações" },
];

export default function InboxDocsPage() {
  return (
    <DocsArticle>
      <h1>Inbox</h1>
      <p>A Inbox é o centro operacional do atendimento no WAVON.</p>
      <p>
        É nela que as conversas do WhatsApp chegam, são acompanhadas pela equipe e seguem até a
        resolução. Mais do que uma caixa de mensagens, a Inbox reúne histórico, contexto do
        contato e status de cada atendimento em um só lugar.
      </p>

      <h2>O que a Inbox centraliza</h2>
      <p>Cada conversa na Inbox reúne:</p>
      <ul>
        {INBOX_CONTAINS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Isso evita que informações importantes fiquem espalhadas entre o celular de um atendente, planilhas paralelas ou anotações soltas.</p>

      <h2>Organização das conversas</h2>
      <p>
        As conversas na Inbox podem ser organizadas por status, o que ajuda a equipe a entender
        rapidamente em que ponto cada atendimento está. Alguns exemplos de status usados na
        operação:
      </p>
      <ul>
        {STATUS_EXAMPLES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>O uso consistente de status é o que torna possível saber, em qualquer momento, quais conversas precisam de atenção.</p>

      <h2>Histórico e contexto do contato</h2>
      <p>
        Ao abrir uma conversa, o atendente vê não só as mensagens trocadas, mas também o histórico
        do contato: interações anteriores, tags aplicadas e, quando existir, a negociação
        relacionada.
      </p>
      <p>
        Esse contexto é o que permite atender sem repetir perguntas já respondidas e sem depender
        da memória de quem atendeu antes.
      </p>

      <h2>Atendimento em equipe</h2>
      <p>A Inbox foi desenhada como um espaço compartilhado, não individual. Isso traz benefícios diretos para a operação:</p>
      <ul>
        {TEAM_BENEFITS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Cada conversa pode ter um responsável definido, o que organiza a distribuição de trabalho e evita que duas pessoas atendam o mesmo cliente sem saber.</p>

      <h2>O papel da Inbox no atendimento híbrido</h2>
      <p>
        No modelo de <Link href="/docs/atendimento-hibrido">atendimento híbrido</Link> do WAVON, a
        Inbox é o ponto de encontro entre automação e equipe humana.
      </p>
      <ul>
        {HYBRID_ROLE.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Conversas estruturadas por <Link href="/docs/fluxos">fluxos</Link> ou tratadas por{" "}
        <Link href="/docs/automacoes">automações</Link> continuam visíveis na Inbox durante todo o
        processo, e não apenas no momento em que chegam até um humano.
      </p>

      <h2>Boas práticas de uso</h2>
      <p>Para manter a Inbox útil no dia a dia da operação, vale a pena:</p>
      <ul>
        {BEST_PRACTICES.map((item) => (
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

      <DocsPager currentHref="/docs/inbox" />
    </DocsArticle>
  );
}
