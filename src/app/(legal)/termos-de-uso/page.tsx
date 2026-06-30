import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos e condições de uso da plataforma WAVON CRM — direitos, responsabilidades, pagamentos, cancelamento e legislação aplicável.",
  keywords: [
    "termos de uso",
    "termos e condições",
    "WAVON",
    "CRM WhatsApp",
    "contrato de uso",
    "SaaS Brasil",
    "LGPD",
  ],
  alternates: { canonical: "https://www.wavon.com.br/termos-de-uso" },
  openGraph: {
    title: "Termos de Uso — WAVON",
    description:
      "Termos e condições de uso da plataforma WAVON CRM.",
    url: "https://www.wavon.com.br/termos-de-uso",
    siteName: "WAVON",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Termos de Uso — WAVON",
    description: "Termos e condições de uso da plataforma WAVON CRM.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Termos de Uso — WAVON",
  description: "Termos e condições de uso da plataforma WAVON CRM.",
  url: "https://www.wavon.com.br/termos-de-uso",
  inLanguage: "pt-BR",
  publisher: {
    "@type": "Organization",
    name: "WAVON",
    url: "https://www.wavon.com.br",
  },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: "https://www.wavon.com.br" },
      { "@type": "ListItem", position: 2, name: "Termos de Uso", item: "https://www.wavon.com.br/termos-de-uso" },
    ],
  },
};

