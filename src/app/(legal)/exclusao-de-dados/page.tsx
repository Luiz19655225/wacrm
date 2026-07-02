import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Exclusão de Dados",
  description:
    "Saiba como solicitar a exclusão dos seus dados pessoais no WAVON, os prazos e as exceções legais aplicáveis.",
  keywords: [
    "exclusão de dados",
    "direito ao esquecimento",
    "LGPD",
    "proteção de dados",
    "WAVON",
    "deletar conta",
    "remover dados pessoais",
  ],
  alternates: { canonical: "https://www.wavon.com.br/exclusao-de-dados" },
  openGraph: {
    title: "Exclusão de Dados — WAVON",
    description:
      "Como solicitar a exclusão dos seus dados pessoais no WAVON.",
    url: "https://www.wavon.com.br/exclusao-de-dados",
    siteName: "WAVON",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Exclusão de Dados — WAVON",
    description: "Como solicitar a exclusão dos seus dados pessoais no WAVON.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Exclusão de Dados — WAVON",
  description: "Como solicitar a exclusão dos seus dados pessoais no WAVON.",
  url: "https://www.wavon.com.br/exclusao-de-dados",
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
      { "@type": "ListItem", position: 2, name: "Exclusão de Dados", item: "https://www.wavon.com.br/exclusao-de-dados" },
    ],
  },
};

