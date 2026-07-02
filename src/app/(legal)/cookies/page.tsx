import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description:
    "Entenda como o WAVON utiliza cookies e tecnologias similares, os tipos de cookies, suas finalidades e como gerenciá-los.",
  keywords: [
    "política de cookies",
    "cookies",
    "rastreamento",
    "LGPD",
    "privacidade",
    "WAVON",
    "analytics",
    "consentimento",
  ],
  alternates: { canonical: "https://www.wavon.com.br/cookies" },
  openGraph: {
    title: "Política de Cookies — WAVON",
    description: "Como o WAVON utiliza cookies e como você pode gerenciá-los.",
    url: "https://www.wavon.com.br/cookies",
    siteName: "WAVON",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Política de Cookies — WAVON",
    description: "Como o WAVON utiliza cookies e como você pode gerenciá-los.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Política de Cookies — WAVON",
  description: "Como o WAVON utiliza cookies e como você pode gerenciá-los.",
  url: "https://www.wavon.com.br/cookies",
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
      { "@type": "ListItem", position: 2, name: "Política de Cookies", item: "https://www.wavon.com.br/cookies" },
    ],
  },
};

interface CookieEntry {
  name: string;
  purpose: string;
  type: string;
  duration: string;
}

const ESSENTIAL_COOKIES: CookieEntry[] = [
  { name: "sb-*-auth-token", purpose: "Autenticação de sessão do usuário na plataforma", type: "Essencial", duration: "Sessão / 7 dias" },
  { name: "wavon-theme", purpose: "Preferência de tema visual (escuro/claro) e cor de destaque", type: "Preferência", duration: "1 ano" },
  { name: "wavon-mode", purpose: "Preferência de modo de exibição", type: "Preferência", duration: "1 ano" },
];

const ANALYTICS_COOKIES: CookieEntry[] = [
  { name: "_ga, _ga_*", purpose: "Google Analytics — identificação de sessão e coleta de métricas de uso", type: "Analytics", duration: "2 anos" },
  { name: "_fbp", purpose: "Facebook/Meta Pixel — rastreamento de conversões e remarketing", type: "Marketing", duration: "3 meses" },
];

