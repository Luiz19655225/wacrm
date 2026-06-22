import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Modelos",
  description:
    "Como usar modelos de mensagem aprovados no WAVON: quando são necessários, como criar, aprovar e aplicar em atendimento, automações e disparos.",
};

const WHEN_NEEDED = [
  "quando já se passaram mais de 24 horas desde a última mensagem do cliente",
  "ao iniciar uma conversa que o cliente não começou",
  "em lembretes, avisos e confirmações enviados proativamente",
  "em campanhas e disparos para uma lista de contatos",
];

const CREATION_STEPS = [
  "escrever o texto do modelo, com variáveis quando necessário",
  "definir a categoria da mensagem",
  "enviar para aprovação",
  "aguardar a análise antes de usar o modelo em produção",
];

const OPERATIONAL_USES = [
  "retomar uma conversa parada na Inbox",
  "confirmar agendamentos ou pagamentos",
  "enviar lembretes de follow-up",
  "responder automaticamente fora da janela de 24 horas, via automações",
  "alimentar campanhas de disparo para públicos segmentados",
];

const CARE_POINTS = [
  "manter o texto alinhado exatamente ao que foi aprovado",
  "usar variáveis apenas quando fizerem sentido para o contexto",
  "evitar criar um modelo novo para cada pequena variação de texto",
  "revisar modelos periodicamente e desativar os que não são mais usados",
  "lembrar que o conteúdo aprovado não pode ser alterado livremente depois",
];

const NEXT_STEPS = [
  { href: "/docs/disparos", label: "Disparos" },
  { href: "/docs/inbox", label: "Inbox" },
  { href: "/docs/automacoes", label: "Automações" },
];

export default function ModelosDocsPage() {
  return (
    <DocsArticle>
      <h1>Modelos</h1>
      <p>Modelos são mensagens pré-aprovadas usadas para iniciar ou retomar conversas pelo WhatsApp.</p>
      <p>
        Eles existem porque, fora da janela de atendimento ativo, não é possível enviar mensagens
        de texto livre para um contato. Os modelos são a forma estruturada e aprovada de continuar
        a comunicação nesses casos.
      </p>

      <h2>Quando um modelo é necessário</h2>
      <p>Na prática, modelos costumam ser usados:</p>
      <ul>
        {WHEN_NEEDED.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Dentro da janela de 24 horas após uma mensagem do cliente, o atendimento pode continuar normalmente, sem depender de um modelo.</p>

      <h2>Como um modelo é criado</h2>
      <p>A criação de um modelo segue um processo simples, mas com uma etapa de aprovação que precisa ser respeitada:</p>
      <ol>
        {CREATION_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>Enquanto um modelo está em análise, ele ainda não pode ser usado em conversas reais. Só depois de aprovado é que passa a ficar disponível na operação.</p>

      <h2>Uso operacional dos modelos</h2>
      <p>Depois de aprovados, os modelos passam a sustentar diferentes pontos da operação:</p>
      <ul>
        {OPERATIONAL_USES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Eles aparecem integrados à <Link href="/docs/inbox">Inbox</Link>, às{" "}
        <Link href="/docs/automacoes">automações</Link> e aos <Link href="/docs/disparos">disparos</Link>,
        o que permite reaproveitar o mesmo conteúdo aprovado em diferentes momentos da jornada.
      </p>

      <h2>Cuidados ao trabalhar com modelos</h2>
      <p>Para manter o uso de modelos saudável e dentro das regras, é importante:</p>
      <ul>
        {CARE_POINTS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Modelos como padronização de comunicação</h2>
      <p>
        Além de resolver uma necessidade técnica, os modelos ajudam a padronizar a comunicação da
        empresa. Mensagens de follow-up, confirmação e retomada passam a seguir um texto revisado e
        consistente, em vez de depender da redação individual de cada atendente.
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

      <DocsPager currentHref="/docs/modelos" />
    </DocsArticle>
  );
}
