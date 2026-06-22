import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Primeiros passos",
  description:
    "Guia inicial para configurar sua conta no WAVON: acesso, Inbox, contatos, negociações, automações e fluxos de atendimento.",
};

const RECOMMENDED_ORDER = [
  "acessar a conta",
  "entender a Inbox",
  "revisar os Contatos",
  "configurar o funil de Negociações",
  "organizar tags e campos essenciais",
  "estruturar Automações e Fluxos",
  "validar o atendimento híbrido",
];

const CHECKLIST = [
  "acesso ao sistema funcionando",
  "Inbox acessível",
  "conexão com WhatsApp revisada",
  "tags principais criadas",
  "funil comercial organizado",
  "equipe definida",
  "ao menos uma automação simples ativa",
  "ao menos um fluxo de triagem desenhado",
  "regra clara para passagem ao humano",
];

const COMMON_MISTAKES = [
  "querer automatizar tudo de uma vez",
  "criar muitas tags sem padrão",
  "deixar o funil sem responsável",
  "usar mensagens sem contexto",
  "transferir para humano sem histórico",
  "operar fora do horário sem regra definida",
];

const NEXT_STEPS = [
  { href: "/docs/inbox", label: "Inbox" },
  { href: "/docs/contatos", label: "Contatos" },
  { href: "/docs/automacoes", label: "Automações" },
  { href: "/docs/fluxos", label: "Fluxos" },
  { href: "/docs/atendimento-hibrido", label: "Atendimento híbrido" },
];

