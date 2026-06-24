import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Agente de IA",
  description:
    "O papel do agente de IA no WAVON: pré-atendimento, qualificação de leads e handoff para a equipe humana, integrado ao CRM com WhatsApp.",
};

const FUNCTIONS = [
  "responder o primeiro contato",
  "conduzir o pré-atendimento",
  "coletar informações iniciais",
  "qualificar o lead",
  "identificar contexto e intenção",
  "direcionar a conversa",
  "preparar o handoff para humano",
  "apoiar o agendamento fora do horário",
  "registrar contexto no CRM",
];

const POSITIONING = ["IA antes do humano", "CRM durante toda a jornada", "humano no momento certo"];

const CRM_INTEGRATION = [
  "contatos",
  "histórico da conversa",
  "tags",
  "negociações",
  "status de atendimento",
  "follow-up",
  "contexto para o humano que assume depois",
];

const USE_CASES = [
  "recepção inicial de leads",
  "triagem por assunto",
  "coleta de nome, empresa, interesse ou urgência",
  "direcionamento para vendas, suporte ou pós-venda",
  "resposta inicial fora do horário comercial",
  "preparação do handoff para o humano",
  "apoio em rotinas de follow-up",
];

const BUSINESS_HOURS_ROLE = [
  "organizar o início da conversa",
  "qualificar o lead",
  "encaminhar para o humano responsável",
  "entregar contexto para continuidade",
];

const AFTER_HOURS_ROLE = [
  "informar o horário de atendimento",
  "responder dúvidas iniciais",
  "registrar a necessidade do contato",
  "organizar o retorno",
  "deixar a equipe preparada para a retomada",
];

const COMMUNICATION_PHRASES = [
  "Pré-atendimento com IA e handoff para humano",
  "IA no primeiro contato, equipe no momento certo",
  "Atendimento inteligente integrado ao CRM",
  "Triagem, qualificação e transferência com contexto",
];

const AVOID_PHRASES = ["“a IA faz tudo”", "“substitui sua equipe”", "“resolve qualquer conversa sozinha”", "“é um chatbot mágico”"];

const NEXT_STEPS = [
  { href: "/docs/atendimento-hibrido", label: "Atendimento híbrido" },
  { href: "/docs/fluxos", label: "Fluxos" },
  { href: "/docs/automacoes", label: "Automações" },
  { href: "/docs/inbox", label: "Inbox" },
];

