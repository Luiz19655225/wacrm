import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Negociações",
  description:
    "Como acompanhar oportunidades comerciais no WAVON: funis, etapas, cards de negócio e a relação entre negociações e atendimento pelo WhatsApp.",
};

const DEAL_FIELDS = [
  "contato relacionado",
  "valor da oportunidade",
  "etapa atual",
  "responsável pelo negócio",
  "status (em andamento, ganho ou perdido)",
];

const PIPELINE_BENEFITS = [
  "saber exatamente em que etapa cada oportunidade está",
  "identificar negociações paradas há muito tempo",
  "medir quantas oportunidades avançam de uma etapa para outra",
  "organizar a previsão de receita com mais clareza",
];

const STAGE_EXAMPLES = [
  "novo contato",
  "qualificação",
  "proposta enviada",
  "negociação",
  "ganho",
  "perdido",
];

const WHATSAPP_LINK = [
  "a conversa que originou a oportunidade fica acessível na Inbox",
  "o histórico de mensagens ajuda a entender o estágio real do negócio",
  "tags aplicadas no contato ajudam a qualificar a oportunidade",
  "o vendedor pode continuar a negociação no mesmo canal onde o lead chegou",
];

const BEST_PRACTICES = [
  "mover a negociação de etapa assim que houver avanço real",
  "registrar valor e responsável desde o início",
  "marcar como ganho ou perdido em vez de deixar oportunidades esquecidas",
  "revisar periodicamente negociações sem movimento",
  "manter o funil com etapas claras e em número razoável",
];

const NEXT_STEPS = [
  { href: "/docs/contatos", label: "Contatos" },
  { href: "/docs/inbox", label: "Inbox" },
  { href: "/docs/atendimento-hibrido", label: "Atendimento híbrido" },
  { href: "/docs/automacoes", label: "Automações" },
];

export default function NegociacoesDocsPage() {
  return (
    <DocsArticle>
      <h1>Negociações</h1>
      <p>O módulo de negociações organiza as oportunidades comerciais dentro do WAVON.</p>
      <p>
        Em vez de acompanhar vendas por planilhas paralelas ou pela memória da equipe, cada
        oportunidade ganha um card de negócio, posicionado em um funil com etapas, e vinculado ao
        contato que a originou.
      </p>

      <h2>O que compõe uma negociação</h2>
      <p>Cada card de negociação reúne informações como:</p>
      <ul>
        {DEAL_FIELDS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Esses dados ficam visíveis para toda a equipe comercial, o que facilita o acompanhamento mesmo quando mais de uma pessoa participa da venda.</p>

      <h2>Funis e etapas</h2>
      <p>
        As negociações são organizadas em pipelines, com etapas que representam o avanço da
        oportunidade. Um funil comercial comum costuma seguir uma sequência como:
      </p>
      <ul>
        {STAGE_EXAMPLES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Cada empresa pode ajustar as etapas conforme o seu próprio processo de vendas. Se houver mais de um processo comercial, é possível trabalhar com mais de um funil.</p>

      <h2>Por que organizar negociações em funil</h2>
      <p>Acompanhar oportunidades em um funil estruturado traz benefícios diretos para a operação comercial:</p>
      <ul>
        {PIPELINE_BENEFITS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Relação com o atendimento no WhatsApp</h2>
      <p>
        No WAVON, negociações não vivem isoladas do atendimento. Elas estão diretamente conectadas
        à conversa que deu origem à oportunidade.
      </p>
      <ul>
        {WHATSAPP_LINK.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Essa conexão entre <Link href="/docs/inbox">Inbox</Link>, <Link href="/docs/contatos">Contatos</Link>{" "}
        e negociações é o que dá visibilidade comercial real ao processo de vendas pelo WhatsApp.
      </p>

      <h2>Boas práticas de uso</h2>
      <p>Para manter o funil comercial útil e confiável, vale a pena:</p>
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

      <DocsPager currentHref="/docs/negociacoes" />
    </DocsArticle>
  );
}
