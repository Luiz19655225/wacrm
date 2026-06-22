import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Disparos",
  description:
    "Como enviar campanhas de WhatsApp pelo WAVON usando modelos aprovados: segmentação de público, agendamento, acompanhamento e boas práticas.",
};

const CAMPAIGN_STEPS = [
  "escolher o modelo aprovado que será usado",
  "selecionar o público que vai receber a mensagem",
  "personalizar variáveis quando aplicável",
  "definir data e horário de envio",
  "acompanhar o resultado após o disparo",
];

const SEGMENTATION_CRITERIA = [
  "tags aplicadas no contato",
  "etapa do funil de negociações",
  "histórico de interação",
  "origem do lead",
  "listas específicas de contatos",
];

const TRACKING_POINTS = [
  "quantas mensagens foram enviadas",
  "quantas foram entregues",
  "quantas foram lidas",
  "quantos contatos responderam",
  "quais contatos não puderam ser alcançados",
];

const GOOD_PRACTICES = [
  "segmentar o público em vez de enviar para toda a base de uma vez",
  "escolher horários adequados para o tipo de mensagem",
  "usar conteúdo relevante para quem está recebendo",
  "respeitar a frequência de envio, sem sobrecarregar o contato",
  "revisar o modelo antes de confirmar o disparo",
];

const RESPONSIBLE_USE = [
  "campanhas em excesso desgastam a base de contatos",
  "mensagens fora de contexto reduzem a taxa de resposta",
  "o objetivo do disparo deve ser sempre comunicação relevante, não volume",
];

const NEXT_STEPS = [
  { href: "/docs/modelos", label: "Modelos" },
  { href: "/docs/contatos", label: "Contatos" },
  { href: "/docs/automacoes", label: "Automações" },
];

export default function DisparosDocsPage() {
  return (
    <DocsArticle>
      <h1>Disparos</h1>
      <p>O módulo de disparos permite enviar campanhas de WhatsApp para um grupo de contatos de uma só vez.</p>
      <p>
        Diferente de uma conversa individual na Inbox, um disparo é pensado para alcançar um
        público segmentado, sempre a partir de um modelo de mensagem já aprovado.
      </p>

      <h2>Como funciona uma campanha de disparo</h2>
      <p>Montar uma campanha segue uma sequência simples:</p>
      <ol>
        {CAMPAIGN_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>
        Como os disparos dependem de <Link href="/docs/modelos">modelos</Link> aprovados, vale
        revisar essa página antes de planejar uma campanha.
      </p>

      <h2>Segmentação de público</h2>
      <p>Um disparo eficiente raramente é enviado para toda a base de contatos. A segmentação pode ser feita por:</p>
      <ul>
        {SEGMENTATION_CRITERIA.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Quanto mais organizada estiver a base em <Link href="/docs/contatos">contatos</Link>, mais
        preciso e relevante o disparo consegue ser.
      </p>

      <h2>Agendamento</h2>
      <p>
        Campanhas podem ser programadas para um horário específico, em vez de enviadas
        imediatamente. Isso permite planejar comunicações com antecedência e escolher o melhor
        momento para alcançar o público-alvo.
      </p>

      <h2>Acompanhamento dos resultados</h2>
      <p>Depois do envio, é possível acompanhar o desempenho da campanha, incluindo:</p>
      <ul>
        {TRACKING_POINTS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Esse acompanhamento ajuda a entender se o conteúdo, o horário e a segmentação escolhidos funcionaram bem.</p>

      <h2>Boas práticas de disparo</h2>
      <p>Para manter os disparos eficientes e bem recebidos pelos contatos:</p>
      <ul>
        {GOOD_PRACTICES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Responsabilidade no uso de disparos</h2>
      <p>Disparos em massa exigem responsabilidade. Vale lembrar que:</p>
      <ul>
        {RESPONSIBLE_USE.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>O foco de uma boa campanha não é alcançar o maior número de pessoas possível, e sim entregar a mensagem certa para quem realmente tem motivo para recebê-la.</p>

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

      <DocsPager currentHref="/docs/disparos" />
    </DocsArticle>
  );
}