export default function TermosDeUsoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Início</Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground">Termos de Uso</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Termos de Uso
          </h1>
          <p className="mt-3 text-muted-foreground">
            Ao acessar ou utilizar o WAVON, você concorda integralmente com os presentes Termos.
            Leia com atenção antes de criar sua conta.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Última atualização: 30 de junho de 2026
          </p>
        </header>

        {/* Content */}
        <div className="space-y-10 text-sm leading-7 text-muted-foreground">

          <section id="objeto">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">1. Objeto</h2>
            <p>
              O <strong className="text-foreground">WAVON</strong> é uma plataforma de CRM omnichannel
              para WhatsApp, disponibilizada como Software como Serviço (SaaS) via internet no endereço
              <strong className="text-foreground"> https://www.wavon.com.br</strong>. Os presentes Termos
              regulam a relação entre o WAVON e qualquer pessoa física ou jurídica que acesse, teste ou
              contrate o serviço (&ldquo;<strong className="text-foreground">Usuário</strong>&rdquo;).
            </p>
          </section>

          <section id="elegibilidade">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">2. Elegibilidade</h2>
            <p>
              Para utilizar o WAVON, você deve:
            </p>
            <ul className="ml-4 mt-3 list-disc space-y-2">
              <li>Ser pessoa física com capacidade civil plena (18 anos ou mais) ou pessoa jurídica legalmente constituída no Brasil;</li>
              <li>Fornecer informações verdadeiras e atualizadas no cadastro;</li>
              <li>Ter autorização para representar a empresa caso crie uma conta corporativa;</li>
              <li>Possuir um número de WhatsApp Business válido e autorizado pela Meta para uso via API.</li>
            </ul>
          </section>

          <section id="criacao-conta">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">3. Criação de Conta</h2>
            <p>
              O acesso ao WAVON é realizado mediante cadastro com e-mail e senha. Você é responsável
              por manter a confidencialidade de suas credenciais e por todas as ações realizadas em sua conta.
              Em caso de suspeita de acesso não autorizado, notifique imediatamente{" "}
              <a href="mailto:comercial@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                comercial@wavon.com.br
              </a>.
            </p>
            <p className="mt-3">
              O WAVON permite a criação de contas de equipe (workspaces compartilhados). O administrador
              da conta é responsável pelo uso feito por todos os membros convidados.
            </p>
          </section>

          <section id="responsabilidades">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">4. Responsabilidades do Usuário</h2>
            <p>Ao utilizar o WAVON, você se compromete a:</p>
            <ul className="ml-4 mt-3 list-disc space-y-2">
              <li>Utilizar a plataforma em conformidade com a legislação brasileira vigente e com as políticas de uso da Meta (WhatsApp Business API);</li>
              <li>Obter consentimento adequado dos seus clientes antes de enviar mensagens via WhatsApp;</li>
              <li>Não utilizar o WAVON para envio de spam, mensagens não solicitadas ou conteúdo ilegal;</li>
              <li>Manter a integridade dos dados dos seus clientes e respeitá-los como titulares de dados pessoais conforme a LGPD;</li>
              <li>Informar com precisão os dados cadastrais e de cobrança;</li>
              <li>Notificar o WAVON sobre qualquer violação de segurança ou uso indevido que tome conhecimento.</li>
            </ul>
          </section>

          <section id="uso-permitido">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">5. Uso Permitido</h2>
            <p>
              O WAVON é licenciado para uso exclusivo nas atividades de gerenciamento de relacionamento
              com clientes, atendimento via WhatsApp Business, automação de comunicação empresarial legítima,
              agendamento de compromissos e análise de desempenho comercial.
            </p>
          </section>

          <section id="uso-proibido">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">6. Uso Proibido</h2>
            <p>É expressamente vedado:</p>
            <ul className="ml-4 mt-3 list-disc space-y-2">
              <li>Revender, sublicenciar ou redistribuir o WAVON sem autorização prévia e por escrito;</li>
              <li>Utilizar a plataforma para atividades ilícitas, imorais, enganosas ou que violem direitos de terceiros;</li>
              <li>Realizar engenharia reversa, descompilar ou tentar extrair o código-fonte da plataforma;</li>
              <li>Transmitir vírus, malware ou qualquer código malicioso;</li>
              <li>Tentar acessar dados de outras contas ou sistemas internos do WAVON;</li>
              <li>Utilizar bots ou automações para sobrecarregar ou atacar a infraestrutura do serviço;</li>
              <li>Enviar conteúdo que viole as políticas de uso do WhatsApp Business da Meta;</li>
              <li>Usar o WAVON para discriminação, assédio ou perseguição de qualquer pessoa.</li>
            </ul>
            <p className="mt-3">
              O descumprimento destas proibições pode resultar em suspensão ou encerramento imediato da conta,
              sem direito a reembolso.
            </p>
          </section>

          <section id="propriedade-intelectual">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">7. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo, código, design, marcas, logotipos e materiais do WAVON são de propriedade
              exclusiva do WAVON ou de seus licenciantes. A contratação do serviço não transfere qualquer
              direito de propriedade intelectual ao Usuário — apenas uma licença limitada, intransferível
              e não exclusiva para uso da plataforma durante o período contratado.
            </p>
            <p className="mt-3">
              Os dados inseridos pelo Usuário na plataforma (contatos, conversas, negociações) permanecem
              de propriedade do Usuário. O WAVON os trata apenas na medida necessária para a prestação
              do serviço.
            </p>
          </section>

          <section id="disponibilidade">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">8. Disponibilidade do Serviço</h2>
            <p>
              O WAVON busca disponibilidade contínua, mas não garante que o serviço estará isento de
              interrupções. Manutenções programadas serão comunicadas com antecedência quando possível.
              A disponibilidade das funcionalidades de WhatsApp depende também da infraestrutura da Meta,
              sobre a qual o WAVON não tem controle direto.
            </p>
          </section>

          <section id="pagamentos">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">9. Pagamentos</h2>
            <p>
              Os planos e valores vigentes são exibidos na área de cobrança da plataforma. O pagamento
              é processado mensalmente ou anualmente, conforme o plano escolhido, por meio da plataforma
              Asaas. Em caso de inadimplência, o acesso poderá ser suspenso após notificação.
            </p>
            <p className="mt-3">
              Preços podem ser ajustados mediante comunicação prévia de 30 dias por e-mail.
              O uso continuado após a vigência do reajuste implica aceitação dos novos valores.
            </p>
          </section>

          <section id="cancelamento">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">10. Cancelamento</h2>
            <p>
              Você pode cancelar sua conta a qualquer momento nas configurações da plataforma ou via
              e-mail para{" "}
              <a href="mailto:comercial@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                comercial@wavon.com.br
              </a>.
              O cancelamento tem efeito ao final do período já pago. Não há reembolso proporcional
              de períodos já faturados, salvo disposição legal em contrário.
            </p>
            <p className="mt-3">
              Após o cancelamento, seus dados serão mantidos por até 90 dias e então excluídos,
              conforme nossa{" "}
              <Link href="/politica-de-privacidade" className="text-foreground underline underline-offset-4 hover:opacity-80">
                Política de Privacidade
              </Link>.
            </p>
          </section>

          <section id="limitacao">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">11. Limitação de Responsabilidade</h2>
            <p>
              O WAVON não será responsável por danos indiretos, incidentais, especiais ou consequentes
              decorrentes do uso ou da impossibilidade de uso da plataforma, incluindo perda de dados,
              lucros cessantes ou danos à reputação, ainda que advertido de tais possibilidades.
            </p>
            <p className="mt-3">
              A responsabilidade total do WAVON por qualquer reclamação, em qualquer hipótese, fica
              limitada ao valor pago pelo Usuário nos últimos 3 (três) meses anteriores ao evento gerador.
            </p>
            <p className="mt-3">
              O WAVON não controla o conteúdo das conversas, automações ou mensagens enviadas pelos
              Usuários e não se responsabiliza por seu conteúdo ou pelas consequências de seu uso.
            </p>
          </section>

          <section id="suporte">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">12. Suporte</h2>
            <p>
              O suporte técnico é prestado via e-mail{" "}
              <a href="mailto:comercial@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                comercial@wavon.com.br
              </a>{" "}
              em dias úteis (segunda a sexta, horário de Brasília). Respondemos em até 2 dias úteis.
              A documentação completa da plataforma está disponível em{" "}
              <Link href="/docs" className="text-foreground underline underline-offset-4 hover:opacity-80">
                wavon.com.br/docs
              </Link>.
            </p>
          </section>

          <section id="alteracoes">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">13. Alterações dos Termos</h2>
            <p>
              O WAVON pode atualizar estes Termos a qualquer momento. Alterações relevantes serão
              comunicadas por e-mail com antecedência mínima de 15 dias. O uso continuado da plataforma
              após a data de vigência das novas condições constitui aceitação tácita.
            </p>
          </section>

          <section id="legislacao">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">14. Legislação Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pela legislação da República Federativa do Brasil. Fica eleito
              o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias oriundas deste
              instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 flex flex-col gap-2 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row sm:gap-6">
          <Link href="/politica-de-privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
          <Link href="/cookies" className="hover:text-foreground transition-colors">Política de Cookies</Link>
          <Link href="/lgpd" className="hover:text-foreground transition-colors">LGPD</Link>
          <Link href="/exclusao-de-dados" className="hover:text-foreground transition-colors">Exclusão de Dados</Link>
        </div>
      </div>
    </>
  );
}
