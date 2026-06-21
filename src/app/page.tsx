import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Hero } from "@/components/marketing/hero";
import { Footer } from "@/components/marketing/footer";
import { Card, CardContent } from "@/components/ui/card";
import {
  GitBranch,
  MessageSquare,
  Radio,
  UsersRound,
  Workflow,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Inbox compartilhada",
    description:
      "Vários atendentes, um único número. Conversas atribuídas, com status e notas internas.",
  },
  {
    icon: UsersRound,
    title: "Contatos e tags",
    description:
      "Histórico completo de cada cliente, com campos personalizados e importação em massa.",
  },
  {
    icon: GitBranch,
    title: "Pipelines de vendas",
    description: "Negócios em formato Kanban, ligados diretamente às conversas.",
  },
  {
    icon: Radio,
    title: "Disparos em massa",
    description:
      "Campanhas com templates aprovados pela Meta e rastreamento de entrega e leitura.",
  },
  {
    icon: Zap,
    title: "Automações",
    description:
      "Gatilhos por mensagem, palavra-chave ou agenda — sem precisar programar.",
  },
  {
    icon: Workflow,
    title: "Fluxos visuais",
    description: "Construa jornadas de atendimento em um editor visual de arrastar e soltar.",
  },
];

const steps = [
  {
    step: "1",
    title: "Conecte seu WhatsApp",
    description: "Vincule seu número via WhatsApp Business API (Meta) em poucos minutos.",
  },
  {
    step: "2",
    title: "Organize sua equipe",
    description: "Convide atendentes, defina papéis e distribua as conversas.",
  },
  {
    step: "3",
    title: "Venda e automatize",
    description: "Acompanhe pipelines, dispare campanhas e deixe automações cuidarem do resto.",
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
              Tudo que sua equipe precisa
            </h2>
            <p className="mt-3 text-muted-foreground">
              Um CRM completo para WhatsApp, sem depender de planilhas ou de
              vários aplicativos.
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

            <div className="mt-12 grid gap-8 sm:grid-cols-3">
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
      </main>
      <Footer />
    </div>
  );
}
