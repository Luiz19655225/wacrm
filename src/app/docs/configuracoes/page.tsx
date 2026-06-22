import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Configurações",
  description:
    "Como ajustar a área de configurações do WAVON: perfil, conexão com WhatsApp, aparência, tags, modelos, negociações e demais parâmetros da operação.",
};

const SETTINGS_AREAS = [
  { title: "Perfil", description: "dados da conta e preferências individuais de quem acessa o sistema." },
  { title: "Conexão com WhatsApp", description: "configuração do número e canal usado pela operação." },
  { title: "Aparência", description: "ajustes visuais da conta dentro da plataforma." },
  { title: "Tags", description: "criação e organização das tags usadas em contatos, conversas e campanhas." },
  { title: "Modelos", description: "gestão dos modelos de mensagem aprovados, usados em atendimento, automações e disparos." },
  { title: "Negociações", description: "parâmetros do funil comercial, como etapas e moeda padrão." },
  { title: "Equipe", description: "gestão de membros, papéis e permissões de acesso." },
];

const INITIAL_PRIORITIES = [
  "conexão com WhatsApp",
  "criação das tags principais",
  "moeda padrão da operação",
  "estrutura do funil de negociações",
  "revisão dos membros da equipe",
];

const ADMIN_PRACTICES = [
  "revisar configurações sempre que a operação crescer ou mudar de processo",
  "evitar alterar parâmetros centrais sem avisar a equipe",
  "manter tags e modelos organizados, sem duplicações",
  "checar a conexão com o WhatsApp periodicamente",
];

const NEXT_STEPS = [
  { href: "/docs/equipe", label: "Equipe" },
  { href: "/docs/modelos", label: "Modelos" },
  { href: "/docs/contatos", label: "Contatos" },
];

export default function ConfiguracoesDocsPage() {
  return (
    <DocsArticle>
      <h1>Configurações</h1>
      <p>A área de configurações é o centro de ajuste operacional do WAVON.</p>
      <p>
        É nela que ficam reunidos os parâmetros que sustentam o funcionamento da conta: desde a
        conexão com o WhatsApp até a forma como tags, modelos e o funil comercial são organizados.
      </p>

      <h2>O que fica reunido nas configurações</h2>
      <p>A área de configurações centraliza diferentes frentes da operação:</p>
      {SETTINGS_AREAS.map((area) => (
        <div key={area.title}>
          <h3>{area.title}</h3>
          <p>{area.description}</p>
        </div>
      ))}

      <h2>Configurações como base da operação</h2>
      <p>
        Antes de colocar a operação completa em funcionamento, é nas configurações que ficam
        definidas as escolhas estruturais que afetam o restante do sistema, como a forma de
        organizar <Link href="/docs/contatos">contatos</Link>, conduzir{" "}
        <Link href="/docs/negociacoes">negociações</Link> e usar{" "}
        <Link href="/docs/modelos">modelos</Link> de mensagem.
      </p>

      <h2>Prioridades ao configurar a conta</h2>
      <p>No início da operação, vale priorizar:</p>
      <ul>
        {INITIAL_PRIORITIES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Administração contínua</h2>
      <p>Configurações não são algo definido uma única vez. Conforme a operação evolui, é comum revisitar essa área. Algumas práticas recomendadas:</p>
      <ul>
        {ADMIN_PRACTICES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Quem pode alterar configurações</h2>
      <p>
        O acesso à área de configurações costuma depender do papel de cada membro da{" "}
        <Link href="/docs/equipe">equipe</Link>. Perfis com permissões administrativas têm acesso
        mais amplo, enquanto perfis operacionais ficam concentrados no atendimento do dia a dia.
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

      <DocsPager currentHref="/docs/configuracoes" />
    </DocsArticle>
  );
}
