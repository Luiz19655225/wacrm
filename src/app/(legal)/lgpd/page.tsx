import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "LGPD — Lei Geral de Proteção de Dados",
  description:
    "Entenda como o WAVON aplica a LGPD: seus direitos como titular, bases legais, encarregado de dados, portabilidade e segurança.",
  keywords: [
    "LGPD",
    "Lei Geral de Proteção de Dados",
    "Lei 13.709",
    "direitos do titular",
    "proteção de dados",
    "DPO",
    "encarregado de dados",
    "ANPD",
    "WAVON",
  ],
  alternates: { canonical: "https://www.wavon.com.br/lgpd" },
  openGraph: {
    title: "LGPD — WAVON",
    description:
      "Como o WAVON aplica a Lei Geral de Proteção de Dados Pessoais e seus direitos como titular.",
    url: "https://www.wavon.com.br/lgpd",
    siteName: "WAVON",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "LGPD — WAVON",
    description:
      "Como o WAVON aplica a Lei Geral de Proteção de Dados Pessoais e seus direitos como titular.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "LGPD — WAVON",
  description:
    "Como o WAVON aplica a Lei Geral de Proteção de Dados Pessoais e seus direitos como titular.",
  url: "https://www.wavon.com.br/lgpd",
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
      { "@type": "ListItem", position: 2, name: "LGPD", item: "https://www.wavon.com.br/lgpd" },
    ],
  },
};

