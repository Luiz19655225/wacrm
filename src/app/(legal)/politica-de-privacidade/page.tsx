import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Entenda como o WAVON coleta, utiliza, armazena e protege seus dados pessoais, em conformidade com a LGPD (Lei 13.709/2018).",
  keywords: [
    "política de privacidade",
    "LGPD",
    "proteção de dados",
    "privacidade",
    "WAVON",
    "CRM WhatsApp",
    "dados pessoais",
    "Lei 13.709",
  ],
  alternates: { canonical: "https://www.wavon.com.br/politica-de-privacidade" },
  openGraph: {
    title: "Política de Privacidade — WAVON",
    description:
      "Como o WAVON coleta, utiliza e protege seus dados pessoais, em conformidade com a LGPD.",
    url: "https://www.wavon.com.br/politica-de-privacidade",
    siteName: "WAVON",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Política de Privacidade — WAVON",
    description:
      "Como o WAVON coleta, utiliza e protege seus dados pessoais, em conformidade com a LGPD.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Política de Privacidade — WAVON",
  description:
    "Como o WAVON coleta, utiliza e protege seus dados pessoais, em conformidade com a LGPD.",
  url: "https://www.wavon.com.br/politica-de-privacidade",
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
      {
        "@type": "ListItem",
        position: 2,
        name: "Política de Privacidade",
        item: "https://www.wavon.com.br/politica-de-privacidade",
      },
    ],
  },
};

