import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Atendimento híbrido",
  description:
    "Como o WAVON combina automação e equipe humana no atendimento pelo WhatsApp, do pré-atendimento ao fechamento, dentro e fora do horário comercial.",
};

const FLOW_STEPS = [
  "o lead chega por anúncio, site ou WhatsApp",
  "o sistema inicia o primeiro atendimento",
  "a conversa coleta ou organiza informações",
  "o lead é qualificado",
  "a conversa é direcionada",
  "um humano assume, ou o retorno é agendado",
  "tudo fica salvo no CRM",
];

const AUTOMATION_EXAMPLES = [
  "saudação inicial",
  "triagem por assunto",
  "coleta de dados",
  "aplicação de tags",
  "criação de negócio",
  "distribuição por agente",
  "follow-up automático",
  "resposta fora do horário",
  "espera com retomada depois",
];

const HUMAN_MOMENTS = [
  "negociação",
  "venda",
  "decisão comercial",
  "exceção operacional",
  "suporte mais sensível",
  "análise fora do padrão",
];

const CRM_RECORD = [
  "quem entrou em contato",
  "quando entrou",
  "por qual canal chegou",
  "qual foi o motivo da conversa",
  "em que etapa está",
  "que tags foram aplicadas",
  "se virou oportunidade",
  "quando deve haver follow-up",
  "quem assumiu o atendimento",
];

const AVOID = [
  "automatizar sem contexto",
  "mandar tudo para o humano sem triagem",
  "manter a equipe sem padrão de passagem",
  "criar menus longos demais",
  "operar sem tags, critérios ou etapas definidas",
  "prometer que a automação resolve tudo sozinha",
];

const GETTING_STARTED = [
  "desenhar a jornada principal",
  "definir o que a automação pode fazer",
  "definir quando o humano entra",
  "configurar tags e etapas comerciais",
  "criar um fluxo simples de triagem",
  "criar uma automação simples de follow-up",
  "testar a operação com poucos cenários reais",
];

const NEXT_STEPS = [
  { href: "/docs/fluxos", label: "Fluxos" },
  { href: "/docs/automacoes", label: "Automações" },
  { href: "/docs/agente-de-ia", label: "Agente de IA" },
  { href: "/docs/inbox", label: "Inbox" },
];

