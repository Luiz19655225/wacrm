import Link from "next/link";
import { Bot } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProductMockup } from "@/components/marketing/product-mockup";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Brand glow — fixed blue/violet, independent of the accent
          theme, so the landing reads as WAVON even if a visitor's
          browser somehow carries a different saved accent. Tall
          enough to reach the product mockup below the copy, so the
          whole hero (not just the text block) sits inside the glow. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[920px] opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 10%, #2f5fff, transparent 55%), radial-gradient(circle at 80% 25%, #8b5cf6, transparent 55%)",
        }}
      />

      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <div className="rounded-full bg-gradient-to-r from-[#2f5fff]/50 to-[#8b5cf6]/50 p-px">
          <span className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <Bot className="h-3.5 w-3.5 text-primary" />
            IA no primeiro atendimento · WhatsApp Business API oficial
          </span>
        </div>

        <h1 className="font-heading mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
          Seu lead recebe resposta na hora.{" "}
          <span className="bg-gradient-to-r from-[#2f5fff] to-[#8b5cf6] bg-clip-text text-transparent">
            Sua equipe assume na hora certa.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          A WAVON faz o primeiro atendimento com IA, organiza a triagem,
          transfere para o humano no momento certo e mantém todo o histórico
          no seu CRM de WhatsApp.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className={buttonVariants({
              variant: "ghost",
              size: "lg",
              className:
                "bg-gradient-to-r from-[#2f5fff] to-[#8b5cf6] px-6 text-white hover:opacity-90",
            })}
          >
            Começar agora
          </Link>
          <a
            href="#demo"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "px-6",
            })}
          >
            Solicitar demonstração
          </a>
        </div>

        <ProductMockup />
      </div>
    </section>
  );
}