export default function PoliticaDePrivacidadePage() {
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
          <span className="text-foreground">Política de Privacidade</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Política de Privacidade
          </h1>
          <p className="mt-3 text-muted-foreground">
            Esta Política descreve como o WAVON trata seus dados pessoais, em conformidade com a
            Lei Geral de Proteção de Dados Pessoais — LGPD (Lei n.º 13.709/2018).
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Última atualização: 30 de junho de 2026
          </p>
        </header>

        {/* Content */}
        <div className="space-y-10 text-sm leading-7 text-muted-foreground">

          <section id="introducao">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">1. Introdução</h2>
            <p>
              O <strong className="text-foreground">WAVON</strong> é uma plataforma de CRM omnichannel para
              WhatsApp, desenvolvida e operada no Brasil. Ao utilizar nossos serviços, você confia a nós seus
              dados pessoais. Esta Política explica de forma clara quais dados coletamos, por que coletamos,
              como utilizamos, com quem compartilhamos e quais são seus direitos como titular.
            </p>
            <p className="mt-3">
              O WAVON atua como <strong className="text-foreground">Controlador</strong> dos dados pessoais
              de usuários da plataforma e como <strong className="text-foreground">Operador</strong> dos dados
              dos clientes finais gerenciados por nossos assinantes.
            </p>
          </section>

          <section id="dados-coletados">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">2. Dados Coletados</h2>

            <h3 className="mb-2 font-medium text-foreground">2.1 Dados de cadastro</h3>
            <p>
              Para criar e manter sua conta: nome completo, endereço de e-mail, nome da empresa e senha
              (armazenada com hash seguro). Esses dados são indispensáveis para a prestação do serviço.
            </p>

            <h3 className="mb-2 mt-5 font-medium text-foreground">2.2 Dados de uso da plataforma</h3>
            <p>
              Registramos ações realizadas na plataforma, como criação de contatos, negociações, automações
              e configurações de equipe, para garantir o funcionamento correto e permitir auditoria interna.
            </p>

            <h3 className="mb-2 mt-5 font-medium text-foreground">2.3 Dados de WhatsApp</h3>
            <p>
              Quando você conecta sua conta do WhatsApp Business, coletamos: número de telefone (Phone Number ID),
              ID da conta WABA, token de acesso (armazenado criptografado com AES-256-GCM) e o conteúdo
              das conversas trocadas pelo canal. Mensagens de voz, imagens e documentos são armazenados
              apenas como referência de entrega.
            </p>

            <h3 className="mb-2 mt-5 font-medium text-foreground">2.4 Dados do Google Calendar e Outlook</h3>
            <p>
              Quando você autoriza a integração com Google Calendar ou Microsoft Outlook, coletamos eventos,
              disponibilidade e informações de participantes estritamente necessárias para o funcionamento
              do módulo de Agenda. As credenciais OAuth são armazenadas de forma criptografada e podem
              ser revogadas a qualquer momento nas configurações da plataforma ou no painel do provedor.
            </p>

            <h3 className="mb-2 mt-5 font-medium text-foreground">2.5 Dados de Inteligência Artificial</h3>
            <p>
              O WAVON utiliza a API da OpenAI para funcionalidades assistivas (sugestão de respostas,
              resumo de conversas, classificação de leads e WAVI Copilot). O conteúdo das conversas
              pode ser enviado à OpenAI para processamento. A chave de API OpenAI de cada conta é armazenada
              de forma criptografada. Registros de uso de IA (tipo de funcionalidade, tokens consumidos)
              são mantidos para controle interno.
            </p>

            <h3 className="mb-2 mt-5 font-medium text-foreground">2.6 Dados de Analytics</h3>
            <p>
              Coletamos dados agregados de uso da plataforma (páginas visitadas, funcionalidades utilizadas,
              tempo de sessão) para melhorar a experiência e identificar oportunidades de melhoria.
              Esses dados são pseudonimizados sempre que possível.
            </p>

            <h3 className="mb-2 mt-5 font-medium text-foreground">2.7 Dados de Cobrança</h3>
            <p>
              O processamento de pagamentos é realizado pela <strong className="text-foreground">Asaas</strong>,
              nossa plataforma de billing. Não armazenamos dados de cartão de crédito diretamente. Mantemos
              registros de transações, planos contratados e histórico de cobranças para fins fiscais e
              de suporte.
            </p>

            <h3 className="mb-2 mt-5 font-medium text-foreground">2.8 Dados técnicos</h3>
            <p>
              Endereço IP, tipo e versão de navegador, sistema operacional, identificadores de sessão e
              logs de acesso, coletados automaticamente para segurança, diagnóstico de problemas e
              cumprimento de obrigações legais.
            </p>
          </section>

          <section id="finalidade">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">3. Finalidade do Tratamento</h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>Prestação dos serviços contratados (execução contratual);</li>
              <li>Comunicação com o usuário sobre a conta, cobranças e atualizações;</li>
              <li>Funcionalidades de IA e assistência automatizada;</li>
              <li>Melhoria contínua da plataforma e análise de desempenho;</li>
              <li>Prevenção a fraudes, abusos e violações de segurança;</li>
              <li>Cumprimento de obrigações legais e regulatórias;</li>
              <li>Exercício regular de direitos em processos judiciais ou administrativos.</li>
            </ul>
          </section>

          <section id="bases-legais">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">4. Bases Legais (LGPD, art. 7.º)</h2>
            <div className="space-y-3">
              <p><strong className="text-foreground">Execução de contrato</strong> — tratamento necessário para
              a prestação dos serviços WAVON (art. 7.º, V).</p>
              <p><strong className="text-foreground">Legítimo interesse</strong> — analytics agregado, segurança
              e prevenção de fraudes, dentro dos limites razoáveis esperados pelo titular (art. 7.º, IX).</p>
              <p><strong className="text-foreground">Consentimento</strong> — envio de comunicações de marketing
              e uso de cookies não essenciais (art. 7.º, I). Você pode revogar o consentimento a qualquer momento.</p>
              <p><strong className="text-foreground">Obrigação legal</strong> — retenção de registros fiscais
              e cumprimento de determinações judiciais ou regulatórias (art. 7.º, II).</p>
            </div>
          </section>

          <section id="cookies">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">5. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para autenticação e preferências de interface, além de cookies
              analíticos para entender o uso da plataforma. Consulte nossa{" "}
              <Link href="/cookies" className="text-foreground underline underline-offset-4 hover:opacity-80">
                Política de Cookies
              </Link>{" "}
              para detalhes completos sobre tipos, finalidades e como gerenciá-los.
            </p>
          </section>

          <section id="armazenamento-seguranca">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">6. Armazenamento e Segurança</h2>
            <p>
              Os dados são armazenados em banco de dados PostgreSQL gerenciado pela{" "}
              <strong className="text-foreground">Supabase</strong>, com instância hospedada na região
              de São Paulo (Brasil), com criptografia em repouso e em trânsito (TLS 1.3).
            </p>
            <p className="mt-3">
              Tokens e credenciais sensíveis (WhatsApp, OAuth, OpenAI) são armazenados
              com criptografia simétrica AES-256-GCM. Senhas de usuários utilizam hash seguro com salt.
              O acesso aos dados de produção é restrito por Row Level Security (RLS) no banco de dados,
              garantindo isolamento entre contas.
            </p>
            <p className="mt-3">
              A plataforma é hospedada na{" "}
              <strong className="text-foreground">Vercel</strong> (CDN e funções serverless) com
              certificados SSL/TLS válidos e atualizados automaticamente.
            </p>
          </section>

          <section id="compartilhamento">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">7. Compartilhamento com Terceiros</h2>
            <p>Compartilhamos dados apenas com os seguintes fornecedores e nas finalidades indicadas:</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Supabase</p>
                <p className="mt-1 text-xs">Armazenamento do banco de dados. Dados na região de São Paulo, BR.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Vercel</p>
                <p className="mt-1 text-xs">Hospedagem e CDN. Servidores nos EUA com transferência internacional amparada pelas salvaguardas aplicáveis.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Meta (WhatsApp Cloud API)</p>
                <p className="mt-1 text-xs">Entrega e recebimento de mensagens WhatsApp Business. Sujeito à Política de Dados da Meta.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">OpenAI</p>
                <p className="mt-1 text-xs">Processamento de linguagem natural para funcionalidades de IA. Sujeito à Política de Uso da OpenAI.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Google / Microsoft</p>
                <p className="mt-1 text-xs">Sincronização de calendário (Google Calendar e Microsoft Outlook). Acesso restrito ao escopo autorizado pelo usuário.</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Asaas</p>
                <p className="mt-1 text-xs">Processamento de pagamentos e gestão de cobranças. Empresa brasileira, sujeita à LGPD.</p>
              </div>
            </div>
            <p className="mt-4">
              Não vendemos, alugamos ou comercializamos seus dados pessoais com terceiros para fins de marketing.
            </p>
          </section>

          <section id="retencao">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">8. Retenção de Dados</h2>
            <ul className="ml-4 list-disc space-y-2">
              <li><strong className="text-foreground">Dados de conta ativa:</strong> mantidos durante toda a vigência do contrato;</li>
              <li><strong className="text-foreground">Após cancelamento:</strong> excluídos em até 90 dias, salvo obrigação legal;</li>
              <li><strong className="text-foreground">Registros fiscais e de cobrança:</strong> 5 anos, conforme legislação tributária brasileira;</li>
              <li><strong className="text-foreground">Logs de segurança:</strong> 6 meses;</li>
              <li><strong className="text-foreground">Logs de IA:</strong> 12 meses para controle de uso.</li>
            </ul>
          </section>

          <section id="direitos">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">9. Direitos do Titular</h2>
            <p>
              Em conformidade com a LGPD (art. 18), você tem direito a:
            </p>
            <ul className="ml-4 mt-3 list-disc space-y-2">
              <li><strong className="text-foreground">Confirmação</strong> — saber se tratamos seus dados;</li>
              <li><strong className="text-foreground">Acesso</strong> — obter cópia dos seus dados;</li>
              <li><strong className="text-foreground">Correção</strong> — corrigir dados incompletos ou desatualizados;</li>
              <li><strong className="text-foreground">Anonimização, bloqueio ou eliminação</strong> — de dados desnecessários ou tratados em desconformidade;</li>
              <li><strong className="text-foreground">Portabilidade</strong> — receber seus dados em formato estruturado;</li>
              <li><strong className="text-foreground">Eliminação</strong> — solicitar a exclusão dos dados (veja{" "}
                <Link href="/exclusao-de-dados" className="text-foreground underline underline-offset-4 hover:opacity-80">
                  Exclusão de Dados
                </Link>);</li>
              <li><strong className="text-foreground">Informação</strong> — saber com quem compartilhamos seus dados;</li>
              <li><strong className="text-foreground">Revogação do consentimento</strong> — retirar consentimentos dados anteriormente.</li>
            </ul>
            <p className="mt-3">
              Para exercer esses direitos, entre em contato pelo e-mail{" "}
              <a href="mailto:lgpd@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                lgpd@wavon.com.br
              </a>.
              Respondemos em até 15 dias úteis.
            </p>
          </section>

          <section id="contato-lgpd">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">10. Encarregado de Dados (DPO)</h2>
            <p>
              Nosso Encarregado de Proteção de Dados pode ser contatado pelo e-mail{" "}
              <a href="mailto:lgpd@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                lgpd@wavon.com.br
              </a>.
              Para dúvidas gerais sobre privacidade ou para exercer seus direitos, utilize o mesmo canal.
            </p>
          </section>

          <section id="atualizacoes">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">11. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política periodicamente. Alterações substanciais serão comunicadas
              por e-mail ou por notificação na plataforma com pelo menos 15 dias de antecedência.
              O uso continuado do WAVON após a vigência das alterações implica aceitação da nova versão.
            </p>
            <p className="mt-3">
              Versões anteriores desta Política estão disponíveis mediante solicitação a{" "}
              <a href="mailto:lgpd@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                lgpd@wavon.com.br
              </a>.
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 flex flex-col gap-2 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row sm:gap-6">
          <Link href="/termos-de-uso" className="hover:text-foreground transition-colors">Termos de Uso</Link>
          <Link href="/cookies" className="hover:text-foreground transition-colors">Política de Cookies</Link>
          <Link href="/lgpd" className="hover:text-foreground transition-colors">LGPD</Link>
          <Link href="/exclusao-de-dados" className="hover:text-foreground transition-colors">Exclusão de Dados</Link>
        </div>
      </div>
    </>
  );
}