export default function AtendimentoHibridoPage() {
  return (
    <DocsArticle>
      <h1>Atendimento híbrido no WAVON</h1>
      <p>O atendimento híbrido é o modelo operacional central do WAVON.</p>
      <p>Em vez de depender apenas da equipe humana ou de uma automação isolada, o WAVON combina:</p>
      <ul>
        <li>atendimento inicial estruturado</li>
        <li>lógica automatizada</li>
        <li>passagem para o humano</li>
        <li>registro completo dentro do CRM</li>
      </ul>
      <p>
        Esse modelo foi pensado para empresas que precisam responder rápido, manter padrão no
        primeiro contato e não perder oportunidades fora do horário comercial.
      </p>

      <h2>O que é atendimento híbrido</h2>
      <p>No WAVON, atendimento híbrido significa combinar automação e operação humana dentro da mesma jornada.</p>
      <p>
        A automação pode cuidar do início da conversa, da coleta de dados e da triagem. O time
        humano entra quando há necessidade de análise, negociação, fechamento, suporte mais
        sensível ou continuidade comercial.
      </p>
      <p>
        Essa lógica está alinhada com os módulos de{" "}
        <Link href="/docs/inbox">Inbox</Link>, <Link href="/docs/fluxos">Fluxos</Link> e{" "}
        <Link href="/docs/automacoes">Automações</Link>.
      </p>

      <h2>Por que esse modelo funciona</h2>
      <p>Muitas empresas têm dois problemas ao mesmo tempo:</p>
      <ul>
        <li>demoram para responder</li>
        <li>perdem contexto quando o atendimento muda de mãos</li>
      </ul>
      <p>O atendimento híbrido resolve isso ao distribuir melhor o trabalho:</p>
      <ul>
        <li>a automação ganha velocidade</li>
        <li>o humano assume onde há valor de análise e relacionamento</li>
        <li>o CRM garante contexto e continuidade</li>
      </ul>

      <h2>Fluxo básico do atendimento híbrido</h2>
      <p>Um fluxo comum no WAVON segue esta ordem:</p>
      <ol>
        {FLOW_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h2>Onde a automação entra</h2>
      <p>A automação faz sentido principalmente em momentos previsíveis da jornada.</p>
      <p>Exemplos:</p>
      <ul>
        {AUTOMATION_EXAMPLES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        O sistema já oferece etapas como <code>Wait</code>, <code>Condition</code>,{" "}
        <code>Assign conversation</code>, <code>Add tag</code>, <code>Create deal</code> e{" "}
        <code>Send template</code>.
      </p>

      <h2>Onde o humano entra</h2>
      <p>O atendimento humano deve entrar quando a conversa exige:</p>
      <ul>
        {HUMAN_MOMENTS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>No WAVON, a automação não existe para esconder a equipe, mas para entregar contexto melhor para quem assume.</p>

      <h2>O papel dos Fluxos</h2>
      <p>
        Os <Link href="/docs/fluxos">Fluxos</Link> são especialmente importantes no atendimento
        híbrido porque permitem estruturar conversas guiadas com menus, botões, opções, coleta de
        input, condições e handoff.
      </p>
      <p>Na prática, isso permite construir: triagem inicial, captura de informações, menu por assunto, direcionamento para vendas, suporte ou pós-venda, e passagem organizada para um atendente humano.</p>

      <h2>O papel das Automações</h2>
      <p>As <Link href="/docs/automacoes">Automações</Link> entram para complementar a operação. Elas ajudam a:</p>
      <ul>
        <li>responder por palavra-chave</li>
        <li>marcar contatos</li>
        <li>distribuir conversas</li>
        <li>criar tarefas implícitas no CRM</li>
        <li>programar follow-up</li>
        <li>agir por horário</li>
        <li>retomar etapas após um tempo de espera</li>
      </ul>

      <h2>Horário comercial e fora do horário</h2>
      <p>Um dos usos mais importantes do atendimento híbrido é a diferenciação entre horário comercial e fora do horário.</p>
      <p>No modelo do WAVON:</p>
      <ul>
        <li>durante o horário comercial, o atendimento pode ser transferido para humano</li>
        <li>fora do horário, o sistema pode orientar o cliente e preparar o retorno</li>
      </ul>
      <p>As automações com condição por horário e etapas de espera dão suporte a essa lógica operacional.</p>

      <h2>O que deve ficar registrado no CRM</h2>
      <p>No atendimento híbrido, o CRM não é só um histórico passivo. Ele é a memória operacional da conversa.</p>
      <p>Idealmente, a jornada deve registrar:</p>
      <ul>
        {CRM_RECORD.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        A <Link href="/docs/inbox">Inbox</Link>, os <Link href="/docs/contatos">Contatos</Link> e
        as <Link href="/docs/negociacoes">Negociações</Link> sustentam esse registro dentro do
        sistema.
      </p>

      <h2>Quando o atendimento híbrido faz mais sentido</h2>
      <p>Esse modelo é especialmente útil para empresas que:</p>
      <ul>
        <li>recebem muitos leads</li>
        <li>anunciam com frequência</li>
        <li>atendem por WhatsApp todos os dias</li>
        <li>têm equipe comercial ou de suporte</li>
        <li>precisam responder rápido</li>
        <li>não querem perder oportunidades fora do expediente</li>
      </ul>

      <h2>O que evitar</h2>
      <p>Ao implantar atendimento híbrido, evite:</p>
      <ul>
        {AVOID.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Como começar no WAVON</h2>
      <p>A forma mais segura de começar é:</p>
      <ol>
        {GETTING_STARTED.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>

      <h2>Resumo executivo</h2>
      <p>O atendimento híbrido no WAVON combina:</p>
      <ul>
        <li>velocidade no primeiro contato</li>
        <li>organização no CRM</li>
        <li>contexto para a equipe</li>
        <li>continuidade comercial</li>
      </ul>
      <p>Em vez de escolher entre IA ou humano, o WAVON organiza os dois dentro de uma mesma operação.</p>

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

      <DocsPager currentHref="/docs/atendimento-hibrido" />
    </DocsArticle>
  );
}