export default function AgenteDeIaPage() {
  return (
    <DocsArticle>
      <h1>Agente de IA no WAVON</h1>
      <p>O agente de IA do WAVON deve ser entendido como uma camada de atendimento inteligente integrada ao CRM.</p>
      <p>
        Ele não existe como um recurso isolado ou desconectado da operação. Sua função principal é
        acelerar o primeiro contato, organizar a triagem e preparar a conversa para o momento em
        que o time humano precise assumir.
      </p>

      <h2>O que o agente de IA faz</h2>
      <p>No WAVON, o agente de IA foi pensado para atuar principalmente no início da jornada do lead ou cliente.</p>
      <p>Entre suas funções mais importantes estão:</p>
      <ul>
        {FUNCTIONS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>O que ele não deve prometer</h2>
      <p>O agente de IA do WAVON não deve ser apresentado como uma &quot;IA universal&quot; ou como substituto total da equipe.</p>
      <p>O posicionamento correto é:</p>
      <ul>
        {POSITIONING.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Isso torna a proposta mais forte, mais realista e mais sustentável para a operação.</p>

      <h2>Diferença entre o agente de IA e a automação tradicional</h2>
      <p>
        A base funcional do WAVON ainda não inclui um agente de IA conversacional livre como
        componente nativo pronto. O que já existe hoje, e sustenta boa parte do pré-atendimento,
        são:
      </p>
      <ul>
        <li><strong>Fluxos</strong>, para conversas guiadas, coleta de dados e handoff</li>
        <li><strong>Automações</strong>, para gatilhos, regras, tags, atribuição, webhook, condições e <code>Wait</code></li>
      </ul>
      <p>
        Ou seja: a base funcional já suporta uma boa parte da estrutura de pré-atendimento e
        transferência, mas ainda não é um agente conversacional completo por si só.
      </p>
      <p>No WAVON, o agente de IA é posicionado como uma evolução sobre essa base.</p>

      <h2>Como o agente se integra ao CRM</h2>
      <p>O diferencial do agente de IA no WAVON não é apenas responder mensagens. É responder com contexto e gerar organização operacional.</p>
      <p>A integração com o CRM permite que o atendimento ajude a alimentar:</p>
      <ul>
        {CRM_INTEGRATION.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Isso faz com que a conversa não se perca quando sai da automação e entra na mão da equipe.</p>

      <h2>Como o agente se integra à operação</h2>
      <p>No fluxo operacional do WAVON, o agente de IA atua junto com:</p>
      <ul>
        <li><Link href="/docs/inbox">Inbox</Link> — centraliza a conversa</li>
        <li><Link href="/docs/contatos">Contatos</Link> — organizam o lead</li>
        <li><Link href="/docs/negociacoes">Negociações</Link> — acompanham a oportunidade</li>
        <li><Link href="/docs/fluxos">Fluxos</Link> — estruturam a conversa guiada e o handoff</li>
        <li><Link href="/docs/automacoes">Automações</Link> — executam regras, distribuição e continuidade</li>
      </ul>

      <h2>Casos de uso do agente de IA</h2>
      <p>Alguns usos típicos do agente de IA no WAVON:</p>
      <ul>
        {USE_CASES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Papel no horário comercial</h2>
      <p>Durante o horário comercial, o agente pode:</p>
      <ul>
        {BUSINESS_HOURS_ROLE.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Nesse cenário, a IA trabalha para reduzir tempo de resposta e melhorar a qualidade da passagem de bastão.</p>

      <h2>Papel fora do horário</h2>
      <p>Fora do horário comercial, o agente pode:</p>
      <ul>
        {AFTER_HOURS_ROLE.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Essa lógica conversa diretamente com o uso de automações com condição por horário e etapas com <code>Wait</code>, que já fazem parte da base funcional.</p>

      <h2>O papel do handoff</h2>
      <p>O handoff é uma peça central no posicionamento do agente de IA do WAVON.</p>
      <p>A automação não existe para terminar toda conversa sozinha. Ela existe para:</p>
      <ul>
        <li>ganhar velocidade</li>
        <li>reduzir atrito</li>
        <li>aumentar organização</li>
        <li>transferir melhor</li>
      </ul>
      <p>Na estrutura dos Fluxos, o handoff marca a conversa como pendente para um humano assumir.</p>
      <p>No WAVON, esse handoff deve ser tratado como parte natural da jornada de atendimento.</p>

      <h2>O que diferencia o agente de IA do WAVON</h2>
      <p>O diferencial do agente de IA do WAVON está em três pontos:</p>

      <h3>1. Ele nasce dentro da operação</h3>
      <p>Não é um bot isolado. Ele faz parte do CRM, da rotina e do histórico.</p>

      <h3>2. Ele prepara o humano</h3>
      <p>A IA não joga a conversa &quot;crua&quot; para a equipe. Ela organiza contexto, intenção, dados e direção.</p>

      <h3>3. Ele sustenta continuidade</h3>
      <p>Mesmo fora do horário, o lead não fica sem resposta e a operação não perde contexto.</p>

      <h2>Como comunicar isso ao cliente final</h2>
      <p>As melhores formas de apresentar o agente de IA do WAVON são:</p>
      <ul>
        {COMMUNICATION_PHRASES.map((item) => (
          <li key={item}>
            <strong>{item}</strong>
          </li>
        ))}
      </ul>

      <h2>O que evitar na comunicação</h2>
      <p>Evite frases como:</p>
      <ul>
        {AVOID_PHRASES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>O posicionamento mais forte e mais honesto é: pré-atendimento, qualificação, direcionamento, handoff, registro no CRM.</p>

      <h2>Resumo executivo</h2>
      <p>O agente de IA do WAVON é uma camada de atendimento inteligente integrada ao CRM, desenhada para:</p>
      <ul>
        <li>responder primeiro</li>
        <li>organizar o contexto</li>
        <li>qualificar leads</li>
        <li>melhorar a passagem para o humano</li>
        <li>sustentar atendimento fora do horário</li>
        <li>registrar tudo de forma operacional</li>
      </ul>
      <p>
        Ele amplia a base funcional de Fluxos e Automações da estrutura original e transforma
        esses recursos em uma experiência de atendimento híbrido com identidade própria do WAVON.
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

      <DocsPager currentHref="/docs/agente-de-ia" />
    </DocsArticle>
  );
}