export default function ExclusaoDeDadosPage() {
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
          <span className="text-foreground">Exclusão de Dados</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Exclusão de Dados
          </h1>
          <p className="mt-3 text-muted-foreground">
            Como titular de dados pessoais, você tem o direito de solicitar a exclusão dos seus dados
            armazenados no WAVON, conforme previsto no art. 18, IV e VI da LGPD (Lei 13.709/2018).
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Última atualização: 30 de junho de 2026
          </p>
        </header>

        {/* Content */}
        <div className="space-y-10 text-sm leading-7 text-muted-foreground">

          <section id="como-solicitar">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">1. Como Solicitar a Exclusão</h2>
            <p>
              Você pode solicitar a exclusão dos seus dados de duas formas:
            </p>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-border p-5">
                <p className="font-medium text-foreground">Opção 1 — Diretamente na plataforma</p>
                <p className="mt-2 text-xs">
                  Usuários com acesso ativo podem excluir a própria conta acessando
                  <strong className="text-foreground"> Configurações → Plano e cobrança → Encerrar conta</strong>.
                  Essa ação inicia o processo automático de exclusão dos dados associados.
                </p>
              </div>

              <div className="rounded-lg border border-border p-5">
                <p className="font-medium text-foreground">Opção 2 — Solicitação por e-mail</p>
                <p className="mt-2 text-xs">
                  Envie um e-mail para{" "}
                  <a href="mailto:suporte@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                    suporte@wavon.com.br
                  </a>{" "}
                  com o assunto <strong className="text-foreground">&ldquo;Solicitação de Exclusão de Dados&rdquo;</strong> e
                  as informações descritas na seção 2 abaixo.
                </p>
              </div>
            </div>
          </section>

          <section id="documentos">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">2. Informações Necessárias</h2>
            <p>Para solicitações via e-mail, inclua as seguintes informações:</p>
            <ul className="ml-4 mt-3 list-disc space-y-2">
              <li>Nome completo cadastrado na conta;</li>
              <li>E-mail utilizado no cadastro;</li>
              <li>Descrição clara da solicitação (exclusão total da conta ou exclusão de dados específicos);</li>
              <li>Cópia de documento de identidade com foto (RG, CNH ou passaporte), para verificação da identidade do titular.</li>
            </ul>
            <p className="mt-3">
              Para solicitações em nome de pessoa jurídica, inclua também documento que comprove
              poderes de representação do signatário.
            </p>
          </section>

          <section id="prazo">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">3. Prazo para Conclusão</h2>
            <p>
              Após a confirmação de identidade e da solicitação, o WAVON realizará a exclusão dos dados
              em até <strong className="text-foreground">15 dias úteis</strong>. Casos mais complexos
              (múltiplas contas, dados compartilhados com terceiros) podem levar até 30 dias corridos,
              com comunicação prévia ao titular.
            </p>
          </section>

          <section id="o-que-sera-excluido">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">4. O que Será Excluído</h2>
            <p>
              Mediante solicitação de exclusão total, o WAVON removerá:
            </p>
            <ul className="ml-4 mt-3 list-disc space-y-2">
              <li>Dados de cadastro (nome, e-mail, empresa, senha);</li>
              <li>Contatos e conversas de WhatsApp armazenados na plataforma;</li>
              <li>Negociações, anotações e histórico do CRM;</li>
              <li>Configurações da conta (automações, modelos, base de conhecimento);</li>
              <li>Tokens e credenciais de integração (WhatsApp, Google Calendar, OpenAI, Outlook);</li>
              <li>Logs de uso de IA e registros de analytics associados à conta;</li>
              <li>Dados dos membros da equipe vinculados exclusivamente à conta excluída.</li>
            </ul>
          </section>

          <section id="excecoes">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">5. Exceções Legais</h2>
            <p>
              Conforme previsto no art. 16 da LGPD, alguns dados poderão ser retidos mesmo após a
              solicitação de exclusão, quando necessário para:
            </p>
            <ul className="ml-4 mt-3 list-disc space-y-2">
              <li><strong className="text-foreground">Cumprimento de obrigação legal ou regulatória</strong> — registros de cobrança e notas fiscais são mantidos por 5 anos conforme legislação tributária brasileira (CTN, art. 174);</li>
              <li><strong className="text-foreground">Exercício regular de direitos em processo judicial, administrativo ou arbitral</strong> — logs necessários para defesa em litígios em andamento;</li>
              <li><strong className="text-foreground">Proteção ao crédito</strong> — registros de inadimplência enquanto houver dívida ativa.</li>
            </ul>
            <p className="mt-3">
              Os dados retidos por obrigação legal são tratados de forma restrita e excluídos assim que
              a obrigação cessar.
            </p>
          </section>

          <section id="confirmacao">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">6. Confirmação</h2>
            <p>
              Ao concluir o processo de exclusão, o WAVON enviará uma confirmação por e-mail ao endereço
              cadastrado informando quais dados foram excluídos e, se aplicável, quais foram retidos com
              base legal específica.
            </p>
            <p className="mt-3">
              Após a exclusão, não será possível recuperar os dados removidos. Recomendamos que exporte
              os dados relevantes antes de formalizar a solicitação.
            </p>
          </section>

          <section id="contato">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">7. Contato</h2>
            <p>
              Para solicitações de exclusão ou dúvidas sobre o processo:
            </p>
            <div className="mt-4 rounded-lg border border-border p-5">
              <p className="font-medium text-foreground">Encarregado de Dados — WAVON</p>
              <p className="mt-2 text-xs">
                E-mail:{" "}
                <a href="mailto:suporte@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                  suporte@wavon.com.br
                </a>
              </p>
              <p className="mt-1 text-xs">Prazo de resposta: até 2 dias úteis para confirmação de recebimento.</p>
            </div>
            <p className="mt-4">
              Caso não obtenha resposta no prazo ou discorde do tratamento dado à solicitação, você pode
              registrar reclamação junto à{" "}
              <strong className="text-foreground">ANPD — Autoridade Nacional de Proteção de Dados</strong>{" "}
              (<a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:opacity-80">
                www.gov.br/anpd
              </a>).
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 flex flex-col gap-2 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row sm:gap-6">
          <Link href="/politica-de-privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
          <Link href="/termos-de-uso" className="hover:text-foreground transition-colors">Termos de Uso</Link>
          <Link href="/lgpd" className="hover:text-foreground transition-colors">LGPD</Link>
          <Link href="/cookies" className="hover:text-foreground transition-colors">Política de Cookies</Link>
        </div>
      </div>
    </>
  );
}
