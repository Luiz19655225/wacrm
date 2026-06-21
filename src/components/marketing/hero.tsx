import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { GitBranch, MessageSquare, Radio, Zap } from "lucide-react";

const previewItems = [
  { icon: MessageSquare, label: "Inbox compartilhada" },
  { icon: GitBranch, label: "Pipelines de vendas" },
  { icon: Radio, label: "Disparos em massa" },
  { icon: Zap, label: "Automações" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Brand glow — fixed blue/violet, independent of the accent
          theme, so the landing reads as WAVON even if a visitor's
          browser somehow carries a different saved accent. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, #2f5fff, transparent 55%), radial-gradient(circle at 80% 25%, #8b5cf6, transparent 55%)",
        }}
      />

      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          WhatsApp Business API oficial
        </span>

        <h1 className="font-heading mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
          Todo o seu WhatsApp,{" "}
          <span className="bg-gradient-to-r from-[#2f5fff] to-[#8b5cf6] bg-clip-text text-transparent">
            em uma única tela
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          A WAVON reúne inbox compartilhada, contatos, pipelines de vendas e
          automações em um CRM feito para equipes que vivem no WhatsApp.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className: "px-6",
            })}
          >
            Começar agora
          </Link>
          <Link
            href="/login"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "px-6",
            })}
          >
            Entrar
          </Link>
        </div>

        <div className="mt-16 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {previewItems.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-5"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
