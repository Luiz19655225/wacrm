import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Automações",
  description:
    "Como funcionam as automações no WAVON: gatilhos, ações, regras, espera com Wait e o papel das automações no atendimento híbrido.",
};

const TRIGGER_EXAMPLES = [
  "nova mensagem recebida",
  "primeiro contato de um lead",
  "palavra-chave específica na conversa",
  "novo contato criado",
  "tag aplicada",
  "horário do dia",
  "atribuição de conversa",
];

const ACTION_EXAMPLES = [
  "responder automaticamente",
  "aplicar ou remover tag",
  "atribuir a conversa a um responsável",
  "atualizar dados do contato",
  "criar uma negociação",
  "esperar um período antes de continuar, com Wait",
  "disparar um webhook para outro sistema",
  "encerrar a conversa",
];

const WAIT_USES = [
  "aguardar antes de enviar um follow-up",
  "retomar uma conversa em outro horário",
  "dar tempo para o cliente responder antes da próxima etapa",
  "organizar lembretes espaçados",
];

const HYBRID_ROLE = [
  "responder o primeiro contato enquanto a equipe não está disponível",
  "aplicar regras por horário comercial",
  "distribuir conversas entre atendentes",
  "preparar o histórico antes da passagem para um humano",
];

const GOOD_PRACTICES = [
  "começar com poucas automações, mas com objetivo claro",
  "testar cada automação antes de ativá-la para todos os contatos",
  "evitar regras conflitantes entre si",
  "documentar o que cada automação faz, para a própria equipe",
  "revisar automações periodicamente conforme a operação muda",
];

const NEXT_STEPS = [
  { href: "/docs/fluxos", label: "Fluxos" },
  { href: "/docs/atendimento-hibrido", label: "Atendimento híbrido" },
  { href: "/docs/agente-de-ia", label: "Agente de IA" },
  { href: "/docs/inbox", label: "Inbox" },
];

export default function AutomacoesDocsPage() {
  return (
    <DocsArticle>
      <h1>Automações</h1>
      <p>Automações são regras que executam ações automáticas a partir de eventos da operação.</p>
      <p>
        Elas existem para reduzir trabalho manual repetitivo, padronizar respostas e garantir que
        situações previsíveis do atendimento sejam tratadas de forma consistente, mesmo sem
        intervenção humana direta.
      </p>

      <h2>Como uma automação funciona</h2>
      <p>Toda automação parte de um gatilho e executa uma ou mais ações. Exemplos de gatilhos disponíveis:</p>
      <ul>
        {TRIGGER_EXAMPLES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>A partir de um gatilho, a automação pode executar ações como:</p>
      <ul>
        {ACTION_EXAMPLES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>
        A etapa <code>Wait</code>
      </h2>
      <p>
        O <code>Wait</code> é uma etapa especial que pausa a execução de uma automação por um
        período definido e retoma depois automaticamente. Ela é útil para:
      </p>
      <ul>
        {WAIT_USES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Diferença entre automações e fluxos</h2>
      <p>
        Automações e <Link href="/docs/fluxos">fluxos</Link> resolvem problemas diferentes, mesmo
        compartilhando alguns recursos.
      </p>
      <p>
        Automações funcionam como regras de fundo: reagem a um evento e executam uma ação, sem
        necessariamente envolver uma conversa guiada com o contato. Já os fluxos estruturam o
        diálogo em si, com menus, perguntas e coleta de dados ao longo da interação.
      </p>
      <p>Na prática, é comum usar os dois em conjunto: um fluxo conduz a conversa, enquanto automações cuidam de tags, distribuição, follow-up e regras por horário ao redor dela.</p>

      <h2>Organização de processos</h2>
      <p>Automações ajudam a organizar processos que, de outra forma, dependeriam de alguém lembrar de executá-los manualmente, como aplicar uma tag, distribuir uma conversa ou retomar um contato depois de um tempo.</p>

      <h2>Papel no atendimento híbrido</h2>
      <p>
        No modelo de <Link href="/docs/atendimento-hibrido">atendimento híbrido</Link>, as
        automações ajudam a:
      </p>
      <ul>
        {HYBRID_ROLE.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>Elas não substituem a equipe, mas garantem que nenhuma etapa previsível do processo dependa exclusivamente de ação manual.</p>

      <h2>Boas práticas</h2>
      <p>Para manter as automações úteis e fáceis de manter:</p>
      <ul>
        {GOOD_PRACTICES.map((item) => (
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

      <DocsPager currentHref="/docs/automacoes" />
    </DocsArticle>
  );
}
