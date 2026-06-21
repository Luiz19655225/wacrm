import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Hero } from "@/components/marketing/hero";
import { Footer } from "@/components/marketing/footer";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  CalendarClock,
  GitBranch,
  ListChecks,
  MessageSquare,
  UsersRound,
  Workflow,
} from "lucide-react";

// Placeholder commercial inbox until a real "request a demo" flow
// (form + CRM webhook) exists. Swap this — and the #demo section
// below — for that flow once it's built; don't wire a fake form in
// the meantime.
const DEMO_CONTACT_EMAIL = "comercial@wavon.com.br";

const features = [
  {
    icon: MessageSquare,
    title: "IA no primeiro atendimento",
    description:
      "Toda conversa começa com IA — disponível 24h, em anúncios, site e WhatsApp.",
  },
  {
    icon: ListChecks,
    title: "Qualificação automática de leads",
    description:
      "A IA entende a necessidade do cliente antes de qualquer humano entrar na conversa.",
  },
  {
    icon: UsersRound,
    title: "Transferência para humano (9h–18h)",
    description:
      "No horário comercial, a conversa qualificada é passada direto para o seu time.",
  },
  {
    icon: CalendarClock,
    title: "Agendamento fora do horário",
    description:
      "Fora do expediente, o sistema orienta o cliente e agenda o retorno automaticamente.",
  },
  {
    icon: GitBranch,
    title: "Negociações e histórico no CRM",
    description:
      "Contatos, conversas e negociações organizados num só lugar, com histórico completo de cada cliente.",
  },
  {
    icon: Workflow,
    title: "Follow-up automatizado",
    description: "Lembretes e retomadas automáticas para nenhuma negociação esfriar.",
  },
];

const steps = [
  {
    step: "1",
    title: "O lead chega",
    description: "De anúncios, do site ou direto pelo WhatsApp — tudo cai no mesmo número.",
  },
  {
    step: "2",
    title: "IA atende e qualifica",
    description:
      "Responde, entende a necessidade e organiza as informações antes de qualquer humano entrar.",
  },
  {
    step: "3",
    title: "Conversa é direcionada",
    description:
      "No horário comercial (9h–18h) um humano assume. Fora do horário, a IA orienta e agenda o retorno.",
  },
  {
    step: "4",
    title: "Tudo fica registrado",
    description:
      "Histórico, contatos, negociações e follow-up automático, sempre disponíveis pro seu time.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />
      <main className="flex-1">
        <Hero />

        <section id="recursos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
              Da primeira mensagem ao fechamento
            </h2>
            <p className="mt-3 text-muted-foreground">
              IA, time humano e CRM trabalhando juntos — do anúncio ao contrato.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardContent className="flex flex-col gap-3 pt-6">
                  <div className="bg-wavon-gradient flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="border-t border-border bg-card-2">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                Como funciona
              </h2>
            </div>

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(({ step, title, description }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div className="bg-wavon-gradient flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white">
                    {step}
                  </div>
                  <h3 className="font-heading mt-4 font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="border-t border-border">
          <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
              Quer ver a WAVON funcionando no seu negócio?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Conte um pouco sobre o seu fluxo de atendimento e o time
              comercial entra em contato para agendar uma demonstração.
            </p>
            <a
              href={`mailto:${DEMO_CONTACT_EMAIL}?subject=${encodeURIComponent("Quero uma demonstração da WAVON")}`}
              className={buttonVariants({
                variant: "default",
                size: "lg",
                className: "mt-8 px-6",
              })}
            >
              Solicitar demonstração
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
