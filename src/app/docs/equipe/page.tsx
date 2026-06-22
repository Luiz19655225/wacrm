import type { Metadata } from "next";
import Link from "next/link";
import { DocsArticle } from "@/components/docs/docs-article";
import { DocsPager } from "@/components/docs/docs-pager";

export const metadata: Metadata = {
  title: "Equipe",
  description:
    "Como gerenciar membros, convites, papéis e permissões no WAVON, organizando a colaboração e o controle de acesso da operação em equipe.",
};

const ROLES = [
  { title: "Owner", description: "acesso total à conta, incluindo configurações sensíveis e gestão da equipe." },
  { title: "Admin", description: "acesso amplo à operação e às configurações, com algumas restrições em relação ao Owner." },
  { title: "Agent", description: "foco no atendimento do dia a dia, com acesso a Inbox, contatos e negociações." },
  { title: "Viewer", description: "acesso de visualização, sem permissão para alterar dados da operação." },
];

const INVITE_STEPS = [
  "acessar a área de equipe nas configurações",
  "enviar o convite para o e-mail do novo membro",
  "definir o papel de acesso do convidado",
  "aguardar a confirmação do convite",
];

const COLLABORATION_BENEFITS = [
  "mais de uma pessoa pode atender ao mesmo tempo, sem conflito",
  "cada conversa pode ter um responsável claro",
  "o histórico fica visível para todos os membros autorizados",
  "a operação não depende de uma única pessoa para funcionar",
];

const ACCESS_CONTROL = [
  "limitar configurações sensíveis a Owners e Admins",
  "revisar periodicamente quem ainda faz parte da equipe",
  "remover acessos de membros que não fazem mais parte da operação",
  "ajustar o papel de um membro conforme sua função muda",
];

const NEXT_STEPS = [
  { href: "/docs/configuracoes", label: "Configurações" },
  { href: "/docs/inbox", label: "Inbox" },
  { href: "/docs/automacoes", label: "Automações" },
];

export default function EquipeDocsPage() {
  return (
    <DocsArticle>
      <h1>Equipe</h1>
      <p>A área de equipe organiza a colaboração entre as pessoas que atuam na operação do WAVON.</p>
      <p>
        Em vez de uma conta de uso individual, o WAVON foi pensado para crescer junto com a
        empresa, permitindo convidar membros, definir papéis e controlar o que cada pessoa pode
        acessar.
      </p>

      <h2>Papéis de acesso</h2>
      <p>Cada membro da equipe recebe um papel, que define o que pode fazer dentro do sistema:</p>
      {ROLES.map((role) => (
        <div key={role.title}>
          <h3>{role.title}</h3>
          <p>{role.description}</p>
        </div>
      ))}
      <p>Essa divisão permite que a operação cresça sem perder controle sobre quem pode alterar o quê.</p>

      <h2>Convidando novos membros</h2>
      <p>Adicionar uma pessoa à equipe segue um processo simples:</p>
      <ol>
        {INVITE_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h2>Colaboração na operação</h2>
      <p>Trabalhar em equipe dentro do WAVON traz benefícios diretos para o atendimento e para a gestão comercial:</p>
      <ul>
        {COLLABORATION_BENEFITS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Essa colaboração fica mais visível na <Link href="/docs/inbox">Inbox</Link>, onde
        conversas podem ser atribuídas e acompanhadas por diferentes membros da equipe.
      </p>

      <h2>Controle de acesso</h2>
      <p>Manter o controle de acesso organizado é importante para a segurança e a clareza da operação. Algumas práticas recomendadas:</p>
      <ul>
        {ACCESS_CONTROL.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Equipe e crescimento da operação</h2>
      <p>
        O WAVON pode funcionar com uma operação pequena, de uma única pessoa, e crescer conforme a
        necessidade aumenta. A gestão de equipe é o que permite essa transição, sem exigir
        reestruturação da conta quando novos membros entram.
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

      <DocsPager currentHref="/docs/equipe" />
    </DocsArticle>
  );
}
