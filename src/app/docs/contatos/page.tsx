import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Contatos",
  description:
    "Como organizar leads e clientes na base de contatos do WAVON: cadastro, tags, histórico e uso comercial dentro do CRM com WhatsApp.",
};

const CONTACT_FIELDS = [
  "nome",
  "telefone",
  "e-mail",
  "empresa",
  "tags",
  "histórico de conversas",
  "negociações relacionadas",
];

const CREATION_WAYS = [
  "manualmente, pela equipe",
  "automaticamente, a partir de uma nova mensagem recebida",
  "por importação em massa, via CSV",
];

const TAG_USES = [
  "indicar origem do lead (anúncio, site, indicação)",
  "marcar etapa da jornada (novo, em atendimento, cliente)",
  "sinalizar interesse ou produto",
  "identificar prioridade ou urgência",
  "segmentar para campanhas e disparos",
];

const QUALITY_PRACTICES = [
  "evitar contatos duplicados",
  "manter nomes padronizados",
  "usar tags com critério, sem excesso",
  "atualizar dados quando o cliente fornecer novas informações",
  "revisar periodicamente contatos sem interação",
];

const COMMERCIAL_USES = [
  "filtrar contatos por tag para campanhas direcionadas",
  "identificar quem já é cliente e quem ainda é lead",
  "acompanhar o histórico antes de uma nova abordagem",
  "abrir uma negociação a partir de um contato qualificado",
];

const NEXT_STEPS = [
  { href: "/docs/negociacoes", label: "Negociações" },
  { href: "/docs/inbox", label: "Inbox" },
  { href: "/docs/disparos", label: "Disparos" },
  { href: "/docs/automacoes", label: "Automações" },
];

export default function ContatosDocsPage() {
  return (
    <DocsArticle>
      <h1>Contatos</h1>
      <p>A base de contatos é o registro central de leads e clientes dentro do WAVON.</p>
      <p>
        Cada pessoa que conversa com a empresa pelo WhatsApp se torna um contato, com dados,
        histórico e tags que ajudam a equipe a entender quem é aquela pessoa e qual a relação dela
        com o negócio.
      </p>

      <h2>O que um contato reúne</h2>
      <p>Um cadastro de contato no WAVON pode incluir:</p>
      <ul>
        {CONTACT_FIELDS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Esses dados ficam disponíveis para toda a equipe durante o atendimento, sem depender de anotações soltas ou memória individual.</p>

      <h2>Como os contatos são criados</h2>
      <p>O WAVON oferece três formas de adicionar contatos à base:</p>
      <ul>
        {CREATION_WAYS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Isso significa que a base cresce naturalmente conforme a operação recebe novas conversas, sem exigir cadastro manual constante.</p>

      <h2>Organização com tags</h2>
      <p>Tags são a principal ferramenta de organização da base de contatos. Elas podem ser usadas para:</p>
      <ul>
        {TAG_USES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        As mesmas tags aplicadas em <Link href="/docs/contatos">contatos</Link> também aparecem na{" "}
        <Link href="/docs/inbox">Inbox</Link>, em <Link href="/docs/fluxos">fluxos</Link>, em{" "}
        <Link href="/docs/automacoes">automações</Link> e em <Link href="/docs/disparos">disparos</Link>,
        o que mantém a segmentação consistente em toda a plataforma.
      </p>

      <h2>Histórico do contato</h2>
      <p>
        Cada contato carrega o histórico das conversas anteriores. Isso permite que qualquer
        atendente, mesmo sem ter participado de interações passadas, entenda rapidamente o contexto
        antes de responder.
      </p>

      <h2>Por que a qualidade da base importa</h2>
      <p>Uma base de contatos bem cuidada é o que sustenta um atendimento consistente e uma operação comercial organizada. Para manter a qualidade da base:</p>
      <ul>
        {QUALITY_PRACTICES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Uma base desorganizada, por outro lado, gera retrabalho, mensagens fora de contexto e perda de oportunidades.</p>

      <h2>Uso comercial dos contatos</h2>
      <p>Além de sustentar o atendimento, a base de contatos é uma ferramenta comercial. Ela permite:</p>
      <ul>
        {COMMERCIAL_USES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Quando um contato avança na jornada comercial, o passo natural é criar uma{" "}
        <Link href="/docs/negociacoes">negociação</Link> vinculada a ele, para acompanhar a
        oportunidade dentro do funil.
      </p>

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

      <DocsPager currentHref="/docs/contatos" />
    </DocsArticle>
  );
}