export default function PrimeirosPassosPage() {
  return (
    <DocsArticle>
      <h1>Primeiros passos no WAVON</h1>
      <p>
        Se esta é sua primeira vez no WAVON, este guia vai te mostrar a ordem mais simples para
        começar a usar a plataforma com segurança e clareza.
      </p>
      <p>
        O objetivo aqui não é configurar tudo de uma vez, mas montar uma operação funcional:
        receber conversas, organizar contatos, acompanhar negociações e estruturar o atendimento
        com automação e equipe.
      </p>

      <h2>O que é importante entender antes de começar</h2>
      <p>O WAVON foi pensado para empresas que usam o WhatsApp como canal principal de atendimento e vendas.</p>
      <p>Na prática, a operação costuma seguir este fluxo:</p>
      <ol>
        <li>o lead chega por anúncio, site ou WhatsApp</li>
        <li>a conversa entra no sistema</li>
        <li>o atendimento inicial pode ser organizado com fluxos e automações</li>
        <li>quando necessário, o atendimento passa para um humano</li>
        <li>tudo fica registrado em contatos, histórico e negociações</li>
      </ol>

      <h2>Ordem recomendada para começar</h2>
      <p>Se você quer subir sua operação com menos atrito, siga esta sequência:</p>
      <ol>
        {RECOMMENDED_ORDER.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h2>1. Acesse sua conta</h2>
      <p>
        Entre em <code>/login</code> com o usuário da sua operação.
      </p>
      <p>
        Depois do login, você será direcionado para o dashboard, que concentra visão geral da
        operação, indicadores e atalhos para os módulos principais.
      </p>
      <p>
        Se você estiver entrando como membro da equipe, o que poderá fazer dentro do sistema
        dependerá do seu papel de acesso. O modelo de permissões distingue perfis como{" "}
        <strong>Owner</strong>, <strong>Admin</strong>, <strong>Agent</strong> e{" "}
        <strong>Viewer</strong>.
      </p>

      <h2>2. Entenda a Inbox</h2>
      <p>
        A <Link href="/docs/inbox">Inbox</Link> é o centro operacional do WAVON. É onde as
        conversas do WhatsApp aparecem, são acompanhadas e podem ser tratadas pela equipe.
      </p>
      <p>A Inbox foi desenhada como um espaço compartilhado, com:</p>
      <ul>
        <li>lista de conversas</li>
        <li>histórico em tempo real</li>
        <li>status da conversa</li>
        <li>visão do contato</li>
        <li>ligação com tags, notas e negociações</li>
      </ul>
      <p>Ao começar, verifique:</p>
      <ul>
        <li>como as conversas aparecem</li>
        <li>quais status estão sendo usados</li>
        <li>quem da equipe será responsável por cada atendimento</li>
        <li>como o handoff entre automação e humano será tratado</li>
      </ul>

      <h2>3. Organize os Contatos</h2>
      <p>Todo atendimento consistente depende de uma boa base de contatos.</p>
      <p>
        No WAVON, os <Link href="/docs/contatos">contatos</Link> ajudam a registrar:
      </p>
      <ul>
        <li>nome</li>
        <li>telefone</li>
        <li>e-mail</li>
        <li>empresa</li>
        <li>tags</li>
        <li>histórico da relação com o lead ou cliente</li>
      </ul>
      <p>O sistema já suporta criação manual, criação automática a partir de novas mensagens e importação via CSV.</p>
      <p>Ao começar, vale definir:</p>
      <ul>
        <li>como os contatos serão nomeados</li>
        <li>quais tags serão usadas</li>
        <li>quais informações são obrigatórias na triagem inicial</li>
        <li>como o time vai diferenciar lead, cliente, suporte e oportunidades</li>
      </ul>

      <h2>4. Monte o seu funil de Negociações</h2>
      <p>O módulo de <Link href="/docs/negociacoes">negociações</Link> do WAVON permite organizar oportunidades em etapas comerciais.</p>
      <p>
        Isso é feito por pipelines, estágios e cards de negócio, com campos como valor,
        responsável, contato relacionado e status do negócio.
      </p>
      <p>Antes de operar, defina pelo menos:</p>
      <ul>
        <li>nome do funil principal</li>
        <li>etapas do processo comercial</li>
        <li>momento em que um lead vira oportunidade</li>
        <li>momento em que a equipe deve mover a negociação</li>
        <li>padrão para ganho, perda e acompanhamento</li>
      </ul>
      <p>Se sua empresa usa mais de um processo comercial, você pode trabalhar com mais de um funil.</p>

      <h2>5. Ajuste o essencial em Configurações</h2>
      <p>Antes de ativar a operação completa, revise as configurações principais da conta.</p>
      <p>
        A área de <Link href="/docs/configuracoes">configurações</Link> centraliza:
      </p>
      <ul>
        <li>perfil</li>
        <li>conexão com WhatsApp</li>
        <li>modelos de mensagem</li>
        <li>tags</li>
        <li>moeda padrão</li>
        <li>aparência</li>
        <li>equipe</li>
      </ul>
      <p>No início, priorize:</p>
      <ul>
        <li>conexão do WhatsApp</li>
        <li>criação das tags principais</li>
        <li>moeda padrão da operação</li>
        <li>aparência da conta</li>
        <li>revisão dos membros da equipe</li>
      </ul>

      <h2>6. Estruture suas Automações</h2>
      <p>Automações servem para executar ações automáticas com base em eventos.</p>
      <p>
        O sistema permite trabalhar com gatilhos como: nova mensagem, primeiro contato,
        palavra-chave, novo contato, tag aplicada, horário e atribuição de conversa.
      </p>
      <p>Essas automações podem:</p>
      <ul>
        <li>responder</li>
        <li>aplicar ou remover tag</li>
        <li>atribuir conversa</li>
        <li>atualizar contato</li>
        <li>criar negócio</li>
        <li>esperar com <code>Wait</code></li>
        <li>disparar webhook</li>
        <li>fechar conversa</li>
      </ul>
      <p>No início, uma boa estratégia é criar poucas automações, mas com objetivo claro: mensagem inicial, triagem, distribuição, follow-up, fora do horário.</p>

      <h2>7. Estruture seus Fluxos</h2>
      <p><Link href="/docs/fluxos">Fluxos</Link> são a base do pré-atendimento guiado no WAVON.</p>
      <p>Eles permitem criar conversas ramificadas com:</p>
      <ul>
        <li>menus</li>
        <li>botões</li>
        <li>listas</li>
        <li>coleta de dados</li>
        <li>condições</li>
        <li>aplicação de tags</li>
        <li>handoff para humano</li>
      </ul>
      <p>É por meio dos fluxos que você pode estruturar, por exemplo: uma triagem inicial, um FAQ guiado, uma captura de lead, uma passagem para o time comercial.</p>

      <h2>8. Defina como será o atendimento híbrido</h2>
      <p>No WAVON, a recomendação é trabalhar com um atendimento híbrido: parte da jornada estruturada com automação, parte da jornada assumida pela equipe humana.</p>
      <p>
        A base do sistema já oferece a estrutura necessária para isso com Fluxos, Automações,
        Inbox, Contatos e Negociações. Veja mais em{" "}
        <Link href="/docs/atendimento-hibrido">Atendimento híbrido</Link>.
      </p>
      <p>Antes de colocar isso em produção, responda:</p>
      <ul>
        <li>o que a automação pode resolver sozinha?</li>
        <li>quando a equipe precisa assumir?</li>
        <li>como o lead será qualificado?</li>
        <li>o que acontece fora do horário comercial?</li>
        <li>em que momento a oportunidade entra no funil?</li>
      </ul>

      <h2>Checklist inicial recomendado</h2>
      <p>Antes de considerar a operação pronta, confirme:</p>
      <ul>
        {CHECKLIST.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Erros mais comuns no começo</h2>
      <p>Ao iniciar a operação, evite:</p>
      <ul>
        {COMMON_MISTAKES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Próximo passo recomendado</h2>
      <p>Depois de concluir esta etapa, siga para:</p>
      <ul>
        {NEXT_STEPS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="font-semibold">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <DocsPager currentHref="/docs/primeiros-passos" />
    </DocsArticle>
  );
}