export default function LgpdPage() {
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
          <span className="text-foreground">LGPD</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            LGPD — Lei Geral de Proteção de Dados
          </h1>
          <p className="mt-3 text-muted-foreground">
            O WAVON respeita e aplica integralmente a Lei n.º 13.709/2018 — Lei Geral de Proteção de
            Dados Pessoais (LGPD). Esta página explica como seus direitos são garantidos e como
            exercê-los.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Última atualização: 30 de junho de 2026
          </p>
        </header>

        {/* Content */}
        <div className="space-y-10 text-sm leading-7 text-muted-foreground">

          <section id="direitos-titular">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">1. Seus Direitos como Titular</h2>
            <p>
              A LGPD (art. 18) garante os seguintes direitos a você como titular de dados pessoais
              tratados pelo WAVON:
            </p>
            <div className="mt-4 space-y-3">
              {[
                { right: "Confirmação", desc: "Confirmar se o WAVON trata seus dados pessoais." },
                { right: "Acesso", desc: "Obter cópia dos dados que o WAVON mantém sobre você." },
                { right: "Correção", desc: "Solicitar a correção de dados incompletos, inexatos ou desatualizados." },
                { right: "Anonimização, bloqueio ou eliminação", desc: "De dados desnecessários, excessivos ou tratados em desconformidade com a LGPD." },
                { right: "Portabilidade", desc: "Receber seus dados em formato estruturado para transferência a outro fornecedor." },
                { right: "Eliminação", desc: "Solicitar a exclusão dos dados tratados com base no consentimento." },
                { right: "Informação sobre compartilhamento", desc: "Saber com quais entidades públicas e privadas o WAVON compartilha seus dados." },
                { right: "Informação sobre não consentimento", desc: "Ser informado sobre a possibilidade de não fornecer consentimento e as consequências disso." },
                { right: "Revogação do consentimento", desc: "Revogar a qualquer momento o consentimento dado para tratamentos baseados nele." },
                { right: "Petição à ANPD", desc: "Encaminhar reclamação à Autoridade Nacional de Proteção de Dados." },
              ].map((item) => (
                <div key={item.right} className="flex gap-3">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <p>
                    <strong className="text-foreground">{item.right}:</strong> {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="bases-legais">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">2. Bases Legais do Tratamento</h2>
            <p>
              O WAVON trata dados pessoais apenas quando há fundamento legal (LGPD, art. 7.º).
              As bases utilizadas são:
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Execução de contrato (art. 7.º, V)</p>
                <p className="mt-1 text-xs">
                  Principal base: tratamento necessário para fornecer os serviços WAVON contratados
                  (CRM, WhatsApp, Agenda, IA, Analytics).
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Consentimento (art. 7.º, I)</p>
                <p className="mt-1 text-xs">
                  Cookies não essenciais, comunicações de marketing e funcionalidades opcionais que
                  envolvam dados adicionais. Pode ser revogado a qualquer momento.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Legítimo interesse (art. 7.º, IX)</p>
                <p className="mt-1 text-xs">
                  Segurança da plataforma, prevenção a fraudes, melhoria contínua dos serviços —
                  sempre dentro dos limites legítimos e com respeito aos direitos do titular.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Obrigação legal (art. 7.º, II)</p>
                <p className="mt-1 text-xs">
                  Retenção de registros fiscais, cumprimento de determinações judiciais e
                  regulatórias (ex.: Marco Civil da Internet, legislação tributária).
                </p>
              </div>
            </div>
          </section>

          <section id="encarregado">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">3. Encarregado de Dados (DPO)</h2>
            <p>
              O WAVON designou um Encarregado de Proteção de Dados (DPO) responsável por receber
              comunicações dos titulares e da ANPD, além de orientar colaboradores e parceiros sobre
              as práticas de proteção de dados.
            </p>
            <div className="mt-4 rounded-lg border border-border p-5">
              <p className="font-medium text-foreground">Encarregado de Dados — WAVON</p>
              <p className="mt-2 text-xs">
                E-mail:{" "}
                <a href="mailto:contato@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                  contato@wavon.com.br
                </a>
              </p>
              <p className="mt-1 text-xs">Prazo de resposta: até 15 dias úteis.</p>
            </div>
          </section>

          <section id="solicitacoes">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">4. Como Exercer seus Direitos</h2>
            <p>
              Envie sua solicitação para{" "}
              <a href="mailto:contato@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                contato@wavon.com.br
              </a>{" "}
              com as seguintes informações:
            </p>
            <ul className="ml-4 mt-3 list-disc space-y-2">
              <li>Nome completo e e-mail cadastrado;</li>
              <li>Descrição clara do direito que deseja exercer;</li>
              <li>Cópia de documento de identidade com foto para verificação.</li>
            </ul>
            <p className="mt-3">
              Respondemos em até <strong className="text-foreground">15 dias úteis</strong> a partir
              do recebimento da solicitação completa. Em casos complexos, o prazo pode ser prorrogado
              por igual período, com comunicação prévia.
            </p>
            <p className="mt-3">
              Para exclusão de dados, consulte nossa página{" "}
              <Link href="/exclusao-de-dados" className="text-foreground underline underline-offset-4 hover:opacity-80">
                Exclusão de Dados
              </Link>.
            </p>
          </section>

          <section id="portabilidade">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">5. Portabilidade</h2>
            <p>
              Você pode solicitar a portabilidade dos seus dados para outro fornecedor de serviço
              ou produto. Forneceremos os dados em formato estruturado, de uso comum e de leitura
              automatizada (CSV ou JSON), conforme tecnicamente viável.
            </p>
            <p className="mt-3">
              A portabilidade abrange os dados inseridos diretamente por você na plataforma
              (contatos, negociações, configurações). Dados operacionais internos (logs, métricas
              técnicas) não estão incluídos no escopo de portabilidade.
            </p>
          </section>

          <section id="anonimizacao">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">6. Anonimização e Pseudonimização</h2>
            <p>
              O WAVON aplica técnicas de pseudonimização em dados de analytics e logs de uso sempre
              que possível, reduzindo o risco de identificação individual. Dados anonimizados —
              que não permitem mais a identificação do titular — deixam de ser dados pessoais
              para os fins da LGPD.
            </p>
          </section>

          <section id="retencao">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">7. Retenção de Dados</h2>
            <p>Mantemos seus dados apenas pelo tempo necessário:</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left font-medium text-foreground">Tipo de dado</th>
                    <th className="py-2 text-left font-medium text-foreground">Período de retenção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    ["Conta e perfil de usuário", "Vigência do contrato + 90 dias"],
                    ["Conversas e contatos do CRM", "Vigência do contrato + 90 dias"],
                    ["Registros de cobrança e notas fiscais", "5 anos (obrigação legal)"],
                    ["Logs de segurança e acesso", "6 meses"],
                    ["Logs de uso de IA", "12 meses"],
                    ["Dados de analytics pseudonimizados", "24 meses"],
                  ].map(([type, period]) => (
                    <tr key={type}>
                      <td className="py-3 pr-4 text-foreground">{type}</td>
                      <td className="py-3">{period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="seguranca">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">8. Segurança dos Dados</h2>
            <p>
              Implementamos medidas técnicas e organizacionais proporcionais ao risco para proteger
              seus dados pessoais:
            </p>
            <ul className="ml-4 mt-3 list-disc space-y-2">
              <li><strong className="text-foreground">Criptografia em trânsito:</strong> TLS 1.3 em todas as comunicações;</li>
              <li><strong className="text-foreground">Criptografia em repouso:</strong> banco de dados PostgreSQL com criptografia nativa (Supabase);</li>
              <li><strong className="text-foreground">Criptografia de credenciais:</strong> AES-256-GCM para tokens, chaves de API e senhas de integração;</li>
              <li><strong className="text-foreground">Isolamento de dados:</strong> Row Level Security (RLS) garante que cada conta só acessa seus próprios dados;</li>
              <li><strong className="text-foreground">Controle de acesso:</strong> autenticação com senha hash (bcrypt) e tokens JWT com curta validade;</li>
              <li><strong className="text-foreground">Monitoramento:</strong> logs de acesso e alertas de segurança ativos na infraestrutura;</li>
              <li><strong className="text-foreground">Parceiros:</strong> utilizamos apenas provedores que adotam padrões de segurança equivalentes (Supabase, Vercel, Meta, OpenAI).</li>
            </ul>
            <p className="mt-3">
              Em caso de incidente de segurança que possa afetar titulares, o WAVON notificará
              os usuários afetados e a ANPD nos prazos legais.
            </p>
          </section>

          <section id="anpd">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">9. Autoridade Nacional de Proteção de Dados (ANPD)</h2>
            <p>
              Se você considerar que seus direitos não foram atendidos adequadamente pelo WAVON,
              pode registrar reclamação junto à ANPD:
            </p>
            <div className="mt-4 rounded-lg border border-border p-5 text-xs">
              <p className="font-medium text-foreground">Autoridade Nacional de Proteção de Dados — ANPD</p>
              <p className="mt-2">
                Site:{" "}
                <a
                  href="https://www.gov.br/anpd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4 hover:opacity-80"
                >
                  www.gov.br/anpd
                </a>
              </p>
            </div>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 flex flex-col gap-2 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row sm:gap-6">
          <Link href="/politica-de-privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
          <Link href="/termos-de-uso" className="hover:text-foreground transition-colors">Termos de Uso</Link>
          <Link href="/cookies" className="hover:text-foreground transition-colors">Política de Cookies</Link>
          <Link href="/exclusao-de-dados" className="hover:text-foreground transition-colors">Exclusão de Dados</Link>
        </div>
      </div>
    </>
  );
}