export default function CookiesPage() {
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
          <span className="text-foreground">Política de Cookies</span>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Política de Cookies
          </h1>
          <p className="mt-3 text-muted-foreground">
            Esta política explica o que são cookies, quais utilizamos, por que os utilizamos
            e como você pode controlá-los, em conformidade com a LGPD.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Última atualização: 30 de junho de 2026
          </p>
        </header>

        {/* Content */}
        <div className="space-y-10 text-sm leading-7 text-muted-foreground">

          <section id="o-que-sao">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">1. O que são Cookies</h2>
            <p>
              Cookies são pequenos arquivos de texto armazenados no seu navegador quando você acessa
              um site. Eles permitem que a plataforma reconheça sua sessão, lembre suas preferências e
              colete informações sobre como você utiliza o serviço.
            </p>
            <p className="mt-3">
              Além de cookies, o WAVON pode usar tecnologias similares como{" "}
              <strong className="text-foreground">localStorage</strong> e{" "}
              <strong className="text-foreground">sessionStorage</strong> do navegador para salvar
              preferências de tema e modo de exibição sem depender de cookies.
            </p>
          </section>

          <section id="cookies-essenciais">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">2. Cookies Essenciais e de Preferência</h2>
            <p>
              São estritamente necessários para o funcionamento da plataforma. Sem eles, funcionalidades
              básicas como login e preferências de interface não funcionam. Por serem indispensáveis,
              não requerem consentimento separado (LGPD, art. 7.º, V — execução contratual).
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left font-medium text-foreground">Cookie</th>
                    <th className="py-2 pr-4 text-left font-medium text-foreground">Finalidade</th>
                    <th className="py-2 pr-4 text-left font-medium text-foreground">Tipo</th>
                    <th className="py-2 text-left font-medium text-foreground">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {ESSENTIAL_COOKIES.map((c) => (
                    <tr key={c.name} className="border-b border-border/50">
                      <td className="py-3 pr-4 font-mono text-foreground">{c.name}</td>
                      <td className="py-3 pr-4">{c.purpose}</td>
                      <td className="py-3 pr-4">{c.type}</td>
                      <td className="py-3">{c.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="cookies-autenticacao">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">3. Cookies de Autenticação</h2>
            <p>
              Os cookies de autenticação (<code className="rounded bg-muted px-1 font-mono text-xs text-foreground">sb-*-auth-token</code>) são
              gerados pelo Supabase, nosso provedor de banco de dados, ao realizar o login. Eles identificam
              sua sessão de forma segura com token JWT e são invalidados automaticamente no logout ou
              após o período de validade.
            </p>
          </section>

          <section id="cookies-analytics">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">4. Cookies de Analytics e Marketing</h2>
            <p>
              Utilizamos cookies de analytics para entender como a plataforma é utilizada e para medir
              a efetividade das nossas campanhas. Esses cookies requerem seu consentimento.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left font-medium text-foreground">Cookie</th>
                    <th className="py-2 pr-4 text-left font-medium text-foreground">Finalidade</th>
                    <th className="py-2 pr-4 text-left font-medium text-foreground">Tipo</th>
                    <th className="py-2 text-left font-medium text-foreground">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {ANALYTICS_COOKIES.map((c) => (
                    <tr key={c.name} className="border-b border-border/50">
                      <td className="py-3 pr-4 font-mono text-foreground">{c.name}</td>
                      <td className="py-3 pr-4">{c.purpose}</td>
                      <td className="py-3 pr-4">{c.type}</td>
                      <td className="py-3">{c.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="meta-pixel">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">5. Meta Pixel (Facebook SDK)</h2>
            <p>
              O WAVON pode utilizar o SDK do Facebook (Meta) para funcionalidades de integração com o
              WhatsApp Business (Embedded Signup). Quando carregado, o SDK pode definir cookies de sessão
              da Meta no seu navegador.
            </p>
            <p className="mt-3">
              O SDK do Facebook é carregado sob demanda apenas quando você clica em
              <strong className="text-foreground"> &ldquo;Conectar via Meta&rdquo;</strong> nas configurações do
              WhatsApp. Não é carregado automaticamente ao acessar a plataforma.
            </p>
            <p className="mt-3">
              Para mais informações sobre como a Meta utiliza esses dados, consulte a{" "}
              <a
                href="https://www.facebook.com/privacy/policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 hover:opacity-80"
              >
                Política de Dados da Meta
              </a>.
            </p>
          </section>

          <section id="google-analytics">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">6. Google Analytics</h2>
            <p>
              Quando aplicável, utilizamos o Google Analytics para análise de tráfego e comportamento
              agregado de usuários. Os dados coletados são pseudonimizados e não identificam pessoalmente
              nenhum usuário.
            </p>
            <p className="mt-3">
              Você pode optar por não ser rastreado pelo Google Analytics instalando o{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 hover:opacity-80"
              >
                complemento de desativação do Google Analytics
              </a>{" "}
              no seu navegador.
            </p>
          </section>

          <section id="gerenciamento">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">7. Como Gerenciar os Cookies</h2>
            <p>
              Você pode controlar e excluir cookies diretamente nas configurações do seu navegador.
              Os principais navegadores oferecem opções para bloquear cookies de terceiros, apagar
              cookies existentes ou ser notificado antes de aceitar novos cookies.
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <p>
                <strong className="text-foreground">Chrome:</strong> Configurações → Privacidade e segurança → Cookies e outros dados do site
              </p>
              <p>
                <strong className="text-foreground">Firefox:</strong> Preferências → Privacidade e Segurança → Cookies e dados do site
              </p>
              <p>
                <strong className="text-foreground">Safari:</strong> Preferências → Privacidade → Gerenciar dados do site
              </p>
              <p>
                <strong className="text-foreground">Edge:</strong> Configurações → Cookies e permissões do site
              </p>
            </div>
            <p className="mt-3">
              Observe que bloquear cookies essenciais pode impedir o funcionamento correto do login
              e das preferências de interface do WAVON.
            </p>
          </section>

          <section id="consentimento-lgpd">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">8. Consentimento e LGPD</h2>
            <p>
              Cookies essenciais e de preferência são utilizados com base na execução contratual
              (LGPD, art. 7.º, V). Cookies de analytics e marketing são utilizados com base no
              consentimento do titular (LGPD, art. 7.º, I), que pode ser revogado a qualquer momento.
            </p>
            <p className="mt-3">
              Para revogar seu consentimento ao uso de cookies de analytics ou exercer qualquer outro
              direito relacionado a dados, entre em contato com{" "}
              <a href="mailto:suporte@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                suporte@wavon.com.br
              </a>.
            </p>
          </section>

          <section id="contato">
            <h2 className="font-heading mb-3 text-lg font-semibold text-foreground">9. Contato</h2>
            <p>
              Dúvidas sobre nossa política de cookies:{" "}
              <a href="mailto:suporte@wavon.com.br" className="text-foreground underline underline-offset-4 hover:opacity-80">
                suporte@wavon.com.br
              </a>.
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 flex flex-col gap-2 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row sm:gap-6">
          <Link href="/politica-de-privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
          <Link href="/termos-de-uso" className="hover:text-foreground transition-colors">Termos de Uso</Link>
          <Link href="/lgpd" className="hover:text-foreground transition-colors">LGPD</Link>
          <Link href="/exclusao-de-dados" className="hover:text-foreground transition-colors">Exclusão de Dados</Link>
        </div>
      </div>
    </>
  );
}
