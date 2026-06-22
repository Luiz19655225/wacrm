import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description:
    "Dúvidas comuns sobre o WAVON: atendimento híbrido, automações, agente de IA, equipe e operação de atendimento pelo WhatsApp.",
};

const GETTING_STARTED_ORDER = [
  "entender a visão geral",
  "acessar a Inbox",
  "organizar os Contatos",
  "montar o funil de Negociações",
  "definir tags e regras",
  "criar Fluxos",
  "criar Automações",
  "estruturar o Atendimento híbrido",
];

const NEXT_STEPS = [
  { href: "/docs/primeiros-passos", label: "Primeiros passos" },
  { href: "/docs/atendimento-hibrido", label: "Atendimento híbrido" },
  { href: "/docs/agente-de-ia", label: "Agente de IA" },
  { href: "/docs/fluxos", label: "Fluxos" },
  { href: "/docs/automacoes", label: "Automações" },
];

export default function FaqPage() {
  return (
    <DocsArticle>
      <h1>FAQ do WAVON</h1>
      <p>
        Abaixo estão algumas das dúvidas mais comuns sobre o funcionamento do WAVON, sua operação
        no WhatsApp e o modelo de atendimento híbrido.
      </p>

      <h3>O que é o WAVON?</h3>
      <p>
        O WAVON é um CRM com WhatsApp para empresas que atendem, qualificam e vendem pelo
        WhatsApp. Ele reúne conversas, contatos, negociações, automações e equipe em uma única
        plataforma.
      </p>

      <h3>O WAVON é só uma caixa de entrada?</h3>
      <p>Não. A Inbox é uma parte importante da operação, mas o WAVON vai além dela.</p>
      <p>A plataforma inclui também:</p>
      <ul>
        <li>contatos</li>
        <li>negociações</li>
        <li>modelos de mensagem</li>
        <li>disparos</li>
        <li>automações</li>
        <li>fluxos</li>
        <li>equipe e permissões</li>
      </ul>

      <h3>O WAVON funciona com atendimento em equipe?</h3>
      <p>
        Sim. A plataforma já suporta uma operação com membros, papéis e permissões, permitindo que
        a conta deixe de ser individual e passe a funcionar como espaço compartilhado.
      </p>

      <h3>Posso usar o WAVON com mais de um atendente?</h3>
      <p>
        Sim. O sistema foi desenhado para operação compartilhada, com histórico centralizado,
        visibilidade da conversa e controle por funções de acesso.
      </p>

      <h3>O WAVON tem CRM de verdade?</h3>
      <p>Sim. O WAVON não se limita ao atendimento. Ele também trabalha com:</p>
      <ul>
        <li>contatos</li>
        <li>histórico</li>
        <li>tags</li>
        <li>negociações</li>
        <li>estágios de funil</li>
        <li>valores e responsáveis</li>
      </ul>

      <h3>Dá para organizar funil de vendas?</h3>
      <p>
        Sim. A plataforma já documenta pipelines com etapas, cards de negócio, valores,
        responsáveis e status como ganho ou perdido.
      </p>

      <h3>O WAVON faz automações?</h3>
      <p>Sim. O módulo de automações foi desenhado para responder a eventos como:</p>
      <ul>
        <li>nova mensagem</li>
        <li>primeiro contato</li>
        <li>palavra-chave</li>
        <li>tag aplicada</li>
        <li>horário</li>
        <li>atribuição de conversa</li>
      </ul>
      <p>
        Essas automações podem executar ações como resposta, distribuição, tag, criação de
        negócio, webhook, espera e continuidade operacional.
      </p>

      <h3>
        O que é o <code>Wait</code> nas automações?
      </h3>
      <p>
        O <code>Wait</code> é a etapa que pausa uma automação por um tempo e faz a execução
        continuar depois. Isso é útil para follow-up, lembretes, retomada em outro horário e
        operação fora do expediente.
      </p>

      <h3>O WAVON permite pré-atendimento?</h3>
      <p>
        Sim. A base de Fluxos já permite criar atendimento guiado com menus, botões, listas,
        coleta de dados, condições e handoff para humano.
      </p>

      <h3>O WAVON tem agente de IA pronto?</h3>
      <p>O posicionamento correto é: o WAVON está sendo estruturado para atendimento híbrido com IA e humano.</p>
      <p>A base atual já permite construir triagem, coleta de informações, lógica de direcionamento, handoff e follow-up — principalmente com Fluxos e Automações.</p>

      <h3>Então o que a IA faz no WAVON?</h3>
      <p>A IA no WAVON deve ser entendida como uma camada de atendimento inicial, qualificação e organização de contexto. Ela pode ajudar a:</p>
      <ul>
        <li>responder o primeiro contato</li>
        <li>coletar dados</li>
        <li>qualificar o lead</li>
        <li>identificar intenção</li>
        <li>direcionar para humano</li>
        <li>sustentar atendimento fora do horário</li>
        <li>registrar contexto no CRM</li>
      </ul>

      <h3>O humano continua importante?</h3>
      <p>Sim. O WAVON não foi pensado para eliminar a equipe, mas para melhorar o momento em que ela entra.</p>
      <p>O modelo recomendado é: IA no primeiro contato, humano quando houver necessidade comercial, relacional ou decisória, e CRM acompanhando a jornada inteira.</p>

      <h3>O WAVON funciona fora do horário comercial?</h3>
      <p>Sim, desde que a operação seja organizada para isso. Na prática, o WAVON pode ser usado para responder inicialmente, orientar o cliente, registrar o contato, aplicar regra de retorno e preparar a retomada da equipe.</p>

      <h3>Posso usar mensagens aprovadas pela Meta?</h3>
      <p>
        Sim. A plataforma documenta o uso de <Link href="/docs/modelos">modelos</Link> para
        mensagens fora da janela de 24 horas, com criação, envio, acompanhamento e uso em Inbox,
        Automações e Disparos.
      </p>

      <h3>Posso enviar campanhas em massa?</h3>
      <p>
        Sim. O módulo de <Link href="/docs/disparos">disparos</Link> permite trabalhar com
        templates aprovados, seleção de audiência, personalização, agendamento e rastreamento por
        destinatário.
      </p>

      <h3>O WAVON serve para suporte ou só para vendas?</h3>
      <p>Serve para ambos. A mesma estrutura pode ser usada para atendimento comercial, pré-vendas, suporte, relacionamento com clientes e pós-venda. O que muda é como os fluxos, automações, tags e funis são organizados.</p>

      <h3>Dá para usar tags e segmentação?</h3>
      <p>Sim. Tags podem ser usadas em contatos, Inbox, Disparos, Fluxos e Automações.</p>

      <h3>O WAVON guarda histórico das conversas?</h3>
      <p>
        Sim. A <Link href="/docs/inbox">Inbox</Link> foi projetada como histórico operacional de
        conversas, com mensagens, contexto e visão do contato.
      </p>

      <h3>O WAVON exige equipe grande?</h3>
      <p>Não. Ele pode funcionar com operação pequena e crescer conforme o time aumenta. A plataforma nasce como espaço individual, mas já suporta expansão para ambiente compartilhado com membros e permissões.</p>

      <h3>Como começar a usar o WAVON da forma certa?</h3>
      <p>A recomendação é:</p>
      <ol>
        {GETTING_STARTED_ORDER.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>

      <h2>Onde devo ir depois desta página?</h2>
      <p>Depois do FAQ, os melhores próximos passos são:</p>
      <ul>
        {NEXT_STEPS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="font-semibold">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <DocsPager currentHref="/docs/faq" />
    </DocsArticle>
  );
}
